// ============================================================
// AFTERHOURS APP
// ============================================================

// =========================
// SUPABASE
// =========================

const SUPABASE_URL =
    "https://rkynnabggnpqpxzwlbwr.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_kb_dDY7fXA0yTkyQyoBwYw_1lkqf6GF";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


// =========================
// CURRENT USER
// =========================

let currentUser = {
    id: null,
    username: "",
    displayName: "",
    bio: "",
    role: "Member"
};


// =========================
// HELPER
// =========================

function get(id) {
    return document.getElementById(id);
}


// =========================
// PAGE SWITCHING
// =========================

function hideAllPages() {

    [
        "landingPage",
        "loginPage",
        "registerPage",
        "chatPage"
    ].forEach(function (id) {

        const page = get(id);

        if (page) {
            page.classList.add("hidden");
        }

    });

}


function showLanding() {

    hideAllPages();

    get("landingPage").classList.remove("hidden");

}


function showLogin() {

    hideAllPages();

    get("loginPage").classList.remove("hidden");

    setTimeout(function () {

        const input = get("loginEmail");

        if (input) {
            input.focus();
        }

    }, 50);

}


function showRegister() {

    hideAllPages();

    get("registerPage").classList.remove("hidden");

    setTimeout(function () {

        const input =
            get("registerUsername");

        if (input) {
            input.focus();
        }

    }, 50);

}


// =========================
// LOGIN
// =========================

async function login() {

    const email =
        get("loginEmail").value.trim();

    const password =
        get("loginPassword").value;


    if (!email) {

        alert("Please enter your email.");

        return;

    }


    if (!password) {

        alert("Please enter your password.");

        return;

    }


    const button =
        get("loginSubmit");


    button.disabled = true;

    button.textContent =
        "Logging in...";


    try {

        const result =
            await supabaseClient.auth.signInWithPassword({

                email: email,

                password: password

            });


        if (result.error) {

            console.error(result.error);

            alert(
                result.error.message
            );

            return;

        }


        const user =
            result.data.user;


        if (!user) {

            alert(
                "Login failed."
            );

            return;

        }


        // Email verification

        if (!user.email_confirmed_at) {

            await supabaseClient.auth.signOut();

            alert(
                "Please verify your email before logging in."
            );

            return;

        }


        // Get profile

        const profileResult =
            await supabaseClient
                .from("profiles")
                .select(
                    "id, username, display_name, bio, role"
                )
                .eq("id", user.id)
                .single();


        if (profileResult.error) {

            console.error(
                profileResult.error
            );

            alert(
                "Your account exists, but your profile could not be loaded."
            );

            return;

        }


        const profile =
            profileResult.data;


        currentUser = {

            id: profile.id,

            username:
                profile.username,

            displayName:
                profile.display_name,

            bio:
                profile.bio || "No bio yet.",

            role:
                profile.role || "Member"

        };


        updateUser();

        showChat();


    } finally {

        button.disabled = false;

        button.textContent =
            "Log In";

    }

}


// =========================
// REGISTER
// =========================

async function register() {

    const username =
        get("registerUsername")
            .value
            .trim();

    const email =
        get("registerEmail")
            .value
            .trim();

    const password =
        get("registerPassword")
            .value;


    if (!username) {

        alert(
            "Please choose a username."
        );

        return;

    }


    if (username.length < 3) {

        alert(
            "Username must be at least 3 characters."
        );

        return;

    }


    if (!email) {

        alert(
            "Please enter your email."
        );

        return;

    }


    if (!email.includes("@")) {

        alert(
            "Please enter a valid email."
        );

        return;

    }


    if (!password) {

        alert(
            "Please choose a password."
        );

        return;

    }


    if (password.length < 8) {

        alert(
            "Password must be at least 8 characters."
        );

        return;

    }


    const button =
        get("registerSubmit");


    button.disabled = true;

    button.textContent =
        "Creating account...";


    try {

        // Check username

        const usernameCheck =
            await supabaseClient
                .from("profiles")
                .select("id")
                .eq("username", username)
                .maybeSingle();


        if (usernameCheck.error) {

            console.error(
                usernameCheck.error
            );

            alert(
                "Unable to check username availability."
            );

            return;

        }


        if (usernameCheck.data) {

            alert(
                "That username is already taken."
            );

            return;

        }


        // Create account

        const result =
            await supabaseClient.auth.signUp({

                email: email,

                password: password,

                options: {

                    data: {

                        username:
                            username,

                        display_name:
                            username

                    }

                }

            });


        if (result.error) {

            console.error(
                result.error
            );

            alert(
                result.error.message
            );

            return;

        }


        if (!result.data.user) {

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


    } finally {

        button.disabled = false;

        button.textContent =
            "Create Account";

    }

}


// =========================
// LOGOUT
// =========================

async function logout() {

    await supabaseClient.auth.signOut();


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
// CHAT
// =========================

function showChat() {

    hideAllPages();

    get("chatPage")
        .classList
        .remove("hidden");


    updateUser();

    updateOnlineUsers();

}


// =========================
// USER UI
// =========================

function updateUser() {

    const name =
        currentUser.displayName ||
        currentUser.username ||
        "User";


    const topUsername =
        get("topUsername");

    const profileName =
        get("profileName");

    const profileAvatar =
        get("profileAvatar");

    const sidebarAvatar =
        get("sidebarAvatar");

    const profileBio =
        get("profileBio");


    if (topUsername) {

        topUsername.textContent =
            name;

    }


    if (profileName) {

        profileName.textContent =
            name;

    }


    if (profileBio) {

        profileBio.textContent =
            currentUser.bio ||
            "No bio yet.";

    }


    if (profileAvatar) {

        profileAvatar.textContent =
            name
                .charAt(0)
                .toUpperCase();

    }


    if (sidebarAvatar) {

        sidebarAvatar.textContent =
            name
                .charAt(0)
                .toUpperCase();

    }

}


// =========================
// ONLINE USERS
// =========================

function updateOnlineUsers() {

    const container =
        get("onlineUsers");


    if (!container) {
        return;
    }


    container.innerHTML = "";


    const user =
        document.createElement("div");

    user.className =
        "online-user";


    const dot =
        document.createElement("span");

    dot.className =
        "status-dot";


    const name =
        document.createElement("span");

    name.textContent =
        currentUser.displayName;


    user.appendChild(dot);

    user.appendChild(name);


    container.appendChild(user);

}


// =========================
// PROFILE
// =========================

function openProfile() {

    get("profileModal")
        .classList
        .remove("hidden");

}


function closeProfile() {

    get("profileModal")
        .classList
        .add("hidden");

}


function openEditProfile() {

    get("editName").value =
        currentUser.displayName;

    get("editBio").value =
        currentUser.bio;


    closeProfile();


    get("editProfileModal")
        .classList
        .remove("hidden");

}


function closeEditProfile() {

    get("editProfileModal")
        .classList
        .add("hidden");

}


// =========================
// SAVE PROFILE
// =========================

async function saveProfile() {

    const displayName =
        get("editName")
            .value
            .trim();

    const bio =
        get("editBio")
            .value
            .trim();


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


    const result =
        await supabaseClient
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


    if (result.error) {

        console.error(
            result.error
        );

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


// =========================
// MESSAGES
// =========================

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


    const message =
        document.createElement("div");

    message.className =
        "message";


    const avatar =
        document.createElement("div");

    avatar.className =
        "avatar";


    const name =
        currentUser.displayName ||
        currentUser.username ||
        "User";


    avatar.textContent =
        name
            .charAt(0)
            .toUpperCase();


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


    content.appendChild(username);

    content.appendChild(role);

    content.appendChild(textElement);


    message.appendChild(avatar);

    message.appendChild(content);


    messages.appendChild(message);


    input.value = "";

    messages.scrollTop =
        messages.scrollHeight;

}


// =========================
// ROOMS
// =========================

const rooms = {

    general: {

        title:
            "💬 General",

        description:
            "Talk. Connect. Chill."

    },

    gaming: {

        title:
            "🎮 Gaming",

        description:
            "Talk about games."

    },

    music: {

        title:
            "🎵 Music",

        description:
            "Share music and discover new stuff."

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
        .forEach(function (roomButton) {

            roomButton.classList.remove(
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

            <div class="welcome-icon">
                ${room.title.substring(0, 2)}
            </div>

            <h3>
                Welcome to ${room.title.substring(2)}
            </h3>

            <p>
                Send the first message.
            </p>

        </div>

    `;

}


// =========================
// BUTTONS
// =========================

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
            function (event) {

                event.preventDefault();

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
            function (event) {

                event.preventDefault();

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


    // Message form

    get("messageForm")
        .addEventListener(
            "submit",
            function (event) {

                event.preventDefault();

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


// =========================
// SESSION
// =========================

async function checkSession() {

    const result =
        await supabaseClient.auth.getSession();


    if (
        result.error ||
        !result.data.session
    ) {

        showLanding();

        return;

    }


    const user =
        result.data.session.user;


    if (!user.email_confirmed_at) {

        await supabaseClient.auth.signOut();

        showLanding();

        return;

    }


    const profileResult =
        await supabaseClient
            .from("profiles")
            .select(
                "id, username, display_name, bio, role"
            )
            .eq("id", user.id)
            .single();


    if (
        profileResult.error ||
        !profileResult.data
    ) {

        await supabaseClient.auth.signOut();

        showLanding();

        return;

    }


    const profile =
        profileResult.data;


    currentUser = {

        id:
            profile.id,

        username:
            profile.username,

        displayName:
            profile.display_name,

        bio:
            profile.bio || "No bio yet.",

        role:
            profile.role || "Member"

    };


    showChat();

}


// =========================
// START
// =========================

setupButtons();

checkSession();
