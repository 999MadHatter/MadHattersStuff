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
const loginPassword = document.getElementById("loginPassword");

const signupUsername = document.getElementById("signupUsername");
const signupEmail = document.getElementById("signupEmail");
const signupPassword = document.getElementById("signupPassword");

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
// REAL LOGIN
// =========================

enterChatButton.addEventListener("click", async () => {

    const username = loginUsername.value.trim();
    const password = loginPassword.value;

    if (!username || !password) {
        alert("Enter your username and password.");
        return;
    }

    enterChatButton.disabled = true;
    enterChatButton.textContent = "Logging in...";

    try {

        const response = await fetch("/api/login", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            credentials: "include",

            body: JSON.stringify({
                username,
                password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || "Login failed.");
            return;
        }

        currentUser.textContent = data.user.username;

        showPage(chatPage);

    } catch (error) {

        console.error(error);

        alert("Unable to connect to SklChat.");

    } finally {

        enterChatButton.disabled = false;
        enterChatButton.textContent = "Log In";

    }

});


// =========================
// REAL REGISTRATION
// =========================

createAccountButton.addEventListener("click", async () => {

    const username = signupUsername.value.trim();
    const email = signupEmail.value.trim();
    const password = signupPassword.value;

    if (!username || !email || !password) {
        alert("Please fill in every field.");
        return;
    }

    if (password.length < 8) {
        alert("Password must be at least 8 characters.");
        return;
    }

    createAccountButton.disabled = true;
    createAccountButton.textContent = "Creating account...";

    try {

        const response = await fetch("/api/register", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            credentials: "include",

            body: JSON.stringify({
                username,
                email,
                password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || "Registration failed.");
            return;
        }

        currentUser.textContent = data.user.username;

        alert("Account created successfully!");

        showPage(chatPage);

    } catch (error) {

        console.error(error);

        alert("Unable to connect to SklChat.");

    } finally {

        createAccountButton.disabled = false;
        createAccountButton.textContent = "Create Account";

    }

});


// =========================
// MESSAGES
// =========================

function sendMessage() {

    const text = messageInput.value.trim();

    if (!text) {
        return;
    }

    const message = document.createElement("div");

    message.className = "message";

    const avatar = document.createElement("div");

    avatar.className = "avatar";

    avatar.textContent =
        currentUser.textContent
            .charAt(0)
            .toUpperCase();

    const content = document.createElement("div");

    const username = document.createElement("strong");

    username.textContent =
        currentUser.textContent;

    const role = document.createElement("span");

    role.className = "role";
    role.textContent = "Member";

    const messageText = document.createElement("p");

    messageText.textContent = text;

    content.appendChild(username);
    content.appendChild(role);
    content.appendChild(messageText);

    message.appendChild(avatar);
    message.appendChild(content);

    messages.appendChild(message);

    messageInput.value = "";

    messages.scrollTop =
        messages.scrollHeight;
}


sendButton.addEventListener("click", sendMessage);


messageInput.addEventListener("keydown", event => {

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

        rooms.forEach(r => {
            r.classList.remove("active");
        });

        room.classList.add("active");

        const info =
            roomInfo[room.textContent.trim()];

        if (info) {

            chatTitle.textContent =
                info.title;

            chatDescription.textContent =
                info.description;

            messageInput.placeholder =
                `Message ${room.textContent.trim()}...`;

        }

    });

});


// =========================
// START
// =========================

showPage(landingPage);
