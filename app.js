// ============================================================
// hii lol
// ============================================================

const SUPABASE_URL = "https://rkynnabggnpqpxzwlbwr.supabase.co";
const SUPABASE_KEY = "sb_publishable_kb_dDY7fXA0yTkyQyoBwYw_1lkqf6GF";
const OWNER_USER_ID = "e3b8dd5d-56cf-447e-95e6-4506a1c818ce";

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
    role: "Member",
    muted: false,
    restricted: false
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
            "kick_users",
            "warn_users",
            "restrict_users",
            "delete_any_message",
            "handle_serious_reports",
            "manage_site_settings"
        ]
    },

    Developer: {
        icon: "🛠️",
        className: "rank-developer",
        permissions: [
            "manage_site_settings",
            "mute_users",
            "kick_users",
            "ban_users"
        ]
    },

    Admin: {
        icon: "🔴",
        className: "rank-admin",
        permissions: [
            "manage_staff",
            "set_ranks",
            "create_rooms",
            "delete_rooms",
            "edit_any_room",
            "manage_room_permissions",
            "ban_users",
            "unban_users",
            "mute_users",
            "unmute_users",
            "kick_users",
            "warn_users",
            "restrict_users",
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
            "kick_users",
            "warn_users",
            "temporary_ban_users",
            "handle_reports",
            "manage_conversations",
            "manage_rooms"
        ]
    },

    Helper: {
        icon: "🟢",
        className: "rank-helper",
        permissions: [
            "help_users",
            "answer_questions",
            "report_problems",
            "warn_users"
        ]
    },

    VIP: {
        icon: "⭐",
        className: "rank-vip",
        permissions: [
            "vip_badge",
            "vip_name_color",
            "premium_profile_perks",
            "create_premium_rooms"
        ]
    },

    OG: {
        icon: "🌟",
        className: "rank-og",
        permissions: [
            "og_badge",
            "og_name_color",
            "early_member_perks"
        ]
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


// Roles considered "staff" for the purposes of viewing other users'
// action panels. Actual enforcement of any action must still happen
// server-side.
const STAFF_ROLES = [
    "Owner",
    "Developer",
    "Admin",
    "Moderator",
    "Helper"
];


// ============================================================
// MODERATION ACTIONS
// ============================================================

const ROLE_LEVELS = {
    Member: 0,
    OG: 0,
    VIP: 0,
    Helper: 1,
    Moderator: 2,
    Admin: 3,
    Developer: 4,
    Owner: 5
};

const MODERATION_ACTIONS = {

    Owner: [
        {
            id: "mute",
            label: "🔇 Mute",
            permission: "mute_users"
        },
        {
            id: "kick",
            label: "👢 Kick",
            permission: "kick_users"
        },
        {
            id: "ban",
            label: "🔨 Ban",
            permission: "ban_users"
        },
        {
            id: "warn",
            label: "⚠️ Warn",
            permission: "warn_users"
        },
        {
            id: "restrict",
            label: "🚫 Restrict",
            permission: "restrict_users"
        },
        {
            id: "delete_messages",
            label: "🗑️ Delete Messages",
            permission: "delete_any_message"
        },
        {
            id: "change_role",
            label: "🛡️ Change Role",
            permission: "set_ranks"
        }
    ],

    Developer: [
        {
            id: "mute",
            label: "🔇 Mute",
            permission: "mute_users"
        },
        {
            id: "kick",
            label: "👢 Kick",
            permission: "kick_users"
        },
        {
            id: "ban",
            label: "🔨 Ban",
            permission: "ban_users"
        }
    ],

    Admin: [
        {
            id: "mute",
            label: "🔇 Mute",
            permission: "mute_users"
        },
        {
            id: "kick",
            label: "👢 Kick",
            permission: "kick_users"
        },
        {
            id: "ban",
            label: "🔨 Ban",
            permission: "ban_users"
        },
        {
            id: "warn",
            label: "⚠️ Warn",
            permission: "warn_users"
        },
        {
            id: "restrict",
            label: "🚫 Restrict",
            permission: "restrict_users"
        },
        {
            id: "delete_messages",
            label: "🗑️ Delete Messages",
            permission: "delete_any_message"
        },
        {
            id: "change_role",
            label: "🛡️ Change Role",
            permission: "set_ranks"
        }
    ],

    Moderator: [
        {
            id: "mute",
            label: "🔇 Mute",
            permission: "mute_users"
        },
        {
            id: "kick",
            label: "👢 Kick",
            permission: "kick_users"
        },
        {
            id: "warn",
            label: "⚠️ Warn",
            permission: "warn_users"
        },
        {
            id: "delete_messages",
            label: "🗑️ Delete Messages",
            permission: "delete_messages"
        }
    ],

    Helper: [
        {
            id: "warn",
            label: "⚠️ Warn",
            permission: "warn_users"
        }
    ]
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


// ------------------------------------------------------------
// role is derived ONLY from the immutable OWNER_USER_ID
// or the database role column.
// ------------------------------------------------------------
function getEffectiveRole(profile, authUser) {

    const userId =
        (profile && profile.id) ||
        (authUser && authUser.id);

    if (userId === OWNER_USER_ID) {
        return "Owner";
    }

    return (profile && profile.role) || "Member";
}


function hasPermission(permission) {

    if (currentUser.role === "Owner") {
        return true;
    }

    return getRankDefinition(currentUser.role)
        .permissions
        .includes(permission);
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

    element.textContent =
        rank.icon + " " + (role || "Member");
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

    // Start listening for new messages in the current room.
    subscribeToRoomMessages();

    loadMessages();
    checkModerationStatus();
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
            avatarUrl:
                profile.avatar_url ||
                localStorage.getItem(
                    "afterhours-avatar-" +
                    profile.id
                ) ||
                "",
            role: getEffectiveRole(profile, user),
            muted: false,
            restricted: false
        };

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

    // Stop realtime before clearing the current user.
    await stopRoomMessageRealtime();

    if (supabaseClient) {
        await supabaseClient.auth.signOut();
    }

    currentUser = {
        id: null,
        username: "",
        displayName: "",
        bio: "",
        avatarUrl: "",
        role: "Member",
        muted: false,
        restricted: false
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
                    "afterhours-avatar-" +
                    currentUser.id,
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
                currentUser.displayName ||
                currentUser.username ||
                "User",
                avatarUrl
            );

            // Refresh messages so the new local avatar
            // appears on existing messages immediately.
            loadMessages();

            if (status) {
                status.textContent =
                    "Saved on this device.";
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
        get("profileUsername").textContent =
            "@" +
            (currentUser.username || "user");
    }

    if (get("profileRole")) {
        applyRank(
            get("profileRole"),
            currentUser.role
        );
    }

    if (get("profileBio")) {
        get("profileBio").textContent =
            currentUser.bio ||
            "No bio yet.";
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

    user.addEventListener(
        "click",
        openProfile
    );

    user.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Enter" ||
                event.key === " "
            ) {

                event.preventDefault();

                openProfile();
            }

        }
    );

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

        get("profileName").textContent =
            name;

        get("profileUsername").textContent =
            "@" +
            (user.username || "user");

        applyRank(
            get("profileRole"),
            user.role
        );

        get("profileBio").textContent =
            user.bio ||
            "No bio yet.";

        updateAvatar(
            get("profileAvatar"),
            name,
            user.avatarUrl
        );

        get("editProfileButton").classList.toggle(
            "hidden",
            user !== currentUser
        );

        renderPermissionPanel(user);

        modal.classList.remove("hidden");
    }
}


// ============================================================
// MODERATION PANEL
// ============================================================

function renderPermissionPanel(user) {

    const panel =
        get("permissionPanel");

    if (!panel) {
        return;
    }

    const isOwnProfile =
        user.id === currentUser.id;

    if (isOwnProfile) {

        panel.classList.add("hidden");
        panel.innerHTML = "";

        return;
    }

    if (!STAFF_ROLES.includes(currentUser.role)) {

        panel.classList.add("hidden");
        panel.innerHTML = "";

        return;
    }

    const viewerLevel =
        ROLE_LEVELS[currentUser.role] ?? 0;

    const targetLevel =
        ROLE_LEVELS[user.role] ?? 0;

    if (targetLevel >= viewerLevel) {

        panel.classList.add("hidden");
        panel.innerHTML = "";

        return;
    }

    const availableActions =
        MODERATION_ACTIONS[currentUser.role] || [];

    const allowedActions =
        availableActions.filter(
            function (action) {
                return hasPermission(
                    action.permission
                );
            }
        );

    if (!allowedActions.length) {

        panel.classList.add("hidden");
        panel.innerHTML = "";

        return;
    }

    const title =
        document.createElement("h4");

    title.textContent =
        "Actions";

    const actionsContainer =
        document.createElement("div");

    actionsContainer.className =
        "permission-actions";

    allowedActions.forEach(
        function (action) {

            // Change Role has its own selector below.
            // Don't create a duplicate button here.
            if (action.id === "change_role") {
                return;
            }

            const button =
                document.createElement("button");

            button.type = "button";
            button.className =
                "moderation-action";

            button.dataset.action =
                action.id;

            button.textContent =
                action.label;

            button.addEventListener(
                "click",
                function () {

                    handleModerationAction(
                        action.id,
                        user
                    );

                }
            );

            actionsContainer.appendChild(
                button
            );

        }
    );

    panel.innerHTML = "";

    panel.appendChild(title);

    panel.appendChild(
        actionsContainer
    );

    // --------------------------------------------------------
    // CHANGE ROLE
    // --------------------------------------------------------

    if (
        allowedActions.some(
            function (action) {
                return action.id === "change_role";
            }
        )
    ) {

        const roleSection =
            document.createElement("div");

        roleSection.className =
            "change-role-section";

        const roleTitle =
            document.createElement("h4");

        roleTitle.textContent =
            "Change Role";

        const roleControls =
            document.createElement("div");

        roleControls.className =
            "change-role-controls";

        const roleSelect =
            document.createElement("select");

        roleSelect.className =
            "moderation-role-select";

        Object.keys(ROLE_LEVELS)
            .forEach(function (role) {

                const roleLevel =
                    ROLE_LEVELS[role];

                if (roleLevel >= viewerLevel) {
                    return;
                }

                const option =
                    document.createElement("option");

                option.value = role;
                option.textContent = role;

                if (role === user.role) {
                    option.selected = true;
                }

                roleSelect.appendChild(
                    option
                );

            });

        const roleButton =
            document.createElement("button");

        roleButton.type = "button";
        roleButton.className =
            "moderation-action";

        roleButton.textContent =
            "🛡️ Apply Role";

        roleButton.addEventListener(
            "click",
            function () {

                handleModerationAction(
                    "change_role",
                    user,
                    roleSelect.value
                );

            }
        );

        roleControls.appendChild(
            roleSelect
        );

        roleControls.appendChild(
            roleButton
        );

        roleSection.appendChild(
            roleTitle
        );

        roleSection.appendChild(
            roleControls
        );

        panel.appendChild(
            roleSection
        );
    }

    panel.classList.remove("hidden");
}


// ============================================================
// MODERATION ACTION HANDLER
// ============================================================

async function handleModerationAction(
    action,
    user,
    selectedRole
) {

    if (!user || !user.id) {
        return;
    }

    if (user.id === currentUser.id) {

        alert(
            "You cannot moderate yourself."
        );

        return;
    }

    const viewerLevel =
        ROLE_LEVELS[currentUser.role] ?? 0;

    const targetLevel =
        ROLE_LEVELS[user.role] ?? 0;

    if (targetLevel >= viewerLevel) {

        alert(
            "You cannot moderate someone with an equal or higher rank."
        );

        return;
    }

    if (action === "change_role") {

        if (!hasPermission("set_ranks")) {

            alert(
                "You do not have permission to change roles."
            );

            return;
        }

        if (!selectedRole) {
            return;
        }

        const selectedLevel =
            ROLE_LEVELS[selectedRole];

        if (
            selectedLevel === undefined ||
            selectedLevel >= viewerLevel
        ) {

            alert(
                "You cannot assign that role."
            );

            return;
        }

        if (
            selectedRole === user.role
        ) {

            alert(
                "That user already has that role."
            );

            return;
        }

        const confirmed =
            confirm(
                "Change @" +
                user.username +
                " from " +
                user.role +
                " to " +
                selectedRole +
                "?"
            );

        if (!confirmed) {
            return;
        }

        const {
            error
        } = await supabaseClient.rpc(
            "afterhours_change_role",
            {
                target_id: user.id,
                new_role: selectedRole
            }
        );

        if (error) {

            console.error(error);

            alert(
                error.message ||
                "Unable to change this user's role."
            );

            return;
        }

        user.role = selectedRole;

        alert(
            "@" +
            user.username +
            " is now " +
            selectedRole +
            "."
        );

        openUserProfile(user);

        return;
    }


    let reason = null;
    let duration = null;


    // --------------------------------------------------------
    // MUTE
    // --------------------------------------------------------

    if (action === "mute") {

        duration =
            parseInt(
                prompt(
                    "Mute @" +
                    user.username +
                    " for how many minutes?",
                    "60"
                ),
                10
            );

        if (
            !Number.isFinite(duration) ||
            duration <= 0
        ) {

            alert(
                "Please enter a valid duration."
            );

            return;
        }

        reason =
            prompt(
                "Reason for muting @" +
                user.username +
                "?",
                ""
            );

        const {
            error
        } = await supabaseClient.rpc(
            "afterhours_mute_user",
            {
                target_id: user.id,
                duration_minutes: duration,
                reason_text: reason || null
            }
        );

        if (error) {

            console.error(error);

            alert(
                error.message ||
                "Unable to mute this user."
            );

            return;
        }

        alert(
            "@" +
            user.username +
            " has been muted for " +
            duration +
            " minutes."
        );

        return;
    }


    // --------------------------------------------------------
    // KICK
    // --------------------------------------------------------

    if (action === "kick") {

        const confirmed =
            confirm(
                "Kick @" +
                user.username +
                "?"
            );

        if (!confirmed) {
            return;
        }

        reason =
            prompt(
                "Reason for kicking @" +
                user.username +
                "?",
                ""
            );

        const {
            error
        } = await supabaseClient.rpc(
            "afterhours_kick_user",
            {
                target_id: user.id,
                reason_text: reason || null
            }
        );

        if (error) {

            console.error(error);

            alert(
                error.message ||
                "Unable to kick this user."
            );

            return;
        }

        alert(
            "@" +
            user.username +
            " has been kicked."
        );

        return;
    }


    // --------------------------------------------------------
    // BAN
    // --------------------------------------------------------

    if (action === "ban") {

        duration =
            parseInt(
                prompt(
                    "Ban @" +
                    user.username +
                    " for how many minutes?",
                    "1440"
                ),
                10
            );

        if (
            !Number.isFinite(duration) ||
            duration <= 0
        ) {

            alert(
                "Please enter a valid duration."
            );

            return;
        }

        reason =
            prompt(
                "Reason for banning @" +
                user.username +
                "?",
                ""
            );

        const confirmed =
            confirm(
                "Ban @" +
                user.username +
                " for " +
                duration +
                " minutes?"
            );

        if (!confirmed) {
            return;
        }

        const {
            error
        } = await supabaseClient.rpc(
            "afterhours_ban_user",
            {
                target_id: user.id,
                duration_minutes: duration,
                reason_text: reason || null
            }
        );

        if (error) {

            console.error(error);

            alert(
                error.message ||
                "Unable to ban this user."
            );

            return;
        }

        alert(
            "@" +
            user.username +
            " has been banned for " +
            duration +
            " minutes."
        );

        return;
    }


    // --------------------------------------------------------
    // WARN
    // --------------------------------------------------------

    if (action === "warn") {

        reason =
            prompt(
                "Warning reason for @" +
                user.username +
                "?",
                ""
            );

        const {
            error
        } = await supabaseClient.rpc(
            "afterhours_warn_user",
            {
                target_id: user.id,
                reason_text: reason || null
            }
        );

        if (error) {

            console.error(error);

            alert(
                error.message ||
                "Unable to warn this user."
            );

            return;
        }

        alert(
            "@" +
            user.username +
            " has been warned."
        );

        return;
    }


    // --------------------------------------------------------
    // RESTRICT
    // --------------------------------------------------------

    if (action === "restrict") {

        duration =
            parseInt(
                prompt(
                    "Restrict @" +
                    user.username +
                    " for how many minutes?",
                    "1440"
                ),
                10
            );

        if (
            !Number.isFinite(duration) ||
            duration <= 0
        ) {

            alert(
                "Please enter a valid duration."
            );

            return;
        }

        reason =
            prompt(
                "Reason for restricting @" +
                user.username +
                "?",
                ""
            );

        const {
            error
        } = await supabaseClient.rpc(
            "afterhours_restrict_user",
            {
                target_id: user.id,
                duration_minutes: duration,
                reason_text: reason || null
            }
        );

        if (error) {

            console.error(error);

            alert(
                error.message ||
                "Unable to restrict this user."
            );

            return;
        }

        alert(
            "@" +
            user.username +
            " has been restricted for " +
            duration +
            " minutes."
        );

        return;
    }


    // --------------------------------------------------------
    // DELETE MESSAGES
    // --------------------------------------------------------

    if (action === "delete_messages") {

        const confirmed =
            confirm(
                "Delete ALL messages sent by @" +
                user.username +
                "?"
            );

        if (!confirmed) {
            return;
        }

        const {
            data,
            error
        } = await supabaseClient.rpc(
            "afterhours_delete_user_messages",
            {
                target_id: user.id
            }
        );

        if (error) {

            console.error(error);

            alert(
                error.message ||
                "Unable to delete this user's messages."
            );

            return;
        }

        alert(
            "Deleted " +
            (data || 0) +
            " message(s) from @" +
            user.username +
            "."
        );

        loadMessages();

        return;
    }


    console.warn(
        "Unknown moderation action:",
        action
    );
}


// ============================================================
// MODERATION STATUS
// ============================================================

let moderationStatusInterval = null;

function updateMessageInputState() {

    const input =
        get("messageInput");

    const form =
        get("messageForm");

    if (!input || !form) {
        return;
    }

    const disabled =
        currentUser.muted ||
        currentUser.restricted;

    input.disabled = disabled;

    const button =
        form.querySelector("button");

    if (button) {
        button.disabled = disabled;
    }

    if (currentUser.muted) {

        input.placeholder =
            "You are currently muted.";

    } else if (currentUser.restricted) {

        input.placeholder =
            "You are currently restricted.";

    } else {

        input.placeholder =
            "Message " +
            rooms[currentRoom].title.substring(2) +
            "...";
    }
}


async function checkModerationStatus() {

    if (
        !supabaseClient ||
        !currentUser.id
    ) {
        return;
    }

    const {
        data,
        error
    } = await supabaseClient.rpc(
        "afterhours_get_my_status"
    );

    if (error) {

        console.error(
            "Moderation status check failed:",
            error
        );

        return;
    }

    if (!data) {
        return;
    }

    const status =
        Array.isArray(data)
            ? data[0]
            : data;

    if (!status) {
        return;
    }


    // --------------------------------------------------------
    // BAN
    // --------------------------------------------------------

    if (status.banned) {

        alert(
            "Your account is currently banned."
        );

        await stopRoomMessageRealtime();

        if (supabaseClient) {
            await supabaseClient.auth.signOut();
        }

        currentUser = {
            id: null,
            username: "",
            displayName: "",
            bio: "",
            avatarUrl: "",
            role: "Member",
            muted: false,
            restricted: false
        };

        showLanding();

        return;
    }


    // --------------------------------------------------------
    // KICK
    // --------------------------------------------------------

    if (status.kicked) {

        alert(
            "You have been kicked from Afterhours."
        );

        await stopRoomMessageRealtime();

        if (supabaseClient) {
            await supabaseClient.auth.signOut();
        }

        currentUser = {
            id: null,
            username: "",
            displayName: "",
            bio: "",
            avatarUrl: "",
            role: "Member",
            muted: false,
            restricted: false
        };

        showLanding();

        return;
    }


    currentUser.muted =
        Boolean(status.muted);

    currentUser.restricted =
        Boolean(status.restricted);

    updateMessageInputState();
}


function startModerationStatusChecks() {

    if (moderationStatusInterval) {

        clearInterval(
            moderationStatusInterval
        );
    }

    moderationStatusInterval =
        setInterval(
            checkModerationStatus,
            5000
        );
}


function stopModerationStatusChecks() {

    if (moderationStatusInterval) {

        clearInterval(
            moderationStatusInterval
        );

        moderationStatusInterval = null;
    }
}


// ============================================================
// PROFILE MODAL
// ============================================================

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

            await saveLocalAvatar(
                file,
                status
            );

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
            .eq(
                "id",
                currentUser.id
            );

        if (profileError) {

            console.error(profileError);

            await saveLocalAvatar(
                file,
                status
            );

            return;
        }

        currentUser.avatarUrl =
            avatarUrl;

        // Keep a local copy too so the avatar can still
        // be restored if the profile request temporarily
        // fails or the storage URL becomes unavailable.
        try {

            localStorage.setItem(
                "afterhours-avatar-" +
                currentUser.id,
                avatarUrl
            );

        } catch (error) {

            console.warn(
                "Unable to save avatar locally:",
                error
            );
        }

        updateUser();

        updateAvatar(
            get("editAvatarPreview"),
            currentUser.displayName ||
            currentUser.username ||
            "User",
            currentUser.avatarUrl
        );

        // Refresh existing chat messages so the updated
        // avatar appears immediately.
        loadMessages();

        if (status) {

            status.textContent =
                "Profile picture updated!";
        }

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


// ============================================================
// REALTIME MESSAGING
// ============================================================

let messageRealtimeChannel = null;
let messageRealtimeRoom = null;


// ------------------------------------------------------------
// Subscribe to new messages for the current room.
// ------------------------------------------------------------
async function subscribeToRoomMessages() {

    if (
        !supabaseClient ||
        !currentUser.id
    ) {
        return;
    }

    // Already listening to this room.
    if (
        messageRealtimeChannel &&
        messageRealtimeRoom === currentRoom
    ) {
        return;
    }

    // Remove the previous room listener.
    if (messageRealtimeChannel) {

        try {

            await supabaseClient.removeChannel(
                messageRealtimeChannel
            );

        } catch (err) {

            console.warn(
                "Unable to remove previous realtime channel:",
                err
            );

        }

        messageRealtimeChannel = null;
        messageRealtimeRoom = null;
    }

    const roomAtSubscription =
        currentRoom;

    const channelName =
        "afterhours-messages-" +
        roomAtSubscription +
        "-" +
        Date.now();

    messageRealtimeChannel =
        supabaseClient
            .channel(channelName)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages",
                    filter:
                        "room=eq." +
                        roomAtSubscription
                },
                async function (payload) {

                    // The user may have switched rooms
                    // since this listener was created.
                    if (
                        currentRoom !==
                        roomAtSubscription
                    ) {
                        return;
                    }

                    const message =
                        payload.new;

                    if (!message) {
                        return;
                    }

                    // Prevent duplicate rendering.
                    const existingMessage =
                        document.querySelector(
                            '[data-message-id="' +
                            message.id +
                            '"]'
                        );

                    if (existingMessage) {
                        return;
                    }

                    let profile = null;

                    if (message.user_id) {

                        const {
                            data,
                            error
                        } = await supabaseClient
                            .from("profiles")
                            .select(
                                "id, username, display_name, bio, avatar_url, role"
                            )
                            .eq(
                                "id",
                                message.user_id
                            )
                            .maybeSingle();

                        if (error) {

                            console.error(
                                "Realtime profile load failed:",
                                error
                            );

                        } else {

                            profile = data;
                        }
                    }

                    // If the sender is the current user and
                    // profile lookup didn't return anything,
                    // use the local current-user data.
                    if (
                        !profile &&
                        message.user_id ===
                        currentUser.id
                    ) {

                        profile = {

                            id:
                                currentUser.id,

                            username:
                                currentUser.username,

                            display_name:
                                currentUser.displayName,

                            bio:
                                currentUser.bio,

                            avatar_url:
                                currentUser.avatarUrl,

                            role:
                                currentUser.role
                        };
                    }

                    // If the room changed while the profile
                    // was loading, don't append this message
                    // to the wrong room.
                    if (
                        currentRoom !==
                        roomAtSubscription
                    ) {
                        return;
                    }

                    renderMessage(
                        message,
                        profile
                    );

                    const messages =
                        get("messages");

                    if (messages) {

                        messages.scrollTop =
                            messages.scrollHeight;
                    }
                }
            )
            .subscribe(
                function (status) {

                    console.log(
                        "Afterhours realtime:",
                        status,
                        "room:",
                        roomAtSubscription
                    );

                    if (
                        status === "SUBSCRIBED"
                    ) {

                        // Only mark this room as active if
                        // this is still the current channel.
                        if (
                            messageRealtimeChannel
                        ) {

                            messageRealtimeRoom =
                                roomAtSubscription;
                        }
                    }

                    if (
                        status === "CHANNEL_ERROR" ||
                        status === "TIMED_OUT" ||
                        status === "CLOSED"
                    ) {

                        console.warn(
                            "Afterhours realtime status:",
                            status
                        );
                    }
                }
            );
}


// ------------------------------------------------------------
// Stop the current realtime listener.
// ------------------------------------------------------------
async function stopRoomMessageRealtime() {

    if (
        !supabaseClient ||
        !messageRealtimeChannel
    ) {
        return;
    }

    try {

        await supabaseClient.removeChannel(
            messageRealtimeChannel
        );

    } catch (err) {

        console.warn(
            "Unable to remove realtime channel:",
            err
        );

    }

    messageRealtimeChannel = null;
    messageRealtimeRoom = null;
}


function formatMessageTime(timestamp) {

    if (!timestamp) {
        return "";
    }

    return new Intl.DateTimeFormat(
        undefined,
        {
            dateStyle: "medium",
            timeStyle: "short"
        }
    ).format(
        new Date(timestamp)
    );
}


function showMessageStatus(text) {

    const messages =
        get("messages");

    messages.innerHTML = "";

    const status =
        document.createElement("p");

    status.className =
        "message-status";

    status.textContent =
        text;

    messages.appendChild(status);
}


function renderMessage(message, profile) {

    const messages =
        get("messages");

    // Prevent duplicate messages from being rendered.
    if (message && message.id) {

        const existingMessage =
            document.querySelector(
                '[data-message-id="' +
                message.id +
                '"]'
            );

        if (existingMessage) {
            return;
        }
    }

    const user =
        profile || {};

    const usernameValue =
        user.username || "user";

    const displayName =
        user.display_name ||
        usernameValue;

    const name =
        displayName;

    const role =
        getEffectiveRole(user);

    let avatarUrl =
        user.avatar_url || "";

    // If this message belongs to the current user and
    // the database profile doesn't contain an avatar,
    // use the locally stored avatar as a fallback.
    if (
        !avatarUrl &&
        user.id === currentUser.id
    ) {

        avatarUrl =
            currentUser.avatarUrl ||
            localStorage.getItem(
                "afterhours-avatar-" +
                currentUser.id
            ) ||
            "";
    }

    const messageElement =
        document.createElement("article");

    messageElement.className =
        "message";

    // Store the database message ID on the element.
    // Realtime uses this to prevent duplicates.
    messageElement.dataset.messageId =
        message.id || "";

    const avatar =
        document.createElement("div");

    avatar.className =
        "avatar clickable-profile";

    avatar.tabIndex = 0;

    avatar.setAttribute(
        "role",
        "button"
    );

    avatar.setAttribute(
        "aria-label",
        "Open " +
        name +
        " profile"
    );

    updateAvatar(
        avatar,
        name,
        avatarUrl
    );

    const content =
        document.createElement("div");

    content.className =
        "message-content";

    const header =
        document.createElement("div");

    header.className =
        "message-header";

    const displayNameElement =
        document.createElement("strong");

    displayNameElement.className =
        "message-display-name";

    displayNameElement.textContent =
        displayName;

    const username =
        document.createElement("button");

    username.type = "button";

    username.className =
        "message-username";

    username.textContent =
        "@" +
        usernameValue;

    const roleElement =
        document.createElement("span");

    roleElement.className =
        "role";

    applyRank(
        roleElement,
        role
    );

    const timestamp =
        document.createElement("time");

    timestamp.className =
        "message-timestamp";

    timestamp.dateTime =
        message.created_at || "";

    timestamp.textContent =
        formatMessageTime(
            message.created_at
        );

    const textElement =
        document.createElement("p");

    textElement.textContent =
        message.content;

    header.appendChild(
        displayNameElement
    );

    header.appendChild(
        username
    );

    header.appendChild(
        roleElement
    );

    header.appendChild(
        timestamp
    );

    content.appendChild(
        header
    );

    content.appendChild(
        textElement
    );

    messageElement.appendChild(
        avatar
    );

    messageElement.appendChild(
        content
    );

    messages.appendChild(
        messageElement
    );

    const openProfile =
        function () {

            openUserProfile({

                id:
                    user.id ||
                    message.user_id,

                username:
                    usernameValue,

                displayName:
                    displayName,

                bio:
                    user.bio ||
                    "No bio yet.",

                role:
                    role,

                avatarUrl:
                    avatarUrl

            });

        };

    avatar.addEventListener(
        "click",
        openProfile
    );

    username.addEventListener(
        "click",
        openProfile
    );

    avatar.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Enter" ||
                event.key === " "
            ) {

                event.preventDefault();

                openProfile();
            }

        }
    );
}


async function loadMessages() {

    const loadVersion =
        ++messageLoadVersion;

    if (
        !supabaseClient ||
        !currentUser.id
    ) {

        showMessageStatus(
            "Messages are unavailable right now."
        );

        return;
    }

    showMessageStatus(
        "Loading messages..."
    );

    const {
        data: messages,
        error
    } = await supabaseClient
        .from("messages")
        .select(
            "id, user_id, room, content, created_at"
        )
        .eq(
            "room",
            currentRoom
        )
        .order(
            "created_at",
            {
                ascending: true
            }
        );

    if (
        loadVersion !==
        messageLoadVersion
    ) {
        return;
    }

    if (error) {

        console.error(error);

        showMessageStatus(
            "Unable to load messages."
        );

        return;
    }

    const userIds =
        [
            ...new Set(
                (messages || [])
                    .map(
                        function (message) {
                            return message.user_id;
                        }
                    )
                    .filter(Boolean)
            )
        ];

    let profiles = [];

    if (userIds.length) {

        const {
            data,
            error: profileError
        } = await supabaseClient
            .from("profiles")
            .select(
                "id, username, display_name, bio, avatar_url, role"
            )
            .in(
                "id",
                userIds
            );

        if (profileError) {

            console.error(
                profileError
            );

        } else {

            profiles =
                data || [];
        }
    }

    if (
        loadVersion !==
        messageLoadVersion
    ) {
        return;
    }

    const profilesById =
        new Map(
            profiles.map(
                function (profile) {

                    return [
                        profile.id,
                        profile
                    ];

                }
            )
        );

    // Make sure the current user's locally saved
    // avatar is available even if the database avatar
    // is temporarily missing.
    if (currentUser.id) {

        const localAvatar =
            localStorage.getItem(
                "afterhours-avatar-" +
                currentUser.id
            );

        if (
            localAvatar &&
            currentUser.avatarUrl !== localAvatar
        ) {

            currentUser.avatarUrl =
                currentUser.avatarUrl ||
                localAvatar;
        }

        const currentProfile =
            profilesById.get(
                currentUser.id
            );

        if (currentProfile) {

            if (
                !currentProfile.avatar_url &&
                currentUser.avatarUrl
            ) {

                currentProfile.avatar_url =
                    currentUser.avatarUrl;
            }

        } else {

            profilesById.set(
                currentUser.id,
                {
                    id:
                        currentUser.id,

                    username:
                        currentUser.username,

                    display_name:
                        currentUser.displayName,

                    bio:
                        currentUser.bio,

                    avatar_url:
                        currentUser.avatarUrl,

                    role:
                        currentUser.role
                }
            );
        }
    }

    const container =
        get("messages");

    container.innerHTML = "";

    if (
        !messages ||
        !messages.length
    ) {

        container.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon">${rooms[currentRoom].title.substring(0, 2)}</div>
                <h3>Welcome to ${rooms[currentRoom].title.substring(2)}</h3>
                <p>Send the first message.</p>
            </div>
        `;

        return;
    }

    messages.forEach(
        function (message) {

            renderMessage(
                message,
                profilesById.get(
                    message.user_id
                )
            );

        }
    );

    container.scrollTop =
        container.scrollHeight;
}


async function sendMessage() {

    const input =
        get("messageInput");

    const messages =
        get("messages");

    const text =
        input.value.trim();

    if (
        !text ||
        !supabaseClient ||
        !currentUser.id
    ) {
        return;
    }

    if (
        currentUser.muted ||
        currentUser.restricted
    ) {

        alert(
            currentUser.muted
                ? "You are currently muted."
                : "You are currently restricted."
        );

        return;
    }

    const button =
        get("messageForm")
            .querySelector("button");

    button.disabled = true;

    // --------------------------------------------------------
    // IMPORTANT:
    // Messages now go through the secure RPC instead of a
    // direct INSERT. This prevents muted/banned/restricted/
    // kicked users from bypassing moderation.
    // --------------------------------------------------------

    const {
        data: message,
        error
    } = await supabaseClient.rpc(
        "afterhours_send_message",
        {
            message_room:
                currentRoom,

            message_content:
                text
        }
    );

    button.disabled =
        currentUser.muted ||
        currentUser.restricted;

    if (error) {

        console.error(error);

        alert(
            error.message ||
            "Unable to send your message."
        );

        // Refresh moderation status in case
        // the server rejected the message because
        // a moderation action just became active.
        await checkModerationStatus();

        return;
    }

    input.value = "";

    // Render the message immediately for the sender.
    // The realtime listener will see the same message,
    // but renderMessage() prevents it from being duplicated.
    renderMessage(
        message,
        {
            id:
                currentUser.id,

            username:
                currentUser.username,

            display_name:
                currentUser.displayName,

            bio:
                currentUser.bio,

            avatar_url:
                currentUser.avatarUrl,

            role:
                currentUser.role
        }
    );

    messages.scrollTop =
        messages.scrollHeight;
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

    currentRoom =
        roomName;

    document
        .querySelectorAll(".room")
        .forEach(
            function (btn) {

                btn.classList.remove(
                    "active"
                );

            }
        );

    if (button) {

        button.classList.add(
            "active"
        );
    }

    get("roomTitle").textContent =
        room.title;

    get("roomDescription").textContent =
        room.description;

    updateMessageInputState();

    // Switch the realtime listener to the new room.
    subscribeToRoomMessages();

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
                    uploadProfilePicture(
                        file
                    );
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
        .forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        changeRoom(
                            button.dataset.room,
                            button
                        );

                    }
                );

            }
        );
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

        // ----------------------------------------------------
        // FIX:
        // Restore the local avatar if the Supabase profile
        // doesn't currently have an avatar URL.
        // ----------------------------------------------------

        const localAvatar =
            localStorage.getItem(
                "afterhours-avatar-" +
                profile.id
            );

        currentUser = {

            id:
                profile.id,

            username:
                profile.username,

            displayName:
                profile.display_name,

            bio:
                profile.bio ||
                "No bio yet.",

            avatarUrl:
                profile.avatar_url ||
                localAvatar ||
                "",

            role:
                getEffectiveRole(
                    profile,
                    user
                ),

            muted:
                false,

            restricted:
                false
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
startModerationStatusChecks();
