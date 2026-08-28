```javascript
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


function showPage(page) {

    landingPage.classList.add("hidden");
    loginPage.classList.add("hidden");
    signupPage.classList.add("hidden");
    chatPage.classList.add("hidden");

    page.classList.remove("hidden");
}


loginButton.addEventListener("click", () => {
    showPage(loginPage);
});


signupButton.addEventListener("click", () => {
    showPage(signupPage);
});


backFromLogin.addEventListener("click", () => {
    showPage(landingPage);
});


backFromSignup.addEventListener("click", () => {
    showPage(landingPage);
});


enterChatButton.addEventListener("click", () => {

    const username = loginUsername.value.trim();

    if (username === "") {
        alert("Please enter a username.");
        return;
    }

    currentUser.textContent = username;

    showPage(chatPage);
});


createAccountButton.addEventListener("click", () => {

    const username = signupUsername.value.trim();

    if (username === "") {
        alert("Please choose a username.");
        return;
    }

    currentUser.textContent = username;

    showPage(chatPage);
});


function sendMessage() {

    const text = messageInput.value.trim();

    if (text === "") {
        return;
    }

    const message = document.createElement("div");

    message.className = "message";

    message.innerHTML = `
        <div class="avatar">
            ${currentUser.textContent.charAt(0).toUpperCase()}
        </div>

        <div>
            <strong>${currentUser.textContent}</strong>
            <span class="role owner">Member</span>
            <p>${text}</p>
        </div>
    `;

    messages.appendChild(message);

    messageInput.value = "";

    messages.scrollTop = messages.scrollHeight;
}


sendButton.addEventListener("click", sendMessage);


messageInput.addEventListener("keydown", (event) => {

    if (event.key === "Enter") {
        sendMessage();
    }

});


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

        const info = roomInfo[room.textContent.trim()];

        if (info) {

            chatTitle.textContent = info.title;

            chatDescription.textContent =
                info.description;

            messageInput.placeholder =
                `Message ${room.textContent.trim()}...`;
        }

    });

});
```
