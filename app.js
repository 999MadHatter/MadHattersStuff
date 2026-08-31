```javascript
// =========================
// AFTERHOURS
// =========================

// ---------- PAGES ----------

const landingPage = document.getElementById("landingPage");
const loginPage = document.getElementById("loginPage");
const signupPage = document.getElementById("signupPage");
const chatPage = document.getElementById("chatPage");

// ---------- LANDING BUTTONS ----------

const loginButton = document.getElementById("loginButton");
const signupButton = document.getElementById("signupButton");

// ---------- BACK BUTTONS ----------

const backFromLogin = document.getElementById("backFromLogin");
const backFromSignup = document.getElementById("backFromSignup");

// ---------- LOGIN / REGISTER ----------

const enterChatButton = document.getElementById("enterChatButton");
const createAccountButton = document.getElementById("createAccountButton");

const loginUsername = document.getElementById("loginUsername");
const loginPassword = document.getElementById("loginPassword");

const signupUsername = document.getElementById("signupUsername");
const signupEmail = document.getElementById("signupEmail");
const signupPassword = document.getElementById("signupPassword");

// ---------- USER ----------

const currentUser = document.getElementById("topUsername");
const profileButton = document.getElementById("profileButton");

// ---------- CHAT ----------

const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const messages = document.getElementById("messages");

const rooms = document.querySelectorAll(".room");

const chatTitle = document.getElementById("chatTitle");
const chatDescription = document.getElementById("chatDescription");

// ---------- ONLINE USERS ----------

const onlineTitle = document.getElementById("onlineTitle");
const onlineUsers = document.getElementById("onlineUsers");

// ---------- PROFILE ----------

const profileModal = document.getElementById("profileModal");
const editProfileModal = document.getElementById("editProfileModal");

const closeProfile = document.getElementById("closeProfile");
const closeEditProfile = document.getElementById("closeEditProfile");

const editProfileButton =
    document.getElementById("editProfileButton");

const saveProfileButton =
    document.getElementById("saveProfileButton");

const profileName =
    document.getElementById("profileName");

const profileAvatar =
    document.getElementById("profileAvatar");

const profileBio =
    document.getElementById("profileBio");

const editDisplayName =
    document.getElementById("editDisplayName");

const editBio =
    document.getElementById("editBio");


// =========================
// USER DATA
// =========================

let user = {
    username: "MadHatter",
    displayName: "MadHatter",
    bio: "Building Afterhours 🔥",
    role: "Owner"
};


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
// LANDING PAGE
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
// ==========================

enterChatButton.addEventListener("click", () => {

    const username =
        loginUsername.value.trim();

    const password =
        loginPassword.value;

    if (!username) {

        alert("Please enter a username.");

        return;

    }

    if (!password) {

        alert("Please enter your password.");

        return;

    }

    user.username = username;

    user.displayName = username;

    updateUserDisplay();

    showPage(chatPage);

    messageInput.focus();

    updateOnlineUsers();

});


// =========================
// TEMP REGISTER
// =========================

createAccountButton.addEventListener("click", () => {

    const username =
        signupUsername.value.trim();

    const email =
        signupEmail.value.trim();

    const password =
        signupPassword.value;

    if (!username) {

        alert("Please choose a username.");

        return;

    }

    if (!email) {

        alert("Please enter an email.");

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

    user.username = username;

    user.displayName = username;

    updateUserDisplay();

    showPage(chatPage);

    messageInput.focus();

    updateOnlineUsers();

});


// =========================
// UPDATE USER DISPLAY
// =========================

function updateUserDisplay() {

    currentUser.textContent =
        user.displayName;

    profileName.textContent =
        user.displayName;

    profileAvatar.textContent =
        user.displayName
            .charAt(0)
            .toUpperCase();

    profileBio.textContent =
        user.bio;

}


// =========================
// PROFILE
// =========================

profileButton.addEventListener("click", () => {

    updateUserDisplay();

    profileModal.classList.remove("hidden");

});


closeProfile.addEventListener("click", () => {

    profileModal.classList.add("hidden");

});


editProfileButton.addEventListener("click", () => {

    editDisplayName.value =
        user.displayName;

    editBio.value =
        user.bio;

    profileModal.classList.add("hidden");

    editProfileModal.classList.remove("hidden");

});


closeEditProfile.addEventListener("click", () => {

    editProfileModal.classList.add("hidden");

});


saveProfileButton.addEventListener("click", () => {

    const newName =
        editDisplayName.value.trim();

    const newBio =
        editBio.value.trim();

    if (!newName) {

        alert("Display name cannot be empty.");

        return;

    }

    user.displayName =
        newName;

    user.bio =
        newBio || "No bio yet.";

    updateUserDisplay();

    editProfileModal.classList.add("hidden");

});


// =========================
// SEND MESSAGE
// =========================

function sendMessage() {

    const text =
        messageInput.value.trim();

    if (!text) {
        return;
    }

    const message =
        document.createElement("div");

    message.className = "message";


    // Avatar

    const avatar =
        document.createElement("div");

    avatar.className = "avatar";

    avatar.textContent =
        user.displayName
            .charAt(0)
            .toUpperCase();


    // Content

    const content =
        document.createElement("div");


    // Username

    const username =
        document.createElement("strong");

    username.textContent =
        user.displayName;


    // Role

    const role =
        document.createElement("span");

    role.className = "role";

    role.textContent =
        user.role;


    // Message

    const messageText =
        document.createElement("p");

    messageText.textContent =
        text;


    // Assemble

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

sendButton.addEventListener(
    "click",
    sendMessage
);


// Enter key

messageInput.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {

            sendMessage();

        }

    }
);


// =========================
// CHAT ROOMS
// =========================

const roomInfo = {

    "💬 General": {

        title: "💬 General",

        description:
            "Talk. Connect. Chill."

    },

    "🎮 Gaming": {

        title: "🎮 Gaming",

        description:
            "Talk about games."

    },

    "🎵 Music": {

        title: "🎵 Music",

        description:
            "Share music and discover new stuff."

    }

};


rooms.forEach(room => {

    room.addEventListener(
        "click",
        () => {

            rooms.forEach(r => {

                r.classList.remove("active");

            });

            room.classList.add("active");


            const info =
                roomInfo[
                    room.textContent.trim()
                ];


            if (!info) {
                return;
            }


            chatTitle.textContent =
                info.title;

            chatDescription.textContent =
                info.description;

            messageInput.placeholder =
                `Message ${room.textContent.trim()}...`;


            // Empty room

            messages.innerHTML = "";

        }
    );

});


// =========================
// ONLINE USERS
// =========================

function updateOnlineUsers() {

    onlineUsers.innerHTML = "";


    const userElement =
        document.createElement("div");

    userElement.className =
        "online profile-link";

    userElement.textContent =
        `🟢 ${user.displayName}`;


    userElement.addEventListener(
        "click",
        () => {

            profileModal.classList.remove(
                "hidden"
            );

            updateUserDisplay();

        }
    );


    onlineUsers.appendChild(userElement);


    onlineTitle.textContent =
        "ONLINE — 1";

}


// =========================
// CLOSE MODALS BY CLICKING
// OUTSIDE THE CARD
// =========================

profileModal.addEventListener(
    "click",
    event => {

        if (event.target === profileModal) {

            profileModal.classList.add(
                "hidden"
            );

        }

    }
);


editProfileModal.addEventListener(
    "click",
    event => {

        if (
            event.target === editProfileModal
        ) {

            editProfileModal.classList.add(
                "hidden"
            );

        }

    }
);


// =========================
// START
// =========================

showPage(landingPage);
```
