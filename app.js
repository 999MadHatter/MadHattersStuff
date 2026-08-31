// ============================================================
// AFTERHOURS
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
// HELPERS
// =========================

function get(id) {
    return document.getElementById(id);
}


function hideAllPages() {

    const pages = [
        "landingPage",
        "loginPage",
        "registerPage",
        "chatPage"
    ];

    pages.forEach(function (id) {

        const page = get(id);

        if (page) {
            page.classList.add("hidden");
        }

    });

}


// =========================
// LANDING
// =========================

function showLanding() {

    hideAllPages();

    const page = get("landingPage");

    if (page) {
        page.classList.remove("hidden");
    }

}


// =========================
// LOGIN PAGE
// =========================

function showLogin() {

    hideAllPages();

    const page = get("loginPage");

    if (page) {
        page.classList.remove("hidden");
    }

    setTimeout(function () {

        const email = get("loginEmail");

        if (email) {
            email.focus();
        }

    }, 50);

}


// =========================
// REGISTER PAGE
// =========================

function showRegister() {

    hideAllPages();

    const page = get("registerPage");

    if (page) {
        page.classList.remove("hidden");
    }

    setTimeout(function () {

        const username =
            get("registerUsername");

        if (username) {
            username.focus();
        }

    }, 50);

}


// =========================
// LOGIN
// =========================

async function login() {

    const emailInput =
        get("loginEmail");

    const passwordInput =
        get("loginPassword");


    if (!emailInput || !passwordInput) {

        alert(
            "Login form could not be found."
        );

        return;
    }


    const email =
        emailInput.value.trim();

    const password =
        passwordInput.value;


    if (!email) {

        alert(
            "Please enter your email."
        );

        return;
    }


    if (!password) {

        alert(
            "Please enter your password."
        );

        return;
    }


    // Disable button while logging in

    const button =
        document.querySelector(
            '[onclick="login()"]'
        );

    if (button) {
        button.disabled = true;
    }


    try {

        const result =
            await supabaseClient.auth.signInWithPassword({

                email: email,

                password: password

            });


        const data = result.data;

        const error = result.error;


        // Wrong credentials

        if (error) {

            console.error(error);

            alert(
                "Incorrect email or password."
            );

            return;
        }


        if (!data || !data.user) {

            alert(
                "Login failed. Please try again."
            );

            return;
        }


        // Email verification

        if (!data.user.email_confirmed_at) {

            await supabaseClient.auth.signOut();

            alert(
                "Please verify your email before logging in."
            );

            return;
        }


        // Load profile

        const profileResult =
            await supabaseClient
                .from("profiles")
                .select(
                    "id, username, display_name, bio, role"
                )
                .eq("id", data.user.id)
                .single();


        const profile =
            profileResult.data;

        const profileError =
            profileResult.error;


        if (profileError || !profile) {

            console.error(profileError);

            alert(
                "Your account exists, but your profile could not be loaded."
            );

            return;
        }


        // Save user

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

        if (button) {
            button.disabled = false;
        }

    }

}


// =========================
// REGISTER
// =========================

async function register() {

    const usernameInput =
        get("registerUsername");

    const emailInput =
        get("registerEmail");

    const passwordInput =
        get("registerPassword");


    if (
        !usernameInput ||
        !emailInput ||
        !passwordInput
    ) {

        alert(
            "Registration form could not be found."
        );

        return;
    }


    const username =
        usernameInput.value.trim();

    const email =
        emailInput.value.trim();

    const password =
        passwordInput.value;


    // Validation

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


    if (username.length > 24) {

        alert(
            "Username must be 24 characters or less."
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


    // Disable button

    const button =
        document.querySelector(
            '[onclick="register()"]'
        );

    if (button) {
        button.disabled = true;
    }


    try {

        // Check username first

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


        // Create Supabase account

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


        const data = result.data;

        const error = result.error;


        if (error) {

            console.error(error);

            alert(error.message);

            return;
        }


        if (!data || !data.user) {

            alert(
                "Something went wrong creating your account."
            );

            return;
        }


        // Email verification required

        alert(
            "Account created! Check your email and click the verification link before logging in."
        );


        // Clear registration form

        usernameInput.value = "";
        emailInput.value = "";
        passwordInput.value = "";


        showLogin();


    } finally {

        if (button) {
            button.disabled = false;
        }

    }

}


// =========================
// LOGOUT
// =========================

async function logout() {

    const { error } =
        await supabaseClient.auth.signOut();


    if (error) {

        console.error(error);

        alert(
            "Unable to log out."
        );

        return;
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
// SHOW CHAT
// =========================

function showChat() {

    hideAllPages();

    const page =
        get("chatPage");

    if (page) {
        page.classList.remove("hidden");
    }


    updateUser();

    updateOnlineUsers();


    setTimeout(function () {

        const input =
            get("messageInput");

        if (input) {
            input.focus();
        }

    }, 50);

}


// =========================
// UPDATE USER UI
// =========================

function updateUser() {

    const topUsername =
        get("topUsername");

    const profileName =
        get("profileName");

    const profileAvatar =
        get("profileAvatar");

    const profileBio =
        get("profileBio");


    if (topUsername) {

        topUsername.textContent =
            currentUser.displayName ||
            currentUser.username;

    }


    if (profileName) {

        profileName.textContent =
            currentUser.displayName ||
            currentUser.username;

    }


    if (profileAvatar) {

        const name =
            currentUser.displayName ||
            currentUser.username ||
            "?";

        profileAvatar.textContent =
            name.charAt(0).toUpperCase();

    }


    if (profileBio) {

        profileBio.textContent =
            currentUser.bio ||
            "No bio yet.";

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


    if (!currentUser.displayName) {
        return;
    }


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

    updateUser();


    const modal =
        get("profileModal");


    if (modal) {
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


function closeProfileOutside(event) {

    const modal =
        get("profileModal");


    if (
        modal &&
        event.target === modal
    ) {

        closeProfile();

    }

}


// =========================
// EDIT PROFILE
// =========================

function openEditProfile() {

    const nameInput =
        get("editName");

    const bioInput =
        get("editBio");


    if (nameInput) {

        nameInput.value =
            currentUser.displayName;

    }


    if (bioInput) {

        bioInput.value =
            currentUser.bio;

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


function closeEditOutside(event) {

    const modal =
        get("editProfileModal");


    if (
        modal &&
        event.target === modal
    ) {

        closeEditProfile();

    }

}


// =========================
// SAVE PROFILE
// =========================

async function saveProfile() {

    const nameInput =
        get("editName");

    const bioInput =
        get("editBio");


    if (!nameInput || !bioInput) {

        alert(
            "Profile editor could not be found."
        );

        return;
    }


    const displayName =
        nameInput.value.trim();

    const bio =
        bioInput.value.trim();


    if (!displayName) {

        alert(
            "Display name cannot be empty."
        );

        return;
    }


    if (!currentUser.id) {

        alert(
            "You must be logged in."
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
            "Unable to save your profile."
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
        "Profile saved."
    );

}


// =========================
// SEND MESSAGE
// =========================

function sendMessage() {

    const input =
        get("messageInput");


    const messages =
        get("messages");


    if (!input || !messages) {
        return;
    }


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


    const displayName =
        currentUser.displayName ||
        currentUser.username ||
        "User";


    avatar.textContent =
        displayName
            .charAt(0)
            .toUpperCase();


    const content =
        document.createElement("div");


    const username =
        document.createElement("strong");

    username.textContent =
        displayName;


    const role =
        document.createElement("span");

    role.className =
        "role";

    role.textContent =
        currentUser.role ||
        "Member";


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


    input.value = "";

    messages.scrollTop =
        messages.scrollHeight;

    input.focus();

}


// =========================
// ENTER TO SEND
// =========================

function handleEnter(event) {

    if (
        event.key === "Enter"
    ) {

        event.preventDefault();

        sendMessage();

    }

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
        .forEach(function (item) {

            item.classList.remove(
                "active"
            );

        });


    if (button) {

        button.classList.add(
            "active"
        );

    }


    const roomTitle =
        get("roomTitle");

    const roomDescription =
        get("roomDescription");

    const messageInput =
        get("messageInput");

    const messages =
        get("messages");


    if (roomTitle) {

        roomTitle.textContent =
            room.title;

    }


    if (roomDescription) {

        roomDescription.textContent =
            room.description;

    }


    if (messageInput) {

        messageInput.placeholder =
            "Message " +
            room.title.substring(2) +
            "...";

    }


    if (!messages) {
        return;
    }


    messages.innerHTML = "";


    const welcome =
        document.createElement("div");

    welcome.className =
        "welcome-message";


    const icon =
        document.createElement("div");

    icon.className =
        "welcome-icon";

    icon.textContent =
        room.title.substring(
            0,
            2
        );


    const title =
        document.createElement("h3");

    title.textContent =
        "Welcome to " +
        room.title.substring(2);


    const description =
        document.createElement("p");

    description.textContent =
        "Send the first message.";


    welcome.appendChild(icon);

    welcome.appendChild(title);

    welcome.appendChild(description);


    messages.appendChild(
        welcome
    );

}


// =========================
// BUTTON EVENT FALLBACKS
// =========================
//
// These make the navigation work even if
// your HTML buttons don't have onclick="".
// =========================

function setupButtons() {

    const loginButton =
        get("loginButton");

    const registerButton =
        get("registerButton");

    const backFromLogin =
        get("backFromLogin");

    const backFromRegister =
        get("backFromRegister");

    const loginSubmit =
        get("loginSubmit");

    const registerSubmit =
        get("registerSubmit");


    if (loginButton) {

        loginButton.addEventListener(
            "click",
            showLogin
        );

    }


    if (registerButton) {

        registerButton.addEventListener(
            "click",
            showRegister
        );

    }


    if (backFromLogin) {

        backFromLogin.addEventListener(
            "click",
            showLanding
        );

    }


    if (backFromRegister) {

        backFromRegister.addEventListener(
            "click",
            showLanding
        );

    }


    if (loginSubmit) {

        loginSubmit.addEventListener(
            "click",
            login
        );

    }


    if (registerSubmit) {

        registerSubmit.addEventListener(
            "click",
            register
        );

    }

}


// =========================
// CHECK EXISTING SESSION
// =========================

async function checkSession() {

    const result =
        await supabaseClient.auth.getSession();


    if (
        result.error ||
        !result.data ||
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

        console.error(
            profileResult.error
        );

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
// START AFTERHOURS
// =========================

setupButtons();

checkSession();
