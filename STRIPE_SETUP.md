# Afterhours Stripe Sandbox setup

The Store UI is already in the site, but real checkout is intentionally server-side.
Do **not** put a Stripe secret key or Supabase service-role key in `app.js`.

## 1. Supabase
Run `afterhours_upgrade.sql` in the Supabase SQL Editor.

## 2. Stripe Sandbox
Create two one-time Prices:

- Afterhours VIP — $6 USD — one-time
- Afterhours VIP+ — $6 USD — one-time

Copy their `price_...` IDs.

## 3. Server environment variables
Use the values from `.env.example` on the server running `server.js`.
Use the **Stripe Sandbox/Test** secret key (`sk_test_...`).

## 4. Webhook
Create a Stripe webhook endpoint pointing to:

`https://YOUR-AFTERHOURS-SERVER/api/stripe-webhook`

Subscribe to `checkout.session.completed` and copy the signing secret (`whsec_...`) into `STRIPE_WEBHOOK_SECRET`.

## 5. What happens after a successful test purchase

Stripe confirms the checkout → webhook verifies it → the user's rank is updated in Supabase → a special purchase announcement is inserted into General.

The browser renders that announcement with a gold outline and a clickable `@username`.

The current Store uses one-time purchases for both VIP and VIP+.
