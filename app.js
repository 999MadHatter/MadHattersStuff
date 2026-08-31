```javascript
alert("Afterhours JS is working!");
// =========================
// AFTERHOURS
// FRONTEND PROTOTYPE
// =========================


// =========================
// PAGE ELEMENTS
// =========================

const landingPage =
    document.getElementById("landingPage");

const loginPage =
    document.getElementById("loginPage");

const signupPage =
    document.getElementById("signupPage");

const chatPage =
    document.getElementById("chatPage");


// =========================
// LANDING BUTTONS
// =========================

const loginButton =
    document.getElementById("loginButton");

const signupButton =
    document.getElementById("signupButton");


// =========================
// BACK BUTTONS
// =========================

const backFromLogin =
    document.getElementById("backFromLogin");

const backFromSignup =
    document.getElementById("backFromSignup");


// =========================
// AUTH INPUTS
// =========================

const loginUsername =
    document.getElementById("loginUsername");

const loginPassword =
    document.getElementById("loginPassword");

const signupUsername =
    document.getElementById("signupUsername");

const signupEmail =
    document.getElementById("signupEmail");

const signupPassword =
    document.getElementById("signupPassword");


// =========================
// AUTH BUTTONS
// =========================

const enterChatButton =
    document.getElementById("enterChatButton");

const createAccountButton =
    document.getElementById("createAccountButton");


// =========================
// USER DISPLAY
// =========================

const topUsername =
    document.getElementById("topUsername");


// =========================
// CHAT
// =========================

const messageInput =
    document.getElementById("messageInput");

const sendButton =
    document.getElementById("sendButton");

const messages =
    document.getElementById("messages");

const rooms =
    document.querySelectorAll(".room");

const chatTitle =
    document.getElementById("chatTitle");

const chatDescription =
    document.getElementById("chatDescription");


// =========================
// ONLINE USERS
// =========================

const onlineTitle =
    document.getElementById("onlineTitle");

const onlineUsers =
    document.getElementById("onlineUsers");


// =========================
// PROFILE
// =========================

const profileButton =
    document.getElementById("profileButton");

const profileModal =
    document.getElementById("profileModal");

const closeProfile =
    document.getElementById("closeProfile");

const profileAvatar =
    document.getElementById("profileAvatar");

const profileName =
    document.getElementById("profileName");

const profileBio =
    document.getElementById("profileBio");

const profileRole =
    document.getElementById("profileRole");


// =========================
// EDIT PROFILE
// =========================

const editProfileButton =
    document.getElementById("editProfileButton");

const editProfileModal =
    document.getElementById("editProfileModal");

const closeEditProfile =
    document.getElementById("closeEditProfile");

const editDisplayName =
    document.getElementById("editDisplayName");

const editBio =
    document.getElementById("editBio");

const saveProfileButton =
    document.getElementById("saveProfileButton");


// =========================
// USER
// =========================

let user = {

    username: "MadHatter",

    displayName: "MadHatter",

    bio: "Building Afterhours 🔥",

    role: "Owner"

};


// =========================
// ROOMS
// =========================

const roomInfo = {

    general: {

        title: "💬 General",

        description:
            "Talk. Connect. Chill."

    },

    gaming: {

        title: "🎮 Gaming",

        description:
            "Talk about games."

    },

    music: {

        title: "🎵 Music",

        description:
            "Share music and discover new stuff."

    }

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
// LANDING
// =========================

loginButton.addEventListener("click", () => {

    showPage(loginPage);

    loginUsername.focus();

});


signupButton.addEventListener("click", () => {

    showPage(signupPage);

    signupUsername.focus();

});


// =========================
// BACK
// =========================

backFromLogin.addEventListener("click", () => {

    showPage(landingPage);

});


backFromSignup.addEventListener("click", () => {

    showPage(landingPage);

});


// =========================
// UPDATE USER UI
// =========================

function updateUserUI() {

    topUsername.textContent =
        user.displayName;

    profileName.textContent =
        user.displayName;

    profileAvatar.textContent =
        user.displayName
            .charAt(0)
            .toUpperCase();

    profileBio.textContent =
        user.bio;

    profileRole.textContent =
        user.role;

}


// =========================
// LOGIN
// =========================

enterChatButton.addEventListener("click", () => {

    const username =
        loginUsername.value.trim();

    const password =
        loginPassword.value;


    if (!username) {

        alert("Please enter your username.");

        return;

    }


    if (!password) {

        alert("Please enter your password.");

        return;

    }


    user.username = username;

    user.displayName = username;


    updateUserUI();

    showPage(chatPage);

    updateOnlineUsers();

    messageInput.focus();

});


// =========================
// REGISTER
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

        alert("Please enter your email.");

        return;

    }


    if (!password) {

        alert("Please choose a password.");

        return;

    }


    if (password.length < 8) {

        alert(
            "Your password must be at least 8 characters."
        );

        return;

    }


    user.username = username;

    user.displayName = username;


    updateUserUI();

    showPage(chatPage);

    updateOnlineUsers();

    messageInput.focus();

});


// =========================
// PROFILE
// =========================

profileButton.addEventListener("click", () => {

    updateUserUI();

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

    editDisplayName.focus();

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

        alert(
            "Display name cannot be empty."
        );

        return;

    }


    user.displayName =
        newName;

    user.bio =
        newBio || "No bio yet.";


    updateUserUI();

    editProfileModal.classList.add("hidden");

});


// =========================
// CLOSE MODALS
// =========================

profileModal.addEventListener(
    "click",
    event => {

        if (event.target === profileModal) {

            profileModal.classList.add("hidden");

        }

    }
);


editProfileModal.addEventListener(
    "click",
    event => {

        if (
            event.target === editProfileModal
        ) {

            editProfileModal.classList.add("hidden");

        }

    }
);


// =========================
// SEND MESSAGE
// =========================

function sendMessage() {

    const text =
        messageInput.value.trim();


    if (!text) {
        return;
    }


    // Remove empty-chat message

    const emptyChat =
        messages.querySelector(".empty-chat");

    if (emptyChat) {

        emptyChat.remove();

    }


    // Message container

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

    if (user.role === "Owner") {

        role.classList.add("owner");

    }

    role.textContent =
        user.role;


    // Message text

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


    // Reset

    messageInput.value = "";

    messages.scrollTop =
        messages.scrollHeight;

    messageInput.focus();

}


// =========================
// SEND BUTTON
// =========================

sendButton.addEventListener(
    "click",
    sendMessage
);


// =========================
// ENTER TO SEND
// =========================

messageInput.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {

            event.preventDefault();

            sendMessage();

        }

    }
);


// =========================
// ROOM SWITCHING
// =========================

rooms.forEach(room => {

    room.addEventListener(
        "click",
        () => {

            rooms.forEach(r => {

                r.classList.remove("active");

            });


            room.classList.add("active");


            const roomId =
                room.dataset.room;


            const info =
                roomInfo[roomId];


            if (!info) {
                return;
            }


            chatTitle.textContent =
                info.title;

            chatDescription.textContent =
                info.description;

            messageInput.placeholder =
                `Message ${info.title}...`;


            // Clear room

            messages.innerHTML = "";


            // Show empty state

            const emptyChat =
                document.createElement("div");

            emptyChat.className =
                "empty-chat";


            const icon =
                document.createElement("div");

            icon.textContent =
                roomId === "general"
                    ? "💬"
                    : roomId === "gaming"
                        ? "🎮"
                        : "🎵";


            const title =
                document.createElement("h3");

            title.textContent =
                `Welcome to ${info.title.substring(2)}`;


            const description =
                document.createElement("p");

            description.textContent =
                "Be the first person to send a message.";


            emptyChat.appendChild(icon);

            emptyChat.appendChild(title);

            emptyChat.appendChild(description);

            messages.appendChild(emptyChat);

            messageInput.focus();

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
        "online";


    const dot =
        document.createElement("span");

    dot.className =
        "online-dot";


    const name =
        document.createElement("span");

    name.textContent =
        user.displayName;


    userElement.appendChild(dot);

    userElement.appendChild(name);


    userElement.addEventListener(
        "click",
        () => {

            updateUserUI();

            profileModal.classList.remove(
                "hidden"
            );

        }
    );


    onlineUsers.appendChild(userElement);


    onlineTitle.textContent =
        "ONLINE — 1";

}


// =========================
// START
// =========================

showPage(landingPage);
```
