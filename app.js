const rooms = document.querySelectorAll(".room");
const messages = document.querySelector(".messages");
const input = document.querySelector(".message-input input");
const sendButton = document.querySelector(".message-input button");
const chatTitle = document.querySelector(".chat-header h2");
const chatDescription = document.querySelector(".chat-header p");

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

        rooms.forEach(r => r.classList.remove("active"));

        room.classList.add("active");

        const info = roomInfo[room.textContent.trim()];

        if (info) {
            chatTitle.textContent = info.title;
            chatDescription.textContent = info.description;
        }
    });
});


function sendMessage() {

    const text = input.value.trim();

    if (text === "") return;

    const message = document.createElement("div");

    message.className = "message";

    message.innerHTML = `
        <div class="avatar">M</div>

        <div>
            <strong>MadHatter</strong>
            <span class="role owner">Owner</span>
            <p>${text}</p>
        </div>
    `;

    messages.appendChild(message);

    input.value = "";

    messages.scrollTop = messages.scrollHeight;
}


sendButton.addEventListener("click", sendMessage);

input.addEventListener("keydown", event => {

    if (event.key === "Enter") {
        sendMessage();
    }

});
