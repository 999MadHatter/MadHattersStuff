```javascript
const SUPABASE_URL = "https://rkynnabggnpqpxzwlbwr.supabase.co";

const SUPABASE_KEY = "sb_publishable_kb_dDY7fXA0yTkyQyoBwYw_1lkqf6GF";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);
// =========================
// AFTERHOURS
// =========================


// =========================
// USER
// =========================

let currentUser = {
    username: "MadHatter",
    displayName: "MadHatter",
    bio: "Building Afterhours 🔥",
    role: "Owner"
};


// =========================
// HELPERS
// =========================

function get(id) {
    return document.getElementById(id);
}


// =========================
// PAGE SWITCHING
// =========================

function hideAllPages() {

    get("landingPage").classList.add("hidden");
    get("loginPage").classList.add("hidden");
    get("registerPage").classList.add("hidden");
    get("chatPage").classList.add("hidden");

}


function showLanding() {

    hideAllPages();

    get("landingPage").classList.remove("hidden");

}


function showLogin() {

    hideAllPages();

    get("loginPage").classList.remove("hidden");

    setTimeout(() => {
        get("loginUsername").focus();
    }, 50);

}


function showRegister() {

    hideAllPages();

    get("registerPage").classList.remove("hidden");

    setTimeout(() => {
        get("registerUsername").focus();
    }, 50);

}


// =========================
// LOGIN
// =========================

function login() {

    const username =
        get("loginUsername").value.trim();

    const password =
        get("loginPassword").value;


    if (!username) {

        alert("Please enter your username.");

        return;
    }


    if (!password) {

        alert("Please enter your password.");

        return;
    }


    currentUser.username = username;

    currentUser.displayName = username;


    updateUser();


    showChat();

}


// =========================
// REGISTER
// =========================

function register() {

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

        alert(
            "Password must be at least 8 characters."
        );

        return;
    }


    currentUser.username = username;

    currentUser.displayName = username;


    updateUser();


    showChat();

}


// =========================
// SHOW CHAT
// =========================

function showChat() {

    hideAllPages();

    get("chatPage").classList.remove("hidden");

    updateOnlineUsers();

    get("messageInput").focus();

}


// =========================
// UPDATE USER
// =========================

function updateUser() {

    get("topUsername").textContent =
        currentUser.displayName;

    get("profileName").textContent =
        currentUser.displayName;

    get("profileAvatar").textContent =
        currentUser.displayName
            .charAt(0)
            .toUpperCase();

    get("profileBio").textContent =
        currentUser.bio;

}


// =========================
// ONLINE USER
// =========================

function updateOnlineUsers() {

    const container =
        get("onlineUsers");

    container.innerHTML = "";


    const user = document.createElement("div");

    user.className = "online-user";


    const dot = document.createElement("span");

    dot.className = "status-dot";


    const name = document.createElement("span");

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

    get("profileModal")
        .classList.remove("hidden");

}


function closeProfile() {

    get("profileModal")
        .classList.add("hidden");

}


function closeProfileOutside(event) {

    if (
        event.target === get("profileModal")
    ) {

        closeProfile();

    }

}


// =========================
// EDIT PROFILE
// =========================

function openEditProfile() {

    get("editName").value =
        currentUser.displayName;

    get("editBio").value =
        currentUser.bio;


    closeProfile();


    get("editProfileModal")
        .classList.remove("hidden");

}


function closeEditProfile() {

    get("editProfileModal")
        .classList.add("hidden");

}


function closeEditOutside(event) {

    if (
        event.target ===
        get("editProfileModal")
    ) {

        closeEditProfile();

    }

}


function saveProfile() {

    const name =
        get("editName").value.trim();

    const bio =
        get("editBio").value.trim();


    if (!name) {

        alert("Display name cannot be empty.");

        return;
    }


    currentUser.displayName = name;

    currentUser.bio =
        bio || "No bio yet.";


    updateUser();

    updateOnlineUsers();

    closeEditProfile();

}


// =========================
// SEND MESSAGE
// =========================

function sendMessage() {

    const input =
        get("messageInput");

    const text =
        input.value.trim();


    if (!text) {
        return;
    }


    const messages =
        get("messages");


    const welcome =
        messages.querySelector(
            ".welcome-message"
        );


    if (welcome) {
        welcome.remove();
    }


    const message =
        document.createElement("div");

    message.className = "message";


    const avatar =
        document.createElement("div");

    avatar.className = "avatar";

    avatar.textContent =
        currentUser.displayName
            .charAt(0)
            .toUpperCase();


    const content =
        document.createElement("div");


    const username =
        document.createElement("strong");

    username.textContent =
        currentUser.displayName;


    const role =
        document.createElement("span");

    role.className = "role";

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

    input.focus();

}


// =========================
// ENTER TO SEND
// =========================

function handleEnter(event) {

    if (event.key === "Enter") {

        event.preventDefault();

        sendMessage();

    }

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

    const room =
        rooms[roomName];


    if (!room) {
        return;
    }


    document
        .querySelectorAll(".room")
        .forEach(function (item) {

            item.classList.remove("active");

        });


    button.classList.add("active");


    get("roomTitle").textContent =
        room.title;

    get("roomDescription").textContent =
        room.description;

    get("messageInput").placeholder =
        "Message " +
        room.title.substring(2) +
        "...";


    get("messages").innerHTML = "";


    const welcome =
        document.createElement("div");

    welcome.className =
        "welcome-message";


    const icon =
        document.createElement("div");

    icon.className =
        "welcome-icon";

    icon.textContent =
        room.title.substring(0, 2);


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


    get("messages")
        .appendChild(welcome);

}


// =========================
// START
// =========================

showLanding();
```
