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


// ============================================================
// HELPER
// ============================================================

function get(id) {
    return document.getElementById(id);
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
            role: profile.role || "Member"
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

    if (get("profileRole")) {
        get("profileRole").textContent = currentUser.role || "Member";
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
        get("profileRole").textContent = user.role || "Member";
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

            alert(
                "Unable to upload your profile picture."
            );

            if (status) {
                status.textContent =
                    "Upload failed.";
            }

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

            alert(
                "The picture uploaded, but your profile could not be updated."
            );

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

function sendMessage() {

    const input =
        get("messageInput");


    const messages =
        get("messages");


    const text =
        input.value.trim();


    if (!text) {
        return;
    }


    const welcome =
        messages.querySelector(
            ".welcome-message"
        );


    if (welcome) {
        welcome.remove();
    }


    const name =
        currentUser.displayName ||
        currentUser.username ||
        "User";


    const message =
        document.createElement("div");

    message.className =
        "message";


    const avatar =
        document.createElement("div");

    avatar.className =
        "avatar";


    updateAvatar(
        avatar,
        name,
        currentUser.avatarUrl
    );


    const content =
        document.createElement("div");


    const username =
        document.createElement("strong");

    username.textContent =
        name;


    const role =
        document.createElement("span");

    role.className =
        "role";

    role.textContent =
        currentUser.role;


    const textElement =
        document.createElement("p");

    textElement.textContent =
        text;


    content.appendChild(
        username
    );

    content.appendChild(
        role
    );

    content.appendChild(
        textElement
    );


    message.appendChild(
        avatar
    );

    message.appendChild(
        content
    );


    messages.appendChild(
        message
    );

    avatar.classList.add("clickable-profile");
    avatar.tabIndex = 0;
    avatar.setAttribute("role", "button");
    avatar.setAttribute("aria-label", "Open " + name + " profile");
    avatar.addEventListener("click", function () {
        openUserProfile({
            displayName: name,
            bio: "No bio yet.",
            role: currentUser.role,
            avatarUrl: currentUser.avatarUrl
        });
    });
    avatar.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            avatar.click();
        }
    });


    input.value = "";

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


    get("messages").innerHTML = `
        <div class="welcome-message">
            <div class="welcome-icon">${room.title.substring(0, 2)}</div>
            <h3>Welcome to ${room.title.substring(2)}</h3>
            <p>Send the first message.</p>
        </div>
    `;
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
            role: profile.role || "Member"
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
