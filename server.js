const express = require("express");
const http = require("http");
const path = require("path");

const app = express();
const server = http.createServer(app);

// Stripe is optional until the sandbox credentials are configured.
let stripe = null;
try {
    if (process.env.STRIPE_SECRET_KEY) {
        stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
    }
} catch (err) {
    console.warn("Stripe package is unavailable. Run npm install first.");
}

let supabaseAdmin = null;
try {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        supabaseAdmin = require("@supabase/supabase-js").createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );
    }
} catch (err) {
    console.warn("Supabase server package is unavailable. Run npm install first.");
}

// Stripe webhook needs the raw request body for signature verification.
app.post("/api/stripe-webhook", express.raw({ type: "application/json" }), async (req, res) => {
    if (!stripe || !supabaseAdmin || !process.env.STRIPE_WEBHOOK_SECRET) {
        return res.status(503).json({ error: "Stripe webhook is not configured." });
    }

    let event;
    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            req.headers["stripe-signature"],
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error("Stripe webhook signature failed:", err.message);
        return res.status(400).send("Webhook signature verification failed.");
    }

    if (event.type !== "checkout.session.completed") {
        return res.json({ received: true });
    }

    const session = event.data.object;
    const userId = session.metadata?.user_id;
    const product = session.metadata?.product;

    if (!userId || !["vip", "vip_plus"].includes(product)) {
        return res.status(400).json({ error: "Missing purchase metadata." });
    }

    // Webhooks can be delivered more than once. Ignore an event we've already handled.
    const { data: existingEvent } = await supabaseAdmin
        .from("afterhours_stripe_events")
        .select("event_id")
        .eq("event_id", event.id)
        .maybeSingle();

    if (existingEvent) return res.json({ received: true, duplicate: true });

    const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id,username,display_name,role")
        .eq("id", userId)
        .maybeSingle();

    if (profileError || !profile) {
        console.error("Stripe purchase profile lookup failed:", profileError);
        return res.status(500).json({ error: "User profile not found." });
    }

    // Paid ranks should never silently replace staff ranks.
    const staffRanks = new Set(["Owner", "Developer", "Admin", "Moderator", "Helper"]);
    const newRole = product === "vip_plus" ? "VIP+" : "VIP";
    if (!staffRanks.has(profile.role)) {
        const { error } = await supabaseAdmin
            .from("profiles")
            .update({ role: newRole })
            .eq("id", userId);
        if (error) {
            console.error("Unable to grant purchased rank:", error);
            return res.status(500).json({ error: "Unable to grant rank." });
        }
    }

    const purchaseContent = "__afterhours_purchase__:" + JSON.stringify({
        username: profile.username || "user",
        product: newRole
    });

    const { error: messageError } = await supabaseAdmin
        .from("messages")
        .insert({
            user_id: userId,
            room: "general",
            content: purchaseContent
        });

    if (messageError) {
        console.error("Unable to create purchase announcement:", messageError);
        // Rank was still granted; don't retry a paid event forever because chat announcement failed.
    }

    await supabaseAdmin.from("afterhours_stripe_events").insert({
        event_id: event.id,
        user_id: userId,
        product,
        created_at: new Date().toISOString()
    });

    return res.json({ received: true });
});

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/api/create-checkout-session", async (req, res) => {
    if (!stripe || !supabaseAdmin) {
        return res.status(503).json({ error: "Stripe sandbox is not configured on this server yet." });
    }

    const authHeader = req.headers.authorization || "";
    const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!accessToken) return res.status(401).json({ error: "Authentication required." });

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
    if (authError || !authData?.user) return res.status(401).json({ error: "Invalid session." });

    const product = req.body?.product;
    const priceId = product === "vip"
        ? process.env.STRIPE_VIP_PRICE_ID
        : product === "vip_plus"
            ? process.env.STRIPE_VIP_PLUS_PRICE_ID
            : null;

    if (!priceId) return res.status(503).json({ error: "This Store product has not been connected to a Stripe Price ID yet." });

    const baseUrl = process.env.AFTERHOURS_PUBLIC_URL || `${req.protocol}://${req.get("host")}`;

    try {
        const session = await stripe.checkout.sessions.create({
            mode: "payment",
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${baseUrl}/?purchase=success&product=${encodeURIComponent(product)}`,
            cancel_url: `${baseUrl}/?purchase=cancelled`,
            client_reference_id: authData.user.id,
            metadata: {
                user_id: authData.user.id,
                product
            }
        });

        return res.json({ url: session.url });
    } catch (err) {
        console.error("Stripe checkout creation failed:", err);
        return res.status(500).json({ error: "Unable to create Stripe checkout." });
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Afterhours running on port ${PORT}`);
});
