// ============================================================
// AFTERHOURS - Fixed Version + Profile Pictures
// ============================================================

const SUPABASE_URL = "https://rkynnabggnpqpxzwlbwr.supabase.co";
const SUPABASE_KEY = "sb_publishable_kb_dDY7fXA0yTkyQyoBwYw_1lkqf6GF";

// Safely create Supabase client
let supabaseClient = null;

try {
    if (
        window.supabase &&
        typeof window.supabase.createClient === "function"
    ) {
        supabaseClient = window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_KEY
        );
    } else {
        console.warn("Supabase library not loaded");
    }
} catch (err) {
    console.error("Supabase client error:", err);
}


// ============================================================
// CURRENT USER
// ============================================================

let currentUser = {
    id: null,
    username: "",
    displayName: "",
    bio: "",
    avatarUrl: "",
    role: "Member"
};

const rankDefinitions = {
    Owner: {
        icon: "👑",
        className: "rank-owner",
        permissions: [
            "promote_users",
            "demote_users",
            "set_ranks",
            "create_rooms",
            "delete_rooms",
            "edit_any_room",
            "manage_room_permissions",
            "manage_staff",
            "ban_users",
            "unban_users",
            "mute_users",
            "unmute_users",
            "delete_any_message",
            "handle_serious_reports",
            "manage_site_settings"
        ]
    },
    Developer: {
        icon: "🛠️",
        className: "rank-developer",
        permissions: ["manage_site_settings"]
    },
    Admin: {
        icon: "🔴",
        className: "rank-admin",
        permissions: [
            "manage_staff",
            "create_rooms",
            "delete_rooms",
            "edit_any_room",
            "manage_room_permissions",
            "ban_users",
            "unban_users",
            "mute_users",
            "unmute_users",
            "delete_any_message",
            "handle_serious_reports"
        ]
    },
    Moderator: {
        icon: "🔵",
        className: "rank-moderator",
        permissions: [
            "delete_messages",
            "mute_users",
            "temporary_ban_users",
            "handle_reports",
            "manage_conversations",
            "manage_rooms"
        ]
    },
    Helper: {
        icon: "🟢",
        className: "rank-helper",
        permissions: ["help_users", "answer_questions", "report_problems"]
    },
    VIP: {
        icon: "⭐",
        className: "rank-vip",
        permissions: ["vip_badge", "vip_name_color", "premium_profile_perks", "create_premium_rooms"]
    },
    OG: {
        icon: "🌟",
        className: "rank-og",
        permissions: ["og_badge", "og_name_color", "early_member_perks"]
    },
    Member: {
        icon: "⚪",
        className: "rank-member",
        permissions: [
            "chat",
            "manage_own_profile",
            "upload_profile_picture",
            "join_rooms",
            "send_messages"
        ]
    }
};


// ============================================================
// HELPER
// ============================================================

function get(id) {
    return document.getElementById(id);
}


function getRankDefinition(role) {
    return rankDefinitions[role] || rankDefinitions.Member;
}


function normalizeIdentity(value) {
    return (value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}


function getEffectiveRole(profile, authUser) {
    const metadata = authUser && authUser.user_metadata || {};
    const identities = [
        profile && profile.username,
        profile && profile.display_name,
        metadata.username,
        metadata.display_name
    ];

    if (identities.some(function (identity) {
        return normalizeIdentity(identity) === "madhatter";
    })) {
        return "Owner";
    }

    return (profile && profile.role) || "Member";
}


function hasPermission(permission) {
    if (getEffectiveRole(currentUser) === "Owner") {
        return true;
    }

    return getRankDefinition(currentUser.role).permissions.includes(permission);
}


function applyRank(element, role) {
    if (!element) {
        return;
    }

    const rank = getRankDefinition(role);
    element.className = element.className
        .split(" ")
        .filter(function (className) {
            return !className.startsWith("rank-");
        })
        .concat(rank.className)
        .join(" ");
    element.textContent = rank.icon + " " + (role || "Member");
}


// ============================================================
// PAGE SWITCHING
// ============================================================

function hideAllPages() {
    [
        "landingPage",
        "loginPage",
        "registerPage",
        "chatPage"
    ].forEach(function (id) {

        const el = get(id);

        if (el) {
            el.classList.add("hidden");
        }

    });
}


function showLanding() {
    hideAllPages();

    const page = get("landingPage");

    if (page) {
        page.classList.remove("hidden");
    }
}


function showLogin() {
    hideAllPages();

    const page = get("loginPage");

    if (page) {
        page.classList.remove("hidden");
    }

    setTimeout(function () {

        const input = get("loginEmail");

        if (input) {
            input.focus();
        }

    }, 50);
}


function showRegister() {
    hideAllPages();

    const page = get("registerPage");

    if (page) {
        page.classList.remove("hidden");
    }

    setTimeout(function () {

        const input = get("registerUsername");

        if (input) {
            input.focus();
        }

    }, 50);
}


function showChat() {
    hideAllPages();

    const page = get("chatPage");

    if (page) {
        page.classList.remove("hidden");
    }

    updateUser();
    updateOnlineUsers();
    loadMessages();
}


// ============================================================
// AUTH
// ============================================================

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

        const { data, error } =
            await supabaseClient.auth.signInWithPassword({
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

            alert(
                "Please verify your email before logging in."
            );

            return;
        }

        const {
            data: profile,
            error: profileError
        } = await supabaseClient
            .from("profiles")
            .select(
                "id, username, display_name, bio, avatar_url, role"
            )
            .eq("id", user.id)
            .single();

        if (profileError || !profile) {

            console.error(profileError);

            alert(
                "Your account exists, but your profile could not be loaded."
            );

            return;
        }

        currentUser = {
            id: profile.id,
            username: profile.username,
            displayName: profile.display_name,
            bio: profile.bio || "No bio yet.",
            avatarUrl: profile.avatar_url || "",
            role: getEffectiveRole(profile, user)
        };

        if (!currentUser.avatarUrl) {
            currentUser.avatarUrl = localStorage.getItem(
                "afterhours-avatar-" + currentUser.id
            ) || "";
        }

        updateUser();

        showChat();

    } catch (err) {

        console.error(err);

        alert(
            "Something went wrong during login."
        );

    } finally {

        button.disabled = false;
        button.textContent = "Log In";

    }
}


async function register() {

    if (!supabaseClient) {
        alert(
            "Registration is currently unavailable. Please try again later."
        );
        return;
    }

    const username =
        get("registerUsername").value.trim();

    const email =
        get("registerEmail").value.trim();

    const password =
        get("registerPassword").value;


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

        const {
            data: existing,
            error: checkError
        } = await supabaseClient
            .from("profiles")
            .select("id")
            .eq("username", username)
            .maybeSingle();


        if (checkError) {

            console.error(checkError);

            alert(
                "Unable to check username availability."
            );

            return;
        }


        if (existing) {

            alert(
                "That username is already taken."
            );

            return;
        }


        const {
            data,
            error
        } = await supabaseClient.auth.signUp({

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

            alert(
                "Account creation failed."
            );

            return;
        }


        alert(
            "Account created! Check your email and verify your account before logging in."
        );


        get("registerUsername").value = "";
        get("registerEmail").value = "";
        get("registerPassword").value = "";

        showLogin();


    } catch (err) {

        console.error(err);

        alert(
            "Something went wrong during registration."
        );

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
        avatarUrl: "",
        role: "Member"
    };

    showLanding();
}


// ============================================================
// AVATARS
// ============================================================

function updateAvatar(element, name, avatarUrl) {

    if (!element) {
        return;
    }

    element.innerHTML = "";

    if (avatarUrl) {

        const image = document.createElement("img");

        image.src = avatarUrl;
        image.alt = name + "'s profile picture";

        image.onerror = function () {

            element.innerHTML = "";

            element.textContent =
                name.charAt(0).toUpperCase();

        };

        element.appendChild(image);

        return;
    }

    element.textContent =
        name.charAt(0).toUpperCase();
}


function saveLocalAvatar(file, status) {
    return new Promise(function (resolve, reject) {
        const reader = new FileReader();

        reader.addEventListener("load", function () {
            const avatarUrl = reader.result;

            try {
                localStorage.setItem(
                    "afterhours-avatar-" + currentUser.id,
                    avatarUrl
                );
            } catch (error) {
                reject(error);
                return;
            }

            currentUser.avatarUrl = avatarUrl;
            updateUser();
            updateAvatar(
                get("editAvatarPreview"),
                currentUser.displayName || currentUser.username || "User",
                avatarUrl
            );

            if (status) {
                status.textContent = "Saved on this device.";
            }

            resolve();
        });

        reader.addEventListener("error", reject);
        reader.readAsDataURL(file);
    });
}


// ============================================================
// USER UI
// ============================================================

function updateUser() {

    const name =
        currentUser.displayName ||
        currentUser.username ||
        "User";


    if (get("topUsername")) {
        get("topUsername").textContent = name;
    }


    if (get("profileName")) {
        get("profileName").textContent = name;
    }

    if (get("profileUsername")) {
        get("profileUsername").textContent = "@" + (currentUser.username || "user");
    }

    if (get("profileRole")) {
        applyRank(get("profileRole"), currentUser.role);
    }


    if (get("profileBio")) {
        get("profileBio").textContent =
            currentUser.bio || "No bio yet.";
    }


    updateAvatar(
        get("profileAvatar"),
        name,
        currentUser.avatarUrl
    );


    updateAvatar(
        get("sidebarAvatar"),
        name,
        currentUser.avatarUrl
    );
}


function updateOnlineUsers() {

    const container =
        get("onlineUsers");

    if (!container) {
        return;
    }

    container.innerHTML = "";


    const user =
        document.createElement("div");

    user.className = "online-user";
    user.tabIndex = 0;
    user.setAttribute("role", "button");
    user.addEventListener("click", openProfile);
    user.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openProfile();
        }
    });


    const dot =
        document.createElement("span");

    dot.className = "status-dot";


    const avatar =
        document.createElement("span");

    avatar.className = "avatar";


    updateAvatar(
        avatar,
        currentUser.displayName ||
            currentUser.username ||
            "User",
        currentUser.avatarUrl
    );


    const name =
        document.createElement("span");

    name.textContent =
        currentUser.displayName ||
        currentUser.username ||
        "User";


    user.appendChild(dot);
    user.appendChild(avatar);
    user.appendChild(name);

    container.appendChild(user);
}


// ============================================================
// PROFILE
// ============================================================

function openProfile() {

    openUserProfile(currentUser);
}


function openUserProfile(user) {

    const modal =
        get("profileModal");

    const name =
        user.displayName ||
        user.username ||
        "User";

    if (modal) {
        get("profileName").textContent = name;
        get("profileUsername").textContent = "@" + (user.username || "user");
        applyRank(get("profileRole"), user.role);
        get("profileBio").textContent = user.bio || "No bio yet.";
        updateAvatar(get("profileAvatar"), name, user.avatarUrl);
        get("editProfileButton").classList.toggle(
            "hidden",
            user !== currentUser
        );
        modal.classList.remove("hidden");
    }
}


function closeProfile() {

    const modal =
        get("profileModal");

    if (modal) {
        modal.classList.add("hidden");
    }
}


function openEditProfile() {

    get("editUsername").value =
        currentUser.username || "";

    get("editName").value =
        currentUser.displayName || "";


    get("editBio").value =
        currentUser.bio === "No bio yet."
            ? ""
            : (currentUser.bio || "");


    updateAvatar(
        get("editAvatarPreview"),
        currentUser.displayName ||
            currentUser.username ||
            "User",
        currentUser.avatarUrl
    );


    const status =
        get("avatarUploadStatus");

    if (status) {

        status.textContent =
            "JPG, PNG, or WebP · Max 2 MB";
    }


    closeProfile();


    const modal =
        get("editProfileModal");

    if (modal) {
        modal.classList.remove("hidden");
    }
}


function closeEditProfile() {

    const modal =
        get("editProfileModal");

    if (modal) {
        modal.classList.add("hidden");
    }
}


// ============================================================
// PROFILE PICTURE UPLOAD
// ============================================================

async function uploadProfilePicture(file) {

    if (!supabaseClient) {

        alert(
            "Profile pictures are currently unavailable."
        );

        return;
    }


    if (!currentUser.id) {

        alert(
            "You aren't logged in."
        );

        return;
    }


    if (!file) {
        return;
    }


    const allowedTypes = [
        "image/png",
        "image/jpeg",
        "image/webp"
    ];


    if (!allowedTypes.includes(file.type)) {

        alert(
            "Please choose a PNG, JPG, or WebP image."
        );

        return;
    }


    const maxSize =
        2 * 1024 * 1024;


    if (file.size > maxSize) {

        alert(
            "Your profile picture must be 2 MB or smaller."
        );

        return;
    }


    const status =
        get("avatarUploadStatus");


    if (status) {
        status.textContent =
            "Uploading picture...";
    }


    try {

        const extension =
            file.type === "image/png"
                ? "png"
                : file.type === "image/webp"
                    ? "webp"
                    : "jpg";


        const filePath =
            currentUser.id +
            "/avatar-" +
            Date.now() +
            "." +
            extension;


        const {
            error: uploadError
        } = await supabaseClient.storage
            .from("avatars")
            .upload(
                filePath,
                file,
                {
                    contentType: file.type,
                    cacheControl: "3600",
                    upsert: false
                }
            );


        if (uploadError) {

            console.error(uploadError);

            await saveLocalAvatar(file, status);

            return;
        }


        const {
            data: publicData
        } = supabaseClient.storage
            .from("avatars")
            .getPublicUrl(filePath);


        const avatarUrl =
            publicData.publicUrl;


        const {
            error: profileError
        } = await supabaseClient
            .from("profiles")
            .update({
                avatar_url: avatarUrl
            })
            .eq("id", currentUser.id);


        if (profileError) {

            console.error(profileError);

            await saveLocalAvatar(file, status);

            return;
        }


        currentUser.avatarUrl =
            avatarUrl;


        updateUser();


        updateAvatar(
            get("editAvatarPreview"),
            currentUser.displayName ||
                currentUser.username ||
                "User",
            currentUser.avatarUrl
        );


        if (status) {

            status.textContent =
                "Profile picture updated!";
        }


        // Allow selecting the same file again later
        const input =
            get("avatarFile");

        if (input) {
            input.value = "";
        }


    } catch (err) {

        console.error(err);

        alert(
            "Something went wrong while uploading your picture."
        );

        if (status) {
            status.textContent =
                "Upload failed.";
        }
    }
}


// ============================================================
// SAVE PROFILE
// ============================================================

async function saveProfile() {

    if (!supabaseClient) {

        alert(
            "Unable to save profile right now."
        );

        return;
    }


    const displayName =
        get("editName").value.trim();


    const bio =
        get("editBio").value.trim();


    if (!displayName) {

        alert(
            "Display name cannot be empty."
        );

        return;
    }


    if (!currentUser.id) {

        alert(
            "You aren't logged in."
        );

        return;
    }


    const {
        error
    } = await supabaseClient
        .from("profiles")
        .update({

            display_name:
                displayName,

            bio:
                bio

        })
        .eq(
            "id",
            currentUser.id
        );


    if (error) {

        console.error(error);

        alert(
            "Unable to save profile."
        );

        return;
    }


    currentUser.displayName =
        displayName;


    currentUser.bio =
        bio || "No bio yet.";


    updateUser();

    updateOnlineUsers();

    closeEditProfile();


    alert(
        "Profile saved!"
    );
}


// ============================================================
// MESSAGES
// ============================================================

let currentRoom = "general";
let messageLoadVersion = 0;

function formatMessageTime(timestamp) {
    if (!timestamp) {
        return "";
    }
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short"
    }).format(new Date(timestamp));
}

function showMessageStatus(text) {
    const messages = get("messages");
    messages.innerHTML = "";
    const status = document.createElement("p");
    status.className = "message-status";
    status.textContent = text;
    messages.appendChild(status);
}

function renderMessage(message, profile) {
    const messages = get("messages");
    const user = profile || {};
    const usernameValue = user.username || "user";
    const displayName = user.display_name || usernameValue;
    const name = displayName;
    const role = getEffectiveRole(user);
    const avatarUrl = user.avatar_url || "";
    const messageElement = document.createElement("article");
    messageElement.className = "message";

    const avatar = document.createElement("div");
    avatar.className = "avatar clickable-profile";
    avatar.tabIndex = 0;
    avatar.setAttribute("role", "button");
    avatar.setAttribute("aria-label", "Open " + name + " profile");
    updateAvatar(avatar, name, avatarUrl);

    const content = document.createElement("div");
    content.className = "message-content";
    const header = document.createElement("div");
    header.className = "message-header";

    const displayNameElement = document.createElement("strong");
    displayNameElement.className = "message-display-name";
    displayNameElement.textContent = displayName;

    const username = document.createElement("button");
    username.type = "button";
    username.className = "message-username";
    username.textContent = "@" + usernameValue;

    const roleElement = document.createElement("span");
    roleElement.className = "role";
    applyRank(roleElement, role);

    const timestamp = document.createElement("time");
    timestamp.className = "message-timestamp";
    timestamp.dateTime = message.created_at || "";
    timestamp.textContent = formatMessageTime(message.created_at);

    const textElement = document.createElement("p");
    textElement.textContent = message.content;
    header.appendChild(displayNameElement);
    header.appendChild(username);
    header.appendChild(roleElement);
    header.appendChild(timestamp);
    content.appendChild(header);
    content.appendChild(textElement);
    messageElement.appendChild(avatar);
    messageElement.appendChild(content);
    messages.appendChild(messageElement);

    const openProfile = function () {
        openUserProfile({
            id: user.id || message.user_id,
            username: usernameValue,
            displayName: displayName,
            bio: user.bio || "No bio yet.",
            role: role,
            avatarUrl: avatarUrl
        });
    };
    avatar.addEventListener("click", openProfile);
    username.addEventListener("click", openProfile);
    avatar.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openProfile();
        }
    });
}

async function loadMessages() {
    const loadVersion = ++messageLoadVersion;
    if (!supabaseClient || !currentUser.id) {
        showMessageStatus("Messages are unavailable right now.");
        return;
    }
    showMessageStatus("Loading messages...");

    const { data: messages, error } = await supabaseClient
        .from("messages")
        .select("id, user_id, room, content, created_at")
        .eq("room", currentRoom)
        .order("created_at", { ascending: true });

    if (loadVersion !== messageLoadVersion) {
        return;
    }
    if (error) {
        console.error(error);
        showMessageStatus("Unable to load messages.");
        return;
    }

    const userIds = [...new Set((messages || []).map(function (message) {
        return message.user_id;
    }).filter(Boolean))];
    let profiles = [];
    if (userIds.length) {
        const { data, error: profileError } = await supabaseClient
            .from("profiles")
            .select("id, username, display_name, bio, avatar_url, role")
            .in("id", userIds);
        if (profileError) {
            console.error(profileError);
        } else {
            profiles = data || [];
        }
    }

    if (loadVersion !== messageLoadVersion) {
        return;
    }
    const profilesById = new Map(profiles.map(function (profile) {
        return [profile.id, profile];
    }));
    const container = get("messages");
    container.innerHTML = "";

    if (!messages || !messages.length) {
        container.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon">${rooms[currentRoom].title.substring(0, 2)}</div>
                <h3>Welcome to ${rooms[currentRoom].title.substring(2)}</h3>
                <p>Send the first message.</p>
            </div>
        `;
        return;
    }
    messages.forEach(function (message) {
        renderMessage(message, profilesById.get(message.user_id));
    });
    container.scrollTop = container.scrollHeight;
}

async function sendMessage() {
    const input = get("messageInput");
    const messages = get("messages");
    const text = input.value.trim();

    if (!text || !supabaseClient || !currentUser.id) {
        return;
    }

    const button = get("messageForm").querySelector("button");
    button.disabled = true;

    const { data: message, error } = await supabaseClient
        .from("messages")
        .insert({
            user_id: currentUser.id,
            room: currentRoom,
            content: text
        })
        .select("id, user_id, room, content, created_at")
        .single();

    button.disabled = false;

    if (error) {
        console.error(error);
        alert("Unable to send your message.");
        return;
    }

    input.value = "";
    renderMessage(message, {
        id: currentUser.id,
        username: currentUser.username,
        display_name: currentUser.displayName,
        bio: currentUser.bio,
        avatar_url: currentUser.avatarUrl,
        role: currentUser.role
    });
    messages.scrollTop = messages.scrollHeight;
}


// ============================================================
// ROOMS
// ============================================================

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


function changeRoom(
    roomName,
    button
) {

    const room =
        rooms[roomName];


    if (!room) {
        return;
    }

    currentRoom = roomName;


    document
        .querySelectorAll(".room")
        .forEach(function (btn) {

            btn.classList.remove(
                "active"
            );

        });


    if (button) {
        button.classList.add(
            "active"
        );
    }


    get("roomTitle").textContent =
        room.title;


    get("roomDescription").textContent =
        room.description;


    get("messageInput").placeholder =
        "Message " +
        room.title.substring(2) +
        "...";


    loadMessages();
}


// ============================================================
// SETUP BUTTONS
// ============================================================

function setupButtons() {

    // Landing
    get("loginButton")
        .addEventListener(
            "click",
            showLogin
        );


    get("registerButton")
        .addEventListener(
            "click",
            showRegister
        );


    // Login
    get("backFromLogin")
        .addEventListener(
            "click",
            showLanding
        );


    get("loginToRegister")
        .addEventListener(
            "click",
            showRegister
        );


    get("loginForm")
        .addEventListener(
            "submit",
            function (e) {

                e.preventDefault();

                login();

            }
        );


    // Register
    get("backFromRegister")
        .addEventListener(
            "click",
            showLanding
        );


    get("registerToLogin")
        .addEventListener(
            "click",
            showLogin
        );


    get("registerForm")
        .addEventListener(
            "submit",
            function (e) {

                e.preventDefault();

                register();

            }
        );


    // Chat
    get("logoutButton")
        .addEventListener(
            "click",
            logout
        );


    get("profileButton")
        .addEventListener(
            "click",
            openProfile
        );


    get("closeProfileButton")
        .addEventListener(
            "click",
            closeProfile
        );


    get("editProfileButton")
        .addEventListener(
            "click",
            openEditProfile
        );


    get("closeEditProfileButton")
        .addEventListener(
            "click",
            closeEditProfile
        );


    get("saveProfileButton")
        .addEventListener(
            "click",
            saveProfile
        );


    // Profile picture picker
    get("avatarFile")
        .addEventListener(
            "change",
            function (event) {

                const file =
                    event.target.files[0];

                if (file) {
                    uploadProfilePicture(file);
                }

            }
        );


    // Messages
    get("messageForm")
        .addEventListener(
            "submit",
            function (e) {

                e.preventDefault();

                sendMessage();

            }
        );


    // Rooms
    document
        .querySelectorAll(".room")
        .forEach(function (button) {

            button.addEventListener(
                "click",
                function () {

                    changeRoom(
                        button.dataset.room,
                        button
                    );

                }
            );

        });
}


// ============================================================
// SESSION
// ============================================================

async function checkSession() {

    if (!supabaseClient) {

        showLanding();

        return;
    }


    try {

        const {
            data,
            error
        } = await supabaseClient.auth.getSession();


        if (
            error ||
            !data.session
        ) {

            showLanding();

            return;
        }


        const user =
            data.session.user;


        if (!user.email_confirmed_at) {

            await supabaseClient.auth.signOut();

            showLanding();

            return;
        }


        const {
            data: profile,
            error: profileError
        } = await supabaseClient
            .from("profiles")
            .select(
                "id, username, display_name, bio, avatar_url, role"
            )
            .eq(
                "id",
                user.id
            )
            .single();


        if (
            profileError ||
            !profile
        ) {

            console.error(
                profileError
            );

            await supabaseClient.auth.signOut();

            showLanding();

            return;
        }


        currentUser = {
            id: profile.id,
            username: profile.username,
            displayName: profile.display_name,
            bio: profile.bio || "No bio yet.",
            avatarUrl: profile.avatar_url || "",
            role: getEffectiveRole(profile, user)
        };


        showChat();


    } catch (err) {

        console.error(
            "Session check failed:",
            err
        );

        showLanding();
    }
}


// ============================================================
// START
// ============================================================

setupButtons();
checkSession();
