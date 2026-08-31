// =========================
// AFTERHOURS APP
// =========================

const landingPage = document.getElementById("landingPage");
const loginPage = document.getElementById("loginPage");
const signupPage = document.getElementById("signupPage");
const chatPage = document.getElementById("chatPage");

const loginButton = document.getElementById("loginButton");
const signupButton = document.getElementById("signupButton");

const backFromLogin = document.getElementById("backFromLogin");
const backFromSignup = document.getElementById("backFromSignup");

const enterChatButton = document.getElementById("enterChatButton");
const createAccountButton = document.getElementById("createAccountButton");

const currentUser = document.getElementById("currentUser");

const loginUsername = document.getElementById("loginUsername");
const signupUsername = document.getElementById("signupUsername");

const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");

const messages = document.getElementById("messages");

const rooms = document.querySelectorAll(".room");

const chatTitle = document.getElementById("chatTitle");
const chatDescription = document.getElementById("chatDescription");


// =========================
// PAGE SWITCHING
// =========================

function showPage(page) {

    landingPage.classList.add("hidden");
    loginPage.classList.add("hidden");
    signupPage.classList.add("hidden");
    chatPage.classList.add("hidden");

    page.classList.remove("hidden");
}


// =========================
// LANDING
// =========================

loginButton.addEventListener("click", () => {
    showPage(loginPage);
});

signupButton.addEventListener("click", () => {
    showPage(signupPage);
});


// =========================
// BACK BUTTONS
// =========================

backFromLogin.addEventListener("click", () => {
    showPage(landingPage);
});

backFromSignup.addEventListener("click", () => {
    showPage(landingPage);
});


// =========================
// TEMP LOGIN
// =========================

enterChatButton.addEventListener("click", () => {

    const username = loginUsername.value.trim();

    if (!username) {
        alert("Enter a username.");
        return;
    }

    currentUser.textContent = username;

    showPage(chatPage);

    messageInput.focus();
});


// =========================
// TEMP REGISTER
// =========================

createAccountButton.addEventListener("click", () => {

    const username = signupUsername.value.trim();

    if (!username) {
        alert("Choose a username.");
        return;
    }

    currentUser.textContent = username;

    showPage(chatPage);

    messageInput.focus();
});


// =========================
// SEND MESSAGE
// =========================

function sendMessage() {

    const text = messageInput.value.trim();

    if (!text) {
        return;
    }

    const message = document.createElement("div");

    message.className = "message";

    // Avatar
    const avatar = document.createElement("div");

    avatar.className = "avatar";

    avatar.textContent =
        currentUser.textContent
            .charAt(0)
            .toUpperCase();


    // Message content
    const content = document.createElement("div");


    // Username
    const username = document.createElement("strong");

    username.textContent =
        currentUser.textContent;


    // Role
    const role = document.createElement("span");

    role.className = "role";

    role.textContent = "Member";


    // Text
    const messageText = document.createElement("p");

    messageText.textContent = text;


    // Build message
    content.appendChild(username);
    content.appendChild(role);
    content.appendChild(messageText);

    message.appendChild(avatar);
    message.appendChild(content);

    messages.appendChild(message);


    // Clear input
    messageInput.value = "";

    messages.scrollTop =
        messages.scrollHeight;

    messageInput.focus();
}


// Send button
sendButton.addEventListener("click", sendMessage);


// Enter key
messageInput.addEventListener("keydown", (event) => {

    if (event.key === "Enter") {
        sendMessage();
    }

});


// =========================
// ROOMS
// =========================

const roomInfo = {

    "💬 General": {
        title: "💬 General",
        description: "Talk. Connect. Chill."
    },

    "🎮 Gaming": {
        title: "🎮 Gaming",
        description: "Talk about games."
    },

    "🎵 Music": {
        title: "🎵 Music",
        description: "Share music and discover new stuff."
    }

};


rooms.forEach(room => {

    room.addEventListener("click", () => {

        // Remove active from all rooms
        rooms.forEach(r => {
            r.classList.remove("active");
        });

        // Activate clicked room
        room.classList.add("active");


        const info =
            roomInfo[room.textContent.trim()];


        if (!info) {
            return;
        }


        // Update header
        chatTitle.textContent =
            info.title;

        chatDescription.textContent =
            info.description;


        // Update placeholder
        messageInput.placeholder =
            `Message ${room.textContent.trim()}...`;


        // Clear current messages
        messages.innerHTML = "";

    });

});


// =========================
// START
// =========================

showPage(landingPage);
