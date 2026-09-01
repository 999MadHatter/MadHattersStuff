// ============================================================
// AFTERHOURS - Fixed Version
// ============================================================

const SUPABASE_URL = "https://rkynnabggnpqpxzwlbwr.supabase.co";
const SUPABASE_KEY = "sb_publishable_kb_dDY7fXA0yTkyQyoBwYw_1lkqf6GF";

// Safely create Supabase client (won't crash the whole app if it fails)
let supabaseClient = null;
try {
    if (window.supabase && typeof window.supabase.createClient === "function") {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    } else {
        console.warn("Supabase library not loaded");
    }
} catch (err) {
    console.error("Supabase client error:", err);
}

// Current user
let currentUser = {
    id: null,
    username: "",
    displayName: "",
    bio: "",
    role: "Member"
};

// Helper
function get(id) {
    return document.getElementById(id);
}

// =========================
// PAGE SWITCHING
// =========================
function hideAllPages() {
    ["landingPage", "loginPage", "registerPage", "chatPage"].forEach(function (id) {
        const el = get(id);
        if (el) el.classList.add("hidden");
    });
}

function showLanding() {
    hideAllPages();
    const page = get("landingPage");
    if (page) page.classList.remove("hidden");
}

function showLogin() {
    hideAllPages();
    const page = get("loginPage");
    if (page) page.classList.remove("hidden");
    setTimeout(function () {
        const input = get("loginEmail");
        if (input) input.focus();
    }, 50);
}

function showRegister() {
    hideAllPages();
    const page = get("registerPage");
    if (page) page.classList.remove("hidden");
    setTimeout(function () {
        const input = get("registerUsername");
        if (input) input.focus();
    }, 50);
}

function showChat() {
    hideAllPages();
    const page = get("chatPage");
    if (page) page.classList.remove("hidden");
    updateUser();
    updateOnlineUsers();
}

// =========================
// AUTH
// =========================
async function login() {
    if (!supabaseClient) {
        alert("Login is currently unavailable. Please try again later.");
        return;
    }

    const email = get("loginEmail").value.trim();
    const password = get("loginPassword").value;

    if (!email) {
        alert("Please enter your email.");
        return;
    }
    if (!password) {
        alert("Please enter your password.");
        return;
    }

    const button = get("loginSubmit");
    button.disabled = true;
    button.textContent = "Logging in...";

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            console.error(error);
            alert(error.message);
            return;
        }

        const user = data.user;
        if (!user) {
            alert("Login failed.");
            return;
        }

        if (!user.email_confirmed_at) {
            await supabaseClient.auth.signOut();
            alert("Please verify your email before logging in.");
            return;
        }

        const { data: profile, error: profileError } = await supabaseClient
            .from("profiles")
            .select("id, username, display_name, bio, role")
            .eq("id", user.id)
            .single();

        if (profileError || !profile) {
            console.error(profileError);
            alert("Your account exists, but your profile could not be loaded.");
            return;
        }

        currentUser = {
            id: profile.id,
            username: profile.username,
            displayName: profile.display_name,
            bio: profile.bio || "No bio yet.",
            role: profile.role || "Member"
        };

        updateUser();
        showChat();
    } catch (err) {
        console.error(err);
        alert("Something went wrong during login.");
    } finally {
        button.disabled = false;
        button.textContent = "Log In";
    }
}

async function register() {
    if (!supabaseClient) {
        alert("Registration is currently unavailable. Please try again later.");
        return;
    }

    const username = get("registerUsername").value.trim();
    const email = get("registerEmail").value.trim();
    const password = get("registerPassword").value;

    if (!username) {
        alert("Please choose a username.");
        return;
    }
    if (username.length < 3) {
        alert("Username must be at least 3 characters.");
        return;
    }
    if (!email) {
        alert("Please enter your email.");
        return;
    }
    if (!email.includes("@")) {
        alert("Please enter a valid email.");
        return;
    }
    if (!password) {
        alert("Please choose a password.");
        return;
    }
    if (password.length < 8) {
        alert("Password must be at least 8 characters.");
        return;
    }

    const button = get("registerSubmit");
    button.disabled = true;
    button.textContent = "Creating account...";

    try {
        // Check username availability
        const { data: existing, error: checkError } = await supabaseClient
            .from("profiles")
            .select("id")
            .eq("username", username)
            .maybeSingle();

        if (checkError) {
            console.error(checkError);
            alert("Unable to check username availability.");
            return;
        }
        if (existing) {
            alert("That username is already taken.");
            return;
        }

        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    username: username,
                    display_name: username
                }
            }
        });

        if (error) {
            console.error(error);
            alert(error.message);
            return;
        }

        if (!data.user) {
            alert("Account creation failed.");
            return;
        }

        alert("Account created! Check your email and verify your account before logging in.");
        get("registerUsername").value = "";
        get("registerEmail").value = "";
        get("registerPassword").value = "";
        showLogin();
    } catch (err) {
        console.error(err);
        alert("Something went wrong during registration.");
    } finally {
        button.disabled = false;
        button.textContent = "Create Account";
    }
}

async function logout() {
    if (supabaseClient) {
        await supabaseClient.auth.signOut();
    }
    currentUser = {
        id: null,
        username: "",
        displayName: "",
        bio: "",
        role: "Member"
    };
    showLanding();
}

// =========================
// USER UI
// =========================
function updateUser() {
    const name = currentUser.displayName || currentUser.username || "User";

    if (get("topUsername")) get("topUsername").textContent = name;
    if (get("profileName")) get("profileName").textContent = name;
    if (get("profileBio")) get("profileBio").textContent = currentUser.bio || "No bio yet.";
    if (get("profileAvatar")) get("profileAvatar").textContent = name.charAt(0).toUpperCase();
    if (get("sidebarAvatar")) get("sidebarAvatar").textContent = name.charAt(0).toUpperCase();
}

function updateOnlineUsers() {
    const container = get("onlineUsers");
    if (!container) return;

    container.innerHTML = "";

    const user = document.createElement("div");
    user.className = "online-user";

    const dot = document.createElement("span");
    dot.className = "status-dot";

    const name = document.createElement("span");
    name.textContent = currentUser.displayName || currentUser.username || "User";

    user.appendChild(dot);
    user.appendChild(name);
    container.appendChild(user);
}

// =========================
// PROFILE
// =========================
function openProfile() {
    const modal = get("profileModal");
    if (modal) modal.classList.remove("hidden");
}

function closeProfile() {
    const modal = get("profileModal");
    if (modal) modal.classList.add("hidden");
}

function openEditProfile() {
    get("editName").value = currentUser.displayName || "";
    get("editBio").value = (currentUser.bio === "No bio yet.") ? "" : (currentUser.bio || "");
    closeProfile();
    const modal = get("editProfileModal");
    if (modal) modal.classList.remove("hidden");
}

function closeEditProfile() {
    const modal = get("editProfileModal");
    if (modal) modal.classList.add("hidden");
}

async function saveProfile() {
    if (!supabaseClient) {
        alert("Unable to save profile right now.");
        return;
    }

    const displayName = get("editName").value.trim();
    const bio = get("editBio").value.trim();

    if (!displayName) {
        alert("Display name cannot be empty.");
        return;
    }
    if (!currentUser.id) {
        alert("You aren't logged in.");
        return;
    }

    const { error } = await supabaseClient
        .from("profiles")
        .update({
            display_name: displayName,
            bio: bio
        })
        .eq("id", currentUser.id);

    if (error) {
        console.error(error);
        alert("Unable to save profile.");
        return;
    }

    currentUser.displayName = displayName;
    currentUser.bio = bio || "No bio yet.";
    updateUser();
    updateOnlineUsers();
    closeEditProfile();
    alert("Profile saved!");
}

// =========================
// MESSAGES
// =========================
function sendMessage() {
    const input = get("messageInput");
    const messages = get("messages");
    const text = input.value.trim();
    if (!text) return;

    const welcome = messages.querySelector(".welcome-message");
    if (welcome) welcome.remove();

    const name = currentUser.displayName || currentUser.username || "User";

    const message = document.createElement("div");
    message.className = "message";

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = name.charAt(0).toUpperCase();

    const content = document.createElement("div");

    const username = document.createElement("strong");
    username.textContent = name;

    const role = document.createElement("span");
    role.className = "role";
    role.textContent = currentUser.role;

    const textElement = document.createElement("p");
    textElement.textContent = text;

    content.appendChild(username);
    content.appendChild(role);
    content.appendChild(textElement);

    message.appendChild(avatar);
    message.appendChild(content);
    messages.appendChild(message);

    input.value = "";
    messages.scrollTop = messages.scrollHeight;
}

// =========================
// ROOMS
// =========================
const rooms = {
    general: {
        title: "💬 General",
        description: "Talk. Connect. Chill."
    },
    gaming: {
        title: "🎮 Gaming",
        description: "Talk about games."
    },
    music: {
        title: "🎵 Music",
        description: "Share music and discover new stuff."
    }
};

function changeRoom(roomName, button) {
    const room = rooms[roomName];
    if (!room) return;

    document.querySelectorAll(".room").forEach(function (btn) {
        btn.classList.remove("active");
    });

    if (button) button.classList.add("active");

    get("roomTitle").textContent = room.title;
    get("roomDescription").textContent = room.description;
    get("messageInput").placeholder = "Message " + room.title.substring(2) + "...";

    get("messages").innerHTML = `
        <div class="welcome-message">
            <div class="welcome-icon">${room.title.substring(0, 2)}</div>
            <h3>Welcome to ${room.title.substring(2)}</h3>
            <p>Send the first message.</p>
        </div>
    `;
}

// =========================
// SETUP BUTTONS (this always runs)
// =========================
function setupButtons() {
    // Landing buttons
    get("loginButton").addEventListener("click", showLogin);
    get("registerButton").addEventListener("click", showRegister);

    // Login page
    get("backFromLogin").addEventListener("click", showLanding);
    get("loginToRegister").addEventListener("click", showRegister);
    get("loginForm").addEventListener("submit", function (e) {
        e.preventDefault();
        login();
    });

    // Register page
    get("backFromRegister").addEventListener("click", showLanding);
    get("registerToLogin").addEventListener("click", showLogin);
    get("registerForm").addEventListener("submit", function (e) {
        e.preventDefault();
        register();
    });

    // Chat
    get("logoutButton").addEventListener("click", logout);
    get("profileButton").addEventListener("click", openProfile);
    get("closeProfileButton").addEventListener("click", closeProfile);
    get("editProfileButton").addEventListener("click", openEditProfile);
    get("closeEditProfileButton").addEventListener("click", closeEditProfile);
    get("saveProfileButton").addEventListener("click", saveProfile);

    // Messages
    get("messageForm").addEventListener("submit", function (e) {
        e.preventDefault();
        sendMessage();
    });

    // Rooms
    document.querySelectorAll(".room").forEach(function (button) {
        button.addEventListener("click", function () {
            changeRoom(button.dataset.room, button);
        });
    });
}

// =========================
// SESSION
// =========================
async function checkSession() {
    if (!supabaseClient) {
        showLanding();
        return;
    }

    try {
        const { data, error } = await supabaseClient.auth.getSession();

        if (error || !data.session) {
            showLanding();
            return;
        }

        const user = data.session.user;

        if (!user.email_confirmed_at) {
            await supabaseClient.auth.signOut();
            showLanding();
            return;
        }

        const { data: profile, error: profileError } = await supabaseClient
            .from("profiles")
            .select("id, username, display_name, bio, role")
            .eq("id", user.id)
            .single();

        if (profileError || !profile) {
            await supabaseClient.auth.signOut();
            showLanding();
            return;
        }

        currentUser = {
            id: profile.id,
            username: profile.username,
            displayName: profile.display_name,
            bio: profile.bio || "No bio yet.",
            role: profile.role || "Member"
        };

        showChat();
    } catch (err) {
        console.error("Session check failed:", err);
        showLanding();
    }
}

// =========================
// START THE APP
// =========================
setupButtons();   // Attach all button listeners FIRST
checkSession();   // Then check if user is already logged in
