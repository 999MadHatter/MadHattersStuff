```javascript
// =========================
// PAGE ELEMENTS
// =========================

const landingPage = document.getElementById("landingPage");
const loginPage = document.getElementById("loginPage");
const signupPage = document.getElementById("signupPage");
const chatPage = document.getElementById("chatPage");


// =========================
// LANDING BUTTONS
// =========================

const loginButton = document.getElementById("loginButton");
const signupButton = document.getElementById("signupButton");


// =========================
// BACK BUTTONS
// =========================

const backFromLogin = document.getElementById("backFromLogin");
const backFromSignup = document.getElementById("backFromSignup");


// =========================
// LOGIN
// =========================

const enterChatButton =
    document.getElementById("enterChatButton");

const loginUsername =
    document.getElementById("loginUsername");

const loginPassword =
    document.getElementById("loginPassword");


// =========================
// REGISTER
// =========================

const createAccountButton =
    document.getElementById("createAccountButton");

const signupUsername =
    document.getElementById("signupUsername");

const signupEmail =
    document.getElementById("signupEmail");

const signupPassword =
    document.getElementById("signupPassword");


// =========================
// CHAT
// =========================

const topUsername =
    document.getElementById("topUsername");

const messageInput =
    document.getElementById("messageInput");

const sendButton =
    document.getElementById("sendButton");

const messages =
    document.getElementById("messages");


// =========================
// PROFILE
// =========================

const profileButton =
    document.getElementById("profileButton");

const profileModal =
    document.getElementById("profileModal");

const closeProfile =
    document.getElementById("closeProfile");

const editProfileButton =
    document.getElementById("editProfileButton");

const editProfileModal =
    document.getElementById("editProfileModal");

const closeEditProfile =
    document.getElementById("closeEditProfile");

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
// CURRENT USER
// =========================

let currentUser = {
    username: "MadHatter",
    displayName: "MadHatter",
    bio: "Building Afterhours 🔥",
    role: "Owner"
};


// =========================
// PAGE SWITCHER
// =========================

function showPage(page) {

    landingPage.classList.add("hidden");
    loginPage.classList.add("hidden");
    signupPage.classList.add("hidden");
    chatPage.classList.add("hidden");

    page.classList.remove("hidden");
}


// =========================
// LOGIN PAGE
// =========================

loginButton.addEventListener("click", function () {

    showPage(loginPage);

    loginUsername.focus();

});


// =========================
// REGISTER PAGE
// =========================

signupButton.addEventListener("click", function () {

    showPage(signupPage);

    signupUsername.focus();

});


// =========================
// BACK TO LANDING
// =========================

backFromLogin.addEventListener("click", function () {

    showPage(landingPage);

});


backFromSignup.addEventListener("click", function () {

    showPage(landingPage);

});


// =========================
// LOGIN
// =========================

enterChatButton.addEventListener("click", function () {

    const username =
        loginUsername.value.trim();

    const password =
        loginPassword.value;


    if (username === "") {

        alert("Enter your username.");

        return;
    }


    if (password === "") {

        alert("Enter your password.");

        return;
    }


    currentUser.username = username;
    currentUser.displayName = username;


    updateProfile();


    showPage(chatPage);

    messageInput.focus();

});


// =========================
// REGISTER
// =========================

createAccountButton.addEventListener("click", function () {

    const username =
        signupUsername.value.trim();

    const email =
        signupEmail.value.trim();

    const password =
        signupPassword.value;


    if (username === "") {

        alert("Choose a username.");

        return;
    }


    if (email === "") {

        alert("Enter your email.");

        return;
    }


    if (password === "") {

        alert("Choose a password.");

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


    updateProfile();


    showPage(chatPage);

    messageInput.focus();

});


// =========================
// PROFILE UPDATE
// =========================

function updateProfile() {

    topUsername.textContent =
        currentUser.displayName;

    profileName.textContent =
        currentUser.displayName;

    profileAvatar.textContent =
        currentUser.displayName
            .charAt(0)
            .toUpperCase();

    profileBio.textContent =
        currentUser.bio;

}


// =========================
// OPEN PROFILE
// =========================

profileButton.addEventListener("click", function () {

    updateProfile();

    profileModal.classList.remove("hidden");

});


// =========================
// CLOSE PROFILE
// =========================

closeProfile.addEventListener("click", function () {

    profileModal.classList.add("hidden");

});


// =========================
// EDIT PROFILE
// =========================

editProfileButton.addEventListener("click", function () {

    editDisplayName.value =
        currentUser.displayName;

    editBio.value =
        currentUser.bio;

    profileModal.classList.add("hidden");

    editProfileModal.classList.remove("hidden");

});


// =========================
// CLOSE EDIT PROFILE
// =========================

closeEditProfile.addEventListener("click", function () {

    editProfileModal.classList.add("hidden");

});


// =========================
// SAVE PROFILE
// =========================

saveProfileButton.addEventListener("click", function () {

    const newName =
        editDisplayName.value.trim();

    const newBio =
        editBio.value.trim();


    if (newName === "") {

        alert("Display name cannot be empty.");

        return;
    }


    currentUser.displayName =
        newName;

    currentUser.bio =
        newBio || "No bio yet.";


    updateProfile();


    editProfileModal.classList.add("hidden");

});


// =========================
// SEND MESSAGE
// =========================

function sendMessage() {

    const text =
        messageInput.value.trim();


    if (text === "") {
        return;
    }


    const emptyChat =
        messages.querySelector(".empty-chat");


    if (emptyChat) {
        emptyChat.remove();
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


    messageInput.value = "";

    messages.scrollTop =
        messages.scrollHeight;

}


// =========================
// SEND BUTTON
// =========================

sendButton.addEventListener("click", sendMessage);


// =========================
// ENTER TO SEND
// =========================

messageInput.addEventListener(
    "keydown",
    function (event) {

        if (event.key === "Enter") {

            event.preventDefault();

            sendMessage();

        }

    }
);


// =========================
// CHAT ROOMS
// =========================

const rooms =
    document.querySelectorAll(".room");

const chatTitle =
    document.getElementById("chatTitle");

const chatDescription =
    document.getElementById("chatDescription");


const roomInfo = {

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


rooms.forEach(function (room) {

    room.addEventListener("click", function () {

        rooms.forEach(function (r) {

            r.classList.remove("active");

        });


        room.classList.add("active");


        const roomID =
            room.dataset.room;


        const info =
            roomInfo[roomID];


        if (!info) {
            return;
        }


        chatTitle.textContent =
            info.title;

        chatDescription.textContent =
            info.description;


        messageInput.placeholder =
            "Message " + info.title + "...";


        messages.innerHTML = "";


        const emptyChat =
            document.createElement("div");

        emptyChat.className =
            "empty-chat";


        const icon =
            document.createElement("div");

        icon.textContent =
            roomID === "general"
                ? "💬"
                : roomID === "gaming"
                    ? "🎮"
                    : "🎵";


        const title =
            document.createElement("h3");

        title.textContent =
            "Welcome to " +
            info.title.substring(2);


        const description =
            document.createElement("p");

        description.textContent =
            "Be the first person to send a message.";


        emptyChat.appendChild(icon);
        emptyChat.appendChild(title);
        emptyChat.appendChild(description);


        messages.appendChild(emptyChat);

    });

});


// =========================
// START
// =========================

showPage(landingPage);
```
