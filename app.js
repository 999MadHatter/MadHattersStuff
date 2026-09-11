// ============================================================
// hii lol
// ============================================================

const SUPABASE_URL = "https://rkynnabggnpqpxzwlbwr.supabase.co";
const SUPABASE_KEY = "sb_publishable_kb_dDY7fXA0yTkyQyoBwYw_1lkqf6GF";
const OWNER_USER_ID = "e3b8dd5d-56cf-447e-95e6-4506a1c818ce";

// Safely create Supabase client
let supabaseClient = null;

try {
    if (
        window.supabase &&
        typeof window.supabase.createClient === "function"
    ) {
        supabaseClient = window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_KEY
        );
    } else {
        console.warn("Supabase library not loaded");
    }
} catch (err) {
    console.error("Supabase client error:", err);
}


// ============================================================
// CURRENT USER
// ============================================================

let currentUser = {
    id: null,
    username: "",
    displayName: "",
    bio: "",
    avatarUrl: "",
    role: "Member",
    muted: false,
    restricted: false
};

let viewedProfileUser = null;

// ============================================================
// CHAT ATTACHMENTS
// ============================================================

let pendingAttachment = null;
let replyingToMessage = null;
let editingMessageId = null;
const CHAT_ATTACHMENT_BUCKET = "chat-files";
const CHAT_MAX_FILE_SIZE = 20 * 1024 * 1024;
const CHAT_BLOCKED_EXTENSIONS = new Set([
    "exe", "bat", "cmd", "com", "msi", "scr", "ps1", "vbs", "js", "html", "htm"
]);

function formatFileSize(bytes) {
    if (!Number.isFinite(bytes)) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function getFileExtension(name) {
    const parts = String(name || "").toLowerCase().split(".");
    return parts.length > 1 ? parts.pop() : "";
}

function isImageFile(file) {
    return !!file && String(file.type || "").startsWith("image/");
}

function clearPendingAttachment() {
    pendingAttachment = null;
    const input = document.getElementById("attachmentInput");
    if (input) input.value = "";
    const preview = document.getElementById("attachmentPreview");
    if (preview) {
        preview.innerHTML = "";
        preview.classList.add("hidden");
    }
}

function showAttachmentPreview(file) {
    const preview = document.getElementById("attachmentPreview");
    if (!preview) return;

    preview.innerHTML = "";
    const row = document.createElement("div");
    row.className = "attachment-preview-row";

    if (isImageFile(file)) {
        const img = document.createElement("img");
        img.className = "attachment-preview-thumb";
        img.alt = "Selected image";
        img.src = URL.createObjectURL(file);
        row.appendChild(img);
    } else {
        const icon = document.createElement("span");
        icon.className = "attachment-preview-thumb";
        icon.style.display = "flex";
        icon.style.alignItems = "center";
        icon.style.justifyContent = "center";
        icon.textContent = "📎";
        row.appendChild(icon);
    }

    const name = document.createElement("span");
    name.className = "attachment-preview-name";
    name.textContent = file.name + " · " + formatFileSize(file.size);
    row.appendChild(name);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "attachment-remove";
    remove.textContent = "×";
    remove.title = "Remove attachment";
    remove.addEventListener("click", clearPendingAttachment);
    row.appendChild(remove);

    preview.appendChild(row);
    preview.classList.remove("hidden");
}

async function handleAttachmentSelection(file) {
    if (!file) return;

    if (!supabaseClient || !currentUser.id) {
        alert("Please sign in before attaching a file.");
        return;
    }

    if (file.size > CHAT_MAX_FILE_SIZE) {
        alert("Files must be 20 MB or smaller.");
        return;
    }

    const extension = getFileExtension(file.name);
    if (CHAT_BLOCKED_EXTENSIONS.has(extension)) {
        alert("That file type isn't allowed in chat.");
        return;
    }

    pendingAttachment = file;
    showAttachmentPreview(file);
}

async function uploadChatAttachment(file) {
    const safeName = String(file.name || "file")
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .slice(0, 120);

    const path = currentUser.id + "/" + Date.now() + "-" + crypto.randomUUID() + "-" + safeName;

    const { error } = await supabaseClient.storage
        .from(CHAT_ATTACHMENT_BUCKET)
        .upload(path, file, {
            contentType: file.type || "application/octet-stream",
            cacheControl: "3600",
            upsert: false
        });

    if (error) throw error;

    return {
        path,
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size
    };
}

async function getChatAttachmentUrl(path) {
    if (!path || !supabaseClient) return "";

    const { data, error } = await supabaseClient.storage
        .from(CHAT_ATTACHMENT_BUCKET)
        .createSignedUrl(path, 60 * 60);

    if (error) {
        console.error("CHAT ATTACHMENT URL ERROR:", error);
        return "";
    }

    return data?.signedUrl || "";
}

function parseMessageContent(content) {
    if (typeof content !== "string") return { text: "", attachment: null, reply: null };

    const wrapperPrefix = "__AFTERHOURS_MESSAGE__:";
    const attachmentPrefix = "__AFTERHOURS_ATTACHMENT__:";
    const prefix = content.startsWith(wrapperPrefix)
        ? wrapperPrefix
        : content.startsWith(attachmentPrefix)
            ? attachmentPrefix
            : "";

    if (!prefix) return { text: content, attachment: null, reply: null };

    try {
        const payload = JSON.parse(content.slice(prefix.length));
        return {
            text: payload.text || "",
            attachment: payload.attachment || null,
            reply: payload.reply || null
        };
    } catch (error) {
        console.error("Invalid message content:", error);
        return { text: content, attachment: null, reply: null };
    }
}

function buildMessageContent(text, attachment = null, reply = null) {
    if (!attachment && !reply) return text;

    return "__AFTERHOURS_MESSAGE__:" + JSON.stringify({
        text: text || "",
        attachment: attachment || null,
        reply: reply || null
    });
}

async function appendAttachmentToMessage(content, file, reply = null) {
    let uploaded = null;

    if (file) {
        uploaded = await uploadChatAttachment(file);
    }

    return buildMessageContent(content, uploaded, reply);
}

function clearMessageAction() {
    replyingToMessage = null;
    editingMessageId = null;

    const bar = get("messageActionBar");
    const input = get("messageInput");

    if (bar) {
        bar.innerHTML = "";
        bar.classList.add("hidden");
    }

    if (input) {
        input.placeholder = currentChatMode === "dm"
            ? "Message..."
            : "Message " + (rooms[currentRoom]?.title?.replace(/^..\s*/, "") || "General") + "...";
    }
}

function showMessageAction(type, message, text = "") {
    const bar = get("messageActionBar");
    const input = get("messageInput");
    if (!bar || !input) return;

    bar.innerHTML = "";

    const copy = document.createElement("div");
    copy.className = "message-action-copy";

    const title = document.createElement("strong");
    title.textContent = type === "edit" ? "Editing message" : "Replying to @" + (message.username || "user");

    const preview = document.createElement("span");
    preview.textContent = text || "Attachment";

    copy.append(title, preview);

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "message-action-cancel";
    cancel.textContent = "×";
    cancel.title = "Cancel";
    cancel.addEventListener("click", clearMessageAction);

    bar.append(copy, cancel);
    bar.classList.remove("hidden");
    input.placeholder = type === "edit" ? "Edit message..." : "Write a reply...";
    input.focus();
}

function startReply(message, profile, parsedContent) {
    replyingToMessage = {
        id: message.id || "",
        username: profile?.username || "user",
        displayName: profile?.display_name || profile?.displayName || profile?.username || "User",
        text: parsedContent?.text || ""
    };
    editingMessageId = null;
    showMessageAction("reply", replyingToMessage, replyingToMessage.text);
}

function startEditingMessage(message, parsedContent) {
    if (!message?.id || message.user_id !== currentUser.id) return;

    editingMessageId = message.id;
    replyingToMessage = null;

    const input = get("messageInput");
    if (input) input.value = parsedContent?.text || "";

    showMessageAction("edit", { username: currentUser.username }, parsedContent?.text || "");
}

async function editMessage(messageId, newText) {
    if (!messageId || !supabaseClient) return false;

    const existing = document.querySelector('[data-message-id="' + messageId + '"]');
    if (!existing) return false;

    try {
        const currentContent = existing.dataset.rawContent || newText;
        const parsed = parseMessageContent(currentContent);
        const content = buildMessageContent(newText, parsed.attachment, parsed.reply);

        const { data, error } = await supabaseClient.rpc("afterhours_edit_message", {
            p_message_id: messageId,
            p_new_content: content
        });

        if (error) throw error;

        // The RPC saves the edit in Supabase, but do not depend on the RPC
        // response shape or on Realtime UPDATE arriving on this browser.
        // Reload the current room immediately so the edited text appears
        // without requiring a page refresh.
        await loadMessages();

        const input = get("messageInput");
        if (input) input.value = "";
        clearMessageAction();
        return true;
    } catch (error) {
        console.error("Edit message failed:", error);
        alert(error.message || "Unable to edit your message.");
        return false;
    }
}

// ============================================================
// REALTIME ONLINE PRESENCE
// ============================================================

let onlinePresenceChannel = null;

// ============================================================
// NOTIFICATIONS
// ============================================================

let notifications = [];
let notificationsChannel = null;

function notificationIcon(type) {
    if (type === "dm") return "💬";
    if (type === "friend_request") return "👥";
    if (type === "mention") return "🏷️";
    return "🔔";
}

function formatNotificationTime(timestamp) {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + "m ago";
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + "h ago";
    const days = Math.floor(hours / 24);
    return days + "d ago";
}

function notificationAllowedBySettings(notification) {
    const settings = getAccountSettings();
    if (!notification) return false;
    if (notification.type === "friend_request" && settings.friendNotifications === false) return false;
    if ((notification.type === "dm" || notification.type === "mention") && settings.messageNotifications === false) return false;
    return true;
}

function renderNotifications() {
    const list = get("notificationsList");
    const badge = get("notificationBadge");
    if (!list) return;
    const visibleNotifications = notifications.filter(notificationAllowedBySettings);
    const unread = visibleNotifications.filter(n => !n.read);
    if (badge) {
        badge.textContent = unread.length > 99 ? "99+" : String(unread.length);
        badge.classList.toggle("hidden", unread.length === 0);
    }
    list.innerHTML = "";
    if (!visibleNotifications.length) {
        const empty = document.createElement("div");
        empty.className = "notification-empty";
        empty.textContent = "You're all caught up.";
        list.appendChild(empty);
        return;
    }
    visibleNotifications.forEach(n => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "notification-item" + (n.read ? "" : " unread");
        const icon = document.createElement("span");
        icon.className = "notification-icon";
        icon.textContent = notificationIcon(n.type);
        const copy = document.createElement("span");
        copy.className = "notification-copy";
        const text = document.createElement("span");
        text.className = "notification-text";
        text.textContent = n.message || "You have a new notification.";
        const time = document.createElement("span");
        time.className = "notification-time";
        time.textContent = formatNotificationTime(n.created_at);
        copy.appendChild(text); copy.appendChild(time);
        item.appendChild(icon); item.appendChild(copy);
        item.addEventListener("click", () => handleNotificationClick(n));
        list.appendChild(item);
    });
}

async function loadNotifications() {
    if (!supabaseClient || !currentUser.id) return;
    const { data, error } = await supabaseClient
        .from("notifications")
        .select("id, recipient_id, actor_id, type, message, reference_id, read, created_at")
        .eq("recipient_id", currentUser.id)
        .order("created_at", { ascending: false })
        .limit(50);
    if (error) { console.error("Unable to load notifications:", error); return; }
    notifications = data || [];
    renderNotifications();
}

function subscribeToNotifications() {
    if (!supabaseClient || !currentUser.id || notificationsChannel) return;
    notificationsChannel = supabaseClient
        .channel("afterhours-notifications-" + currentUser.id)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: "recipient_id=eq." + currentUser.id }, payload => {
            if (!payload.new) return;
            notifications = [payload.new, ...notifications.filter(n => n.id !== payload.new.id)].slice(0, 50);
            renderNotifications();
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter: "recipient_id=eq." + currentUser.id }, payload => {
            if (!payload.new) return;
            notifications = notifications.map(n => n.id === payload.new.id ? payload.new : n);
            renderNotifications();
        })
        .subscribe(status => {
            consoleEvent("Notifications realtime: " + status, status === "CHANNEL_ERROR" ? "error" : "log");
        });
}

async function markAllNotificationsRead() {
    if (!supabaseClient || !currentUser.id) return;
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (!unreadIds.length) return;
    const { error } = await supabaseClient.from("notifications").update({ read: true }).in("id", unreadIds);
    if (error) { console.error("Unable to mark notifications read:", error); return; }
    notifications = notifications.map(n => ({ ...n, read: true }));
    renderNotifications();
}

async function markNotificationRead(id) {
    if (!supabaseClient || !id) return;
    const { error } = await supabaseClient.from("notifications").update({ read: true }).eq("id", id);
    if (error) { console.error("Unable to mark notification read:", error); return; }
    notifications = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    renderNotifications();
}

async function handleNotificationClick(notification) {
    await markNotificationRead(notification.id);
    if (notification.type === "dm" && notification.reference_id) {
        const { data: conversation } = await supabaseClient
            .from("dm_conversations")
            .select("id, participant_one, participant_two")
            .eq("id", notification.reference_id)
            .maybeSingle();
        if (conversation) {
            const otherId = conversation.participant_one === currentUser.id ? conversation.participant_two : conversation.participant_one;
            const { data: user } = await supabaseClient.from("profiles")
                .select("id, username, display_name, bio, avatar_url, role")
                .eq("id", otherId).maybeSingle();
            if (user) {
                toggleNotifications(false);
                showMessagesView();
                await openDmConversation(conversation.id, user);
            }
        }
    }
}

function toggleNotifications(force) {
    const panel = get("notificationsPanel");
    const button = get("notificationsButton");
    if (!panel || !button) return;
    const open = typeof force === "boolean" ? force : panel.classList.contains("hidden");
    panel.classList.toggle("hidden", !open);
    button.setAttribute("aria-expanded", String(open));
}

async function stopNotificationsRealtime() {
    if (!supabaseClient || !notificationsChannel) return;
    try { await supabaseClient.removeChannel(notificationsChannel); } catch (err) { console.warn("Unable to remove notifications channel:", err); }
    notificationsChannel = null;
    notifications = [];
    renderNotifications();
}


// Staff diagnostics console. This is a client-side diagnostics tool;
// server-side permissions must remain the real security boundary.
const consoleEntries = [];
const MAX_CONSOLE_ENTRIES = 250;

const rankDefinitions = {
    Owner: {
        icon: "👑",
        className: "rank-owner",
        permissions: [
            "promote_users",
            "demote_users",
            "set_ranks",
            "manage_ranks",
            "view_staff_console",
            "create_rooms",
            "delete_rooms",
            "edit_any_room",
            "manage_room_permissions",
            "manage_staff",
            "ban_users",
            "unban_users",
            "mute_users",
            "unmute_users",
            "kick_users",
            "warn_users",
            "restrict_users",
            "delete_any_message",
            "handle_serious_reports",
            "manage_site_settings",
            "test_store_purchases"
        ]
    },

    Developer: {
        icon: "🛠️",
        className: "rank-developer",
        permissions: [
            "manage_site_settings",
            "mute_users",
            "kick_users",
            "ban_users"
        ]
    },

    Admin: {
        icon: "🔴",
        className: "rank-admin",
        permissions: [
            "manage_staff",
            "set_ranks",
            "create_rooms",
            "delete_rooms",
            "edit_any_room",
            "manage_room_permissions",
            "ban_users",
            "unban_users",
            "mute_users",
            "unmute_users",
            "kick_users",
            "warn_users",
            "restrict_users",
            "delete_any_message",
            "handle_serious_reports"
        ]
    },

    Moderator: {
        icon: "🔵",
        className: "rank-moderator",
        permissions: [
            "delete_messages",
            "mute_users",
            "kick_users",
            "warn_users",
            "temporary_ban_users",
            "handle_reports",
            "manage_conversations",
            "manage_rooms"
        ]
    },

    Helper: {
        icon: "🟢",
        className: "rank-helper",
        permissions: [
            "help_users",
            "answer_questions",
            "report_problems",
            "warn_users"
        ]
    },

    VIP: {
        icon: "⭐",
        className: "rank-vip",
        permissions: [
            "vip_badge",
            "vip_name_color",
            "premium_profile_perks",
            "create_premium_rooms"
        ]
    },

    "VIP+": {
        icon: "✨",
        className: "rank-vip-plus",
        permissions: [
            "vip_badge",
            "vip_name_color",
            "premium_profile_perks",
            "create_premium_rooms",
            "vip_plus_badge",
            "vip_plus_profile_themes",
            "vip_plus_chat_effects"
        ]
    },

    OG: {
        icon: "🌟",
        className: "rank-og",
        permissions: [
            "og_badge",
            "og_name_color",
            "early_member_perks"
        ]
    },

    Member: {
        icon: "⚪",
        className: "rank-member",
        permissions: [
            "chat",
            "manage_own_profile",
            "upload_profile_picture",
            "join_rooms",
            "send_messages"
        ]
    }
};


// Roles considered "staff" for viewing moderation panels.
// Actual enforcement remains server-side.
const STAFF_ROLES = [
    "Owner",
    "Developer",
    "Admin",
    "Moderator",
    "Helper"
];


// ============================================================
// STAFF CONSOLE
// ============================================================

function addConsoleEntry(type, value) {

    if (consoleEntries.length >= MAX_CONSOLE_ENTRIES) {
        consoleEntries.shift();
    }

    let text = "";

    try {
        if (typeof value === "string") {
            text = value;
        } else if (value instanceof Error) {
            text = value.stack || value.message || String(value);
        } else {
            text = JSON.stringify(value, null, 2);
        }
    } catch (_) {
        text = String(value);
    }

    consoleEntries.push({
        type,
        text,
        time: new Date().toLocaleTimeString()
    });

    renderConsoleEntries();
}

function consoleEvent(message, type = "log") {
    addConsoleEntry(type, message);
}

function consoleUserEvent(action, user) {
    const name =
        user?.display_name ||
        user?.username ||
        user?.user_id ||
        "Unknown user";

    consoleEvent(
        `User ${action}: ${name}`,
        action === "left" ? "log" : "log"
    );
}

function renderConsoleEntries() {

    const output = get("consoleOutput");

    if (!output) {
        return;
    }

    output.innerHTML = "";

    if (!consoleEntries.length) {
        const empty = document.createElement("div");
        empty.className = "console-entry log";
        empty.textContent = "Console ready. No errors recorded yet.";
        output.appendChild(empty);
        return;
    }

    consoleEntries.forEach(function (entry) {

        const row = document.createElement("div");
        row.className = "console-entry " + entry.type;

        const time = document.createElement("span");
        time.className = "console-time";
        time.textContent = "[" + entry.time + "] ";

        const text = document.createElement("span");
        text.textContent = entry.text;

        row.appendChild(time);
        row.appendChild(text);
        output.appendChild(row);
    });

    output.scrollTop = output.scrollHeight;
}

function canUseStaffConsole() {
    return STAFF_ROLES.includes(currentUser.role) ||
        hasPermission("view_staff_console") ||
        hasPermission("manage_staff") ||
        hasPermission("manage_ranks");
}

function openStaffConsole() {

    if (!canUseStaffConsole()) {
        addConsoleEntry("warn", "Console access denied for this account.");
        return false;
    }

    const panel = get("staffConsole");

    if (!panel) {
        return false;
    }

    panel.classList.remove("hidden");
    panel.setAttribute("aria-hidden", "false");
    renderConsoleEntries();

    return true;
}

function closeStaffConsole() {

    const panel = get("staffConsole");

    if (!panel) {
        return;
    }

    panel.classList.add("hidden");
    panel.setAttribute("aria-hidden", "true");
}

let broadcastMessage = "";
let broadcastChannel = null;

function renderBroadcast() {
    const el = get("broadcastMessage");
    if (!el) return;
    el.textContent = broadcastMessage;
    el.classList.toggle("hidden", !broadcastMessage);
    el.title = broadcastMessage || "No broadcast";
}

async function loadBroadcast() {
    if (!supabaseClient) return;
    const { data, error } = await supabaseClient
        .from("afterhours_site_settings")
        .select("value")
        .eq("key", "broadcast")
        .maybeSingle();
    if (error) {
        if (error.code !== "42P01") console.warn("Broadcast load failed:", error);
        return;
    }
    broadcastMessage = data?.value || "";
    renderBroadcast();
}

function subscribeToBroadcast() {
    if (!supabaseClient) return;
    if (broadcastChannel) supabaseClient.removeChannel(broadcastChannel).catch(() => {});
    broadcastChannel = supabaseClient
        .channel("afterhours-broadcast")
        .on("postgres_changes", {
            event: "*", schema: "public", table: "afterhours_site_settings",
            filter: "key=eq.broadcast"
        }, payload => {
            broadcastMessage = payload.new?.value || "";
            renderBroadcast();
        })
        .subscribe();
}

async function saveBroadcast() {
    const input = get("broadcastInput");
    if (!input || !supabaseClient) return;
    const value = input.value.trim().slice(0, 180);
    const { error } = await supabaseClient.rpc("afterhours_set_broadcast", {
        p_value: value
    });
    if (error) {
        console.error("Broadcast save failed:", error);
        alert(error.message || "Unable to save broadcast.");
        return;
    }
    broadcastMessage = value;
    renderBroadcast();
    closeBroadcastEditor();
}

function openBroadcastEditor() {
    if (!hasPermission("manage_site_settings") && currentUser.role !== "Owner") {
        alert("You do not have permission to edit the broadcast.");
        return false;
    }
    const modal = get("broadcastModal");
    const input = get("broadcastInput");
    if (!modal || !input) return false;
    input.value = broadcastMessage;
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    setTimeout(() => input.focus(), 30);
    return true;
}

function closeBroadcastEditor() {
    const modal = get("broadcastModal");
    if (!modal) return;
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
}

// ============================================================
// BROWSER NOTIFICATIONS
// ============================================================

const AFTERHOURS_BROWSER_NOTIFICATION_MUTE_KEY = "afterhours_browser_notifications_muted";

function areBrowserNotificationsMuted() {
    return localStorage.getItem(AFTERHOURS_BROWSER_NOTIFICATION_MUTE_KEY) === "true";
}

function setBrowserNotificationsMuted(muted) {
    localStorage.setItem(AFTERHOURS_BROWSER_NOTIFICATION_MUTE_KEY, muted ? "true" : "false");
    updateBrowserNotificationUI();
}

function browserNotificationsSupported() {
    return typeof window !== "undefined" && "Notification" in window;
}

function browserNotificationStatusText() {
    if (!browserNotificationsSupported()) return "Not supported by this browser";
    if (areBrowserNotificationsMuted()) return "Muted by /mute notifications";
    if (Notification.permission === "granted") return "Enabled";
    if (Notification.permission === "denied") return "Blocked by browser";
    return "Not enabled";
}

function updateBrowserNotificationUI() {
    const button = document.getElementById("enableBrowserNotifications");
    const status = document.getElementById("browserNotificationStatus");
    if (status) status.textContent = browserNotificationStatusText();
    if (!button) return;

    const supported = browserNotificationsSupported();
    const granted = supported && Notification.permission === "granted";
    const muted = areBrowserNotificationsMuted();

    button.disabled = !supported || (!muted && granted) || Notification.permission === "denied";
    button.textContent = granted && !muted ? "✓ Browser notifications enabled" : "Enable browser notifications";
}

async function requestBrowserNotificationPermission() {
    if (!browserNotificationsSupported()) {
        alert("Browser notifications are not supported by this browser.");
        return false;
    }

    if (Notification.permission === "granted") {
        setBrowserNotificationsMuted(false);
        return true;
    }

    if (Notification.permission === "denied") {
        alert("Browser notifications are blocked. Allow them for Afterhours in your browser site settings, then try again.");
        updateBrowserNotificationUI();
        return false;
    }

    try {
        const permission = await Notification.requestPermission();
        updateBrowserNotificationUI();
        return permission === "granted";
    } catch (err) {
        console.error("Unable to request browser notification permission:", err);
        return false;
    }
}

function showBrowserNotification(notification) {
    if (!notification || !browserNotificationsSupported()) return;
    if (!notificationAllowedBySettings(notification)) return;
    if (areBrowserNotificationsMuted()) return;
    if (Notification.permission !== "granted") return;

    // Only pop a browser notification when Afterhours is not the active page.
    // The in-site notification counter still updates while the page is active.
    if (!document.hidden && document.hasFocus()) return;

    const title = "Afterhours";
    const body = notification.message || "You have a new notification.";
    const icon = notificationTypeIcon(notification.type);

    try {
        const browserNotification = new Notification(`${icon} ${title}`, {
            body,
            tag: `afterhours-notification-${notification.id || Date.now()}`,
            renotify: true
        });

        browserNotification.onclick = () => {
            window.focus();
            if (typeof handleNotificationClick === "function") {
                handleNotificationClick(notification).catch(() => {});
            }
            browserNotification.close();
        };
    } catch (err) {
        console.error("Unable to show browser notification:", err);
    }
}

function setupBrowserNotificationControls() {
    const button = document.getElementById("enableBrowserNotifications");
    if (button && button.dataset.browserNotificationsBound !== "true") {
        button.dataset.browserNotificationsBound = "true";
        button.addEventListener("click", requestBrowserNotificationPermission);
    }
    updateBrowserNotificationUI();
}

function handleChatCommand(text) {

    if (!text.startsWith("/")) {
        return false;
    }

    const command =
        text.trim().split(/\s+/)[0].toLowerCase();

    if (command === "/console") {
        consoleEvent(
            "Staff console opened by " +
            (currentUser.username || currentUser.displayName || "staff"),
            "log"
        );
        openStaffConsole();
        return true;
    }

    if (command === "/closeconsole") {
        closeStaffConsole();
        return true;
    }

    if (command === "/editor") {
        openEditor();
        return true;
    }

    if (command === "/closeeditor") {
        closeEditor();
        return true;
    }

    if (command === "/broadcast") {
        openBroadcastEditor();
        return true;
    }

    if (command === "/closebroadcast") {
        closeBroadcastEditor();
        return true;
    }

    if (command === "/mute" && text.trim().toLowerCase() === "/mute notifications") {
        setBrowserNotificationsMuted(true);
        alert("Browser notifications muted. Your Afterhours notification counter will still work.");
        return true;
    }

    if (command === "/unmute" && text.trim().toLowerCase() === "/unmute notifications") {
        setBrowserNotificationsMuted(false);
        if (browserNotificationsSupported() && Notification.permission === "default") {
            void requestBrowserNotificationPermission();
        } else {
            alert("Browser notifications unmuted.");
        }
        return true;
    }

    // Unknown slash commands are kept out of public chat for now.
    // This gives us room to add /mute, /ban, etc. later without
    // exposing command text as a normal message.
    return false;
}

document.addEventListener("visibilitychange", function () {
    consoleEvent(
        document.hidden
            ? "Browser tab became inactive."
            : "Browser tab became active.",
        "log"
    );
});


function setupStaffConsole() {

    const closeButton = get("closeConsoleButton");
    const clearButton = get("clearConsoleButton");
    const panel = get("staffConsole");

    if (closeButton) {
        closeButton.addEventListener("click", closeStaffConsole);
    }

    if (clearButton) {
        clearButton.addEventListener("click", function () {
            consoleEntries.length = 0;
            renderConsoleEntries();
        });
    }

    if (panel) {
        panel.addEventListener("click", function (event) {
            if (event.target === panel) {
                closeStaffConsole();
            }
        });
    }

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            closeStaffConsole();
        }
    });

    window.addEventListener("error", function (event) {
        addConsoleEntry(
            "error",
            event.error || event.message || "Unknown JavaScript error"
        );
    });

    window.addEventListener("unhandledrejection", function (event) {
        addConsoleEntry(
            "error",
            event.reason || "Unhandled promise rejection"
        );
    });
}

// Keep a diagnostics copy while still allowing the browser console to work.
(function setupConsoleCapture() {

    const originalError = console.error.bind(console);
    const originalWarn = console.warn.bind(console);
    const originalLog = console.log.bind(console);

    console.error = function (...args) {
        originalError(...args);
        addConsoleEntry("error", args.map(String).join(" "));
    };

    console.warn = function (...args) {
        originalWarn(...args);
        addConsoleEntry("warn", args.map(String).join(" "));
    };

    console.log = function (...args) {
        originalLog(...args);
        addConsoleEntry("log", args.map(String).join(" "));
    };
})();


// ============================================================
// MODERATION ACTIONS
// ============================================================

const ROLE_LEVELS = {
    Member: 0,
    OG: 0,
    VIP: 0,
    "VIP+": 0,
    Helper: 1,
    Moderator: 2,
    Admin: 3,
    Developer: 4,
    Owner: 5
};

const MODERATION_ACTIONS = {

    Owner: [
        {
            id: "mute",
            label: "🔇 Mute",
            permission: "mute_users"
        },
        {
            id: "kick",
            label: "👢 Kick",
            permission: "kick_users"
        },
        {
            id: "ban",
            label: "🔨 Ban",
            permission: "ban_users"
        },
        {
            id: "warn",
            label: "⚠️ Warn",
            permission: "warn_users"
        },
        {
            id: "restrict",
            label: "🚫 Restrict",
            permission: "restrict_users"
        },
        {
            id: "delete_messages",
            label: "🗑️ Delete Messages",
            permission: "delete_any_message"
        },
        {
            id: "change_role",
            label: "🛡️ Change Role",
            permission: "set_ranks"
        }
    ],

    Developer: [
        {
            id: "mute",
            label: "🔇 Mute",
            permission: "mute_users"
        },
        {
            id: "kick",
            label: "👢 Kick",
            permission: "kick_users"
        },
        {
            id: "ban",
            label: "🔨 Ban",
            permission: "ban_users"
        }
    ],

    Admin: [
        {
            id: "mute",
            label: "🔇 Mute",
            permission: "mute_users"
        },
        {
            id: "kick",
            label: "👢 Kick",
            permission: "kick_users"
        },
        {
            id: "ban",
            label: "🔨 Ban",
            permission: "ban_users"
        },
        {
            id: "warn",
            label: "⚠️ Warn",
            permission: "warn_users"
        },
        {
            id: "restrict",
            label: "🚫 Restrict",
            permission: "restrict_users"
        },
        {
            id: "delete_messages",
            label: "🗑️ Delete Messages",
            permission: "delete_any_message"
        },
        {
            id: "change_role",
            label: "🛡️ Change Role",
            permission: "set_ranks"
        }
    ],

    Moderator: [
        {
            id: "mute",
            label: "🔇 Mute",
            permission: "mute_users"
        },
        {
            id: "kick",
            label: "👢 Kick",
            permission: "kick_users"
        },
        {
            id: "warn",
            label: "⚠️ Warn",
            permission: "warn_users"
        },
        {
            id: "delete_messages",
            label: "🗑️ Delete Messages",
            permission: "delete_messages"
        }
    ],

    Helper: [
        {
            id: "warn",
            label: "⚠️ Warn",
            permission: "warn_users"
        }
    ]
};


// ============================================================
// HELPER
// ============================================================

function get(id) {
    return document.getElementById(id);
}


function getRankDefinition(role) {
    return rankDefinitions[role] || rankDefinitions.Member;
}


function getEffectiveRole(profile, authUser) {

    const userId =
        (profile && profile.id) ||
        (authUser && authUser.id);

    if (userId === OWNER_USER_ID) {
        return "Owner";
    }

    return (profile && profile.role) || "Member";
}


function hasPermission(permission) {

    if (currentUser.role === "Owner") {
        return true;
    }

    return getRankDefinition(currentUser.role)
        .permissions
        .includes(permission);
}


// Refresh the logged-in user's profile after server-side changes
// (such as Store Test Mode) without relying on a missing helper.
async function loadCurrentUser() {

    if (!supabaseClient) {
        throw new Error("Supabase is not available.");
    }

    const { data: authData, error: authError } =
        await supabaseClient.auth.getUser();

    if (authError) throw authError;

    const user = authData?.user;

    if (!user) {
        throw new Error("No logged-in user found.");
    }

    let profile;
    let profileError;
    {
        const result = await supabaseClient
            .from("profiles")
            .select("id, username, display_name, bio, avatar_url, role, settings")
            .eq("id", user.id)
            .single();
        profile = result.data;
        profileError = result.error;
    }

    if (profileError && (profileError.code === "42703" || profileError.code === "PGRST204" || /settings/i.test(profileError.message || ""))) {
        const fallback = await supabaseClient
            .from("profiles")
            .select("id, username, display_name, bio, avatar_url, role")
            .eq("id", user.id)
            .single();
        profile = fallback.data;
        profileError = fallback.error;
    }

    if (profileError) throw profileError;
    if (!profile) throw new Error("Your profile could not be loaded.");

    let localSettings = {};
    try { localSettings = JSON.parse(localStorage.getItem(AFTERHOURS_SETTINGS_KEY) || "{}") || {}; } catch (_) {}
    const serverSettings = profile.settings && typeof profile.settings === "object" ? profile.settings : {};
    const mergedSettings = { ...serverSettings, ...localSettings };
    localStorage.setItem(AFTERHOURS_SETTINGS_KEY, JSON.stringify(mergedSettings));

    currentUser = {
        id: profile.id,
        username: profile.username || "",
        displayName: profile.display_name || "",
        bio: profile.bio || "No bio yet.",
        avatarUrl:
            profile.avatar_url ||
            localStorage.getItem("afterhours-avatar-" + profile.id) ||
            "",
        role: getEffectiveRole(profile, user),
        accountSettings: mergedSettings,
        muted: Boolean(currentUser.muted),
        restricted: Boolean(currentUser.restricted)
    };

    applyAccountPreferences(mergedSettings);
    updateUser();
    renderStoreTestControls();

    return currentUser;
}


function applyRank(element, role) {
    if (!element) return;

    const rank = getRankDefinition(role);

    element.className = element.className
        .split(" ")
        .filter(className => !className.startsWith("rank-") && className !== "custom-rank")
        .concat(rank.className || "rank-member")
        .join(" ");

    element.style.color = rank.color || "";

    // Custom ranks use their configured color as a readable dark filled pill,
    // matching the filled treatment used by built-in ranks such as Owner.
    if (rank.className === "custom-rank" && rank.color) {
        const hex = String(rank.color).replace("#", "");
        const normalized = hex.length === 3
            ? hex.split("").map(ch => ch + ch).join("")
            : hex;
        const r = parseInt(normalized.slice(0, 2), 16);
        const g = parseInt(normalized.slice(2, 4), 16);
        const b = parseInt(normalized.slice(4, 6), 16);

        if ([r, g, b].every(Number.isFinite)) {
            element.style.backgroundColor = `rgba(${r}, ${g}, ${b}, 0.24)`;
            element.style.borderColor = rank.color;
        }
    } else {
        element.style.backgroundColor = "";
        element.style.borderColor = "";
    }

    element.textContent = (rank.icon || rank.badge || "🏷️") + " " + (role || "Member");
}


// ============================================================
// PAGE SWITCHING
// ============================================================

function hideAllPages() {

    [
        "landingPage",
        "loginPage",
        "registerPage",
        "chatPage"
    ].forEach(function (id) {

        const el = get(id);

        if (el) {
            el.classList.add("hidden");
        }
    });
}


function showLanding() {

    hideAllPages();

    const page = get("landingPage");

    if (page) {
        page.classList.remove("hidden");
    }
}


function showLogin() {

    hideAllPages();

    const page = get("loginPage");

    if (page) {
        page.classList.remove("hidden");
    }

    setTimeout(function () {

        const input = get("loginEmail");

        if (input) {
            input.focus();
        }

    }, 50);
}


function showRegister() {

    hideAllPages();

    const page = get("registerPage");

    if (page) {
        page.classList.remove("hidden");
    }

    setTimeout(function () {

        const input = get("registerUsername");

        if (input) {
            input.focus();
        }

    }, 50);
}


function showChat() {

    // Showing the chat UI must never be allowed to turn a successful
    // authentication into a generic "login failed" message.  Optional
    // realtime/database features are initialized independently.
    hideAllPages();

    const page = get("chatPage");

    if (page) {
        page.classList.remove("hidden");
    }

    currentChatMode = "room";
    currentDmConversationId = null;
    currentDmUser = null;

    const safe = (label, fn) => {
        try {
            const result = fn();
            if (result && typeof result.catch === "function") {
                result.catch(err => console.error("Afterhours " + label + " failed:", err));
            }
        } catch (err) {
            console.error("Afterhours " + label + " failed:", err);
        }
    };

    safe("DM cleanup", () => stopDmRealtime());
    safe("DM inbox cleanup", () => stopDmInboxRealtime());
    safe("rooms sidebar", () => showRoomsSidebar());
    safe("user UI", () => updateUser());
    safe("online presence", () => startOnlinePresence());
    safe("notifications", () => loadNotifications());
    safe("notification realtime", () => subscribeToNotifications());
    safe("broadcast", () => loadBroadcast());
    safe("broadcast realtime", () => subscribeToBroadcast());
    safe("friends", () => loadFriends());
    safe("friends realtime", () => subscribeToFriends());
    safe("room realtime", () => subscribeToRoomMessages());
    safe("messages", () => loadMessages());
    safe("DM conversations", () => loadDmConversations());
    safe("moderation status", () => checkModerationStatus());
}


// ============================================================
// AUTH
// ============================================================

async function login() {

    if (!supabaseClient) {
        alert("Login is currently unavailable. Please try again later.");
        return;
    }

    const loginIdentifier = get("loginEmail").value.trim();
    const password = get("loginPassword").value;

    if (!loginIdentifier) {
        alert("Please enter your email or username.");
        return;
    }

    if (!password) {
        alert("Please enter your password.");
        return;
    }

    const button = get("loginSubmit");

    button.disabled = true;
    button.textContent = "Logging in...";

    try {

        let data;
        let error;

        // Supabase Auth natively accepts email/password, so usernames
        // are resolved through the secure Edge Function instead of
        // exposing auth emails to the browser.
        if (loginIdentifier.includes("@")) {

            ({ data, error } =
                await supabaseClient.auth.signInWithPassword({
                    email: loginIdentifier,
                    password: password
                }));

        } else {

            const result =
                await supabaseClient.functions.invoke(
                    "login-by-username",
                    {
                        body: {
                            username: loginIdentifier,
                            password: password
                        }
                    }
                );

            error = result.error;

            if (error && result.data?.error) {
                error = new Error(result.data.error);
            }

            if (!error && result.data?.session) {

                const sessionResult =
                    await supabaseClient.auth.setSession(
                        result.data.session
                    );

                data = sessionResult.data;
                error = sessionResult.error;

            } else if (!error) {

                error = new Error(
                    result.data?.error ||
                    "Username login failed."
                );
            }
        }

        if (error) {

            console.error(error);

            alert(
                error.message ||
                "Invalid username/email or password."
            );

            return;
        }

        const user = data.user;

        if (!user) {

            alert("Login failed.");

            return;
        }

        if (!user.email_confirmed_at) {

            await supabaseClient.auth.signOut();

            alert(
                "Please verify your email before logging in."
            );

            return;
        }

        const {
            data: profile,
            error: profileError
        } = await supabaseClient
            .from("profiles")
            .select(
                "id, username, display_name, bio, avatar_url, role"
            )
            .eq("id", user.id)
            .single();

        if (profileError || !profile) {

            console.error(profileError);

            alert(
                "Your account exists, but your profile could not be loaded."
            );

            return;
        }

        currentUser = {

            id:
                profile.id,

            username:
                profile.username,

            displayName:
                profile.display_name,

            bio:
                profile.bio || "No bio yet.",

            avatarUrl:
                profile.avatar_url ||
                localStorage.getItem(
                    "afterhours-avatar-" +
                    profile.id
                ) ||
                "",

            role:
                getEffectiveRole(profile, user),

            muted:
                false,

            restricted:
                false
        };

        updateUser();

        // These are post-login enhancements.  A failure in a custom-role,
        // custom-room, or chat startup request must not invalidate auth.
        try { await loadCustomRoles(); }
        catch (err) { console.error("Custom roles startup failed:", err); }

        try { await loadCustomRooms(); }
        catch (err) { console.error("Custom rooms startup failed:", err); }

        showChat();

    } catch (err) {

        console.error("Login failed:", err);

        alert(
            err?.message ||
            "Something went wrong during login."
        );

    } finally {

        button.disabled = false;
        button.textContent = "Log In";
    }
}


async function register() {

    if (!supabaseClient) {

        alert(
            "Registration is currently unavailable. Please try again later."
        );

        return;
    }

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

    if (username.length < 3) {
        alert("Username must be at least 3 characters.");
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
        alert("Password must be at least 8 characters.");
        return;
    }

    const button = get("registerSubmit");

    button.disabled = true;
    button.textContent = "Creating account...";

    try {

        const {
            data: existing,
            error: checkError
        } = await supabaseClient
            .from("profiles")
            .select("id")
            .eq("username", username)
            .maybeSingle();

        if (checkError) {

            console.error(checkError);

            alert(
                "Unable to check username availability."
            );

            return;
        }

        if (existing) {

            alert(
                "That username is already taken."
            );

            return;
        }

        const {
            data,
            error
        } = await supabaseClient.auth.signUp({

            email:
                email,

            password:
                password,

            options: {

                data: {
                    username:
                        username,

                    display_name:
                        username
                }
            }
        });

        if (error) {

            console.error(error);

            alert(error.message);

            return;
        }

        if (!data.user) {

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

    } catch (err) {

        console.error(err);

        alert(
            "Something went wrong during registration."
        );

    } finally {

        button.disabled = false;
        button.textContent = "Create Account";
    }
}


async function logout() {

    await stopNotificationsRealtime();
    await stopOnlinePresence();
    await stopRoomMessageRealtime();
    await stopDmRealtime();

    if (supabaseClient) {
        await supabaseClient.auth.signOut();
    }

    currentChatMode = "room";
    currentDmConversationId = null;
    currentDmUser = null;
    viewedProfileUser = null;

    currentUser = {

        id: null,

        username: "",

        displayName: "",

        bio: "",

        avatarUrl: "",

        role: "Member",

        muted: false,

        restricted: false
    };

    showLanding();
}


// ============================================================
// AVATARS
// ============================================================

function updateAvatar(element, name, avatarUrl) {

    if (!element) {
        return;
    }

    element.innerHTML = "";

    if (avatarUrl) {

        const image =
            document.createElement("img");

        image.src =
            avatarUrl;

        image.alt =
            name + "'s profile picture";

        image.loading =
            "lazy";

        image.onerror =
            function () {

                element.innerHTML = "";

                element.textContent =
                    name.charAt(0).toUpperCase();
            };

        element.appendChild(
            image
        );

        return;
    }

    element.textContent =
        name.charAt(0).toUpperCase();
}


function saveLocalAvatar(file, status) {

    return new Promise(
        function (resolve, reject) {

            const reader =
                new FileReader();

            reader.addEventListener(
                "load",
                function () {

                    const avatarUrl =
                        reader.result;

                    try {

                        localStorage.setItem(
                            "afterhours-avatar-" +
                            currentUser.id,
                            avatarUrl
                        );

                    } catch (error) {

                        reject(error);

                        return;
                    }

                    currentUser.avatarUrl =
                        avatarUrl;

                    updateUser();

                    updateAvatar(
                        get("editAvatarPreview"),
                        currentUser.displayName ||
                        currentUser.username ||
                        "User",
                        avatarUrl
                    );

                    loadMessages();

                    if (status) {

                        status.textContent =
                            "Saved on this device.";
                    }

                    resolve();
                }
            );

            reader.addEventListener(
                "error",
                reject
            );

            reader.readAsDataURL(file);
        }
    );
}


// ============================================================
// USER UI
// ============================================================

function updateUser() {

    const name =
        currentUser.displayName ||
        currentUser.username ||
        "User";

    if (get("topUsername")) {

        get("topUsername").textContent =
            name;
    }

    if (get("profileName")) {

        get("profileName").textContent =
            name;
    }

    if (get("profileUsername")) {

        get("profileUsername").textContent =
            "@" +
            (currentUser.username || "user");
    }

    if (get("profileRole")) {

        applyRank(
            get("profileRole"),
            currentUser.role
        );
    }

    if (get("profileBio")) {

        get("profileBio").textContent =
            currentUser.bio ||
            "No bio yet.";
    }

    updateAvatar(
        get("profileAvatar"),
        name,
        currentUser.avatarUrl
    );

    updateAvatar(
        get("sidebarAvatar"),
        name,
        currentUser.avatarUrl
    );
}


function updateTypingPreferenceUI() {
    const indicator = get("typingIndicator");
    if (indicator) indicator.classList.toggle("hidden", getAccountSettings().typing === false);
}

let typingStopTimer = null;
async function updateOwnTypingState(isTyping) {
    if (!onlinePresenceChannel || !currentUser?.id || getAccountSettings().typing === false) return;
    try {
        await onlinePresenceChannel.track({
            user_id: currentUser.id,
            username: currentUser.username,
            display_name: currentUser.displayName,
            avatar_url: currentUser.avatarUrl,
            bio: currentUser.bio,
            role: currentUser.role,
            typing: Boolean(isTyping)
        });
    } catch (_) {}
}

function renderTypingIndicatorFromPresence() {
    const indicator = get("typingIndicator");
    if (!indicator || getAccountSettings().typing === false) { indicator?.classList.add("hidden"); return; }
    const state = onlinePresenceChannel?.presenceState?.() || {};
    const names = [];
    Object.values(state).flat().forEach(entry => {
        if (entry?.typing && entry.user_id !== currentUser?.id) names.push(entry.display_name || entry.username || "Someone");
    });
    const unique = [...new Set(names)];
    if (!unique.length) { indicator.classList.add("hidden"); return; }
    indicator.textContent = unique.length === 1 ? `${unique[0]} is typing...` : `${unique.slice(0,2).join(" and ")}${unique.length > 2 ? ` and ${unique.length - 2} others` : ""} are typing...`;
    indicator.classList.remove("hidden");
}

async function startOnlinePresence() {

    if (getAccountSettings().showOnline === false) {
        updateOnlineUsers([]);
        return;
    }

    if (
        !supabaseClient ||
        !currentUser.id
    ) {
        return;
    }

    // Prevent duplicate presence channels.
    if (onlinePresenceChannel) {
        return;
    }

    const channel =
        supabaseClient.channel(
            "afterhours-online",
            {
                config: {
                    presence: {
                        key: currentUser.id
                    }
                }
            }
        );

    onlinePresenceChannel = channel;

    const renderPresence =
        function () {
            const state =
                channel.presenceState();

            const users = [];

            Object.keys(state).forEach(
                function (key) {

                    const entries =
                        state[key] || [];

                    entries.forEach(
                        function (entry) {

                            if (
                                !entry ||
                                !entry.user_id
                            ) {
                                return;
                            }

                            // Avoid duplicate users if the same
                            // account has multiple presence metas.
                            if (
                                users.some(
                                    function (existing) {
                                        return (
                                            existing.user_id ===
                                            entry.user_id
                                        );
                                    }
                                )
                            ) {
                                return;
                            }

                            users.push(entry);
                        }
                    );
                }
            );

            // Keep the current user's own presence visible too.
            updateOnlineUsers(users);
            renderTypingIndicatorFromPresence();
        };

    channel.on(
        "presence",
        {
            event: "sync"
        },
        renderPresence
    );

    channel.on(
        "presence",
        {
            event: "join"
        },
        function (payload) {
            const joined = payload?.newPresences || [];
            joined.forEach(function (entry) {
                consoleUserEvent("joined", entry);
            });
            renderPresence();
        }
    );

    channel.on(
        "presence",
        {
            event: "leave"
        },
        function (payload) {
            const left = payload?.leftPresences || [];
            left.forEach(function (entry) {
                consoleUserEvent("left", entry);
            });
            renderPresence();
        }
    );

    const status =
        await channel.subscribe(
            async function (subscriptionStatus) {

                if (
                    subscriptionStatus !==
                    "SUBSCRIBED"
                ) {
                    console.warn(
                        "Online presence subscription status:",
                        subscriptionStatus
                    );
                    consoleEvent(
                        "Online presence status: " +
                        subscriptionStatus,
                        "warn"
                    );
                    return;
                }

                consoleEvent(
                    "Online presence connected.",
                    "log"
                );

                await channel.track({
                    user_id:
                        currentUser.id,

                    username:
                        currentUser.username,

                    display_name:
                        currentUser.displayName,

                    avatar_url:
                        currentUser.avatarUrl,
                    bio:
                        currentUser.bio,
                    role:
                        currentUser.role,
                    typing: false
                });

                renderPresence();
            }
        );

    if (
        status !== "SUBSCRIBED"
    ) {
        console.warn(
            "Unable to subscribe to online presence:",
            status
        );
    }
}


async function stopOnlinePresence() {

    if (
        !supabaseClient ||
        !onlinePresenceChannel
    ) {
        onlinePresenceChannel = null;
        updateOnlineUsers([]);
        return;
    }

    try {

        await onlinePresenceChannel.untrack();

    } catch (err) {

        console.warn(
            "Unable to untrack online presence:",
            err
        );
    }

    try {

        await supabaseClient.removeChannel(
            onlinePresenceChannel
        );

    } catch (err) {

        console.warn(
            "Unable to remove online presence channel:",
            err
        );
    }

    onlinePresenceChannel = null;

    updateOnlineUsers([]);
    const typingIndicator = get("typingIndicator");
    typingIndicator?.classList.add("hidden");
}


function updateOnlineUsers(
    onlineUsers
) {

    const container =
        get("onlineUsers");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    const users =
        Array.isArray(onlineUsers)
            ? onlineUsers
            : [];

    users.forEach(
        function (onlineUser) {

            const user =
                document.createElement("div");

            user.className =
                "online-user";

            user.tabIndex =
                0;

            user.setAttribute(
                "role",
                "button"
            );

            user.addEventListener(
                "click",
                function () {

                    // Presence payloads use snake_case, while the
                    // rest of Afterhours profiles use camelCase.
                    // Normalize the presence user before opening
                    // the profile modal so avatars, roles, bios,
                    // and the owner/staff controls still work.
                    openUserProfile({
                        id: onlineUser.user_id || onlineUser.id,
                        username: onlineUser.username || "user",
                        displayName:
                            onlineUser.display_name ||
                            onlineUser.displayName ||
                            onlineUser.username ||
                            "User",
                        bio: onlineUser.bio || "No bio yet.",
                        avatarUrl:
                            onlineUser.avatar_url ||
                            onlineUser.avatarUrl ||
                            "",
                        role: onlineUser.role || "member"
                    });

                }
            );

            user.addEventListener(
                "keydown",
                function (event) {

                    if (
                        event.key === "Enter" ||
                        event.key === " "
                    ) {

                        event.preventDefault();

                        openUserProfile(
                            onlineUser
                        );
                    }
                }
            );

            const dot =
                document.createElement("span");

            dot.className =
                "status-dot";

            const avatar =
                document.createElement("span");

            avatar.className =
                "avatar";

            updateAvatar(
                avatar,

                onlineUser.display_name ||
                onlineUser.username ||
                "User",

                onlineUser.avatar_url ||
                ""
            );

            const name =
                document.createElement("span");

            name.textContent =
                onlineUser.display_name ||
                onlineUser.username ||
                "User";

            user.appendChild(dot);
            user.appendChild(avatar);
            user.appendChild(name);

            container.appendChild(user);
        }
    );
}


// ============================================================
// PROFILE ACHIEVEMENTS
// ============================================================

const PROFILE_ACHIEVEMENTS = [
    { id: "first_night", icon: "🌙", name: "First Night", test: s => s.messages >= 1 },
    { id: "chatterbox", icon: "💬", name: "Chatterbox", test: s => s.messages >= 100 },
    { id: "social", icon: "👥", name: "Social Butterfly", test: s => s.friends >= 1 },
    { id: "gamer", icon: "🎮", name: "Gamer", test: s => s.gamingMessages >= 1 },
    { id: "talkative", icon: "💬", name: "Talkative", test: s => s.messages >= 1000 },
    { id: "music", icon: "🎵", name: "Music Lover", test: s => s.musicMessages >= 1 },
    { id: "explorer", icon: "🧭", name: "Explorer", test: s => s.rooms >= 3 },
    { id: "og", icon: "🏆", name: "OG", test: s => {
            const joined = s.createdAt ? new Date(s.createdAt).getTime() : NaN;
            const launch = new Date("2026-09-03T00:00:00Z").getTime();
            const windowEnd = launch + (10 * 86400000);
            return Number.isFinite(joined) && joined >= launch && joined < windowEnd;
        } },
    { id: "inbox", icon: "📨", name: "Inbox", test: s => s.dmMessages >= 1 },
    { id: "connected", icon: "🔔", name: "Connected", test: s => s.notifications >= 1 },
    { id: "say_cheese", icon: "📸", name: "Say Cheese", test: s => !!s.avatar },
    { id: "veteran", icon: "⭐", name: "Veteran", test: s => {
            const joined = s.createdAt ? new Date(s.createdAt).getTime() : NaN;
            const launch = new Date("2026-09-03T00:00:00Z").getTime();
            const windowEnd = launch + (50 * 86400000);
            return Number.isFinite(joined) && joined >= launch && joined < windowEnd;
        } },
    { id: "staff", icon: "🛡️", name: "Staff", test: s => ["Helper", "Moderator", "Admin", "Developer", "Owner"].includes(s.role) },
    { id: "supporter", icon: "💎", name: "Supporter", test: s => ["VIP", "VIP+", "Helper", "Moderator", "Admin", "Developer", "Owner"].includes(s.role) },
    { id: "custom_made", icon: "🎨", name: "Custom Made", test: s => !!s.isCustomRole }
];

async function loadProfileAchievementStats(user) {
    const stats = {
        messages: 0,
        gamingMessages: 0,
        musicMessages: 0,
        rooms: 0,
        friends: 0,
        dmMessages: 0,
        notifications: 0,
        avatar: !!user.avatarUrl,
        role: getEffectiveRole(user, user),
        accountAgeDays: 0,
        isCustomRole: false,
        createdAt: user.createdAt || user.created_at || null
    };

    if (!supabaseClient || !user?.id) return stats;

    try {
        const profileResult = await supabaseClient
            .from("profiles")
            .select("id, created_at, avatar_url, role")
            .eq("id", user.id)
            .maybeSingle();

        const profile = profileResult.data;
        if (profile) {
            stats.avatar = !!(profile.avatar_url || stats.avatar);
            stats.createdAt = profile.created_at || stats.createdAt;
            if (profile.created_at) {
                stats.accountAgeDays = Math.max(0, Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000));
            }
            stats.role = getEffectiveRole(profile, profile);
            stats.isCustomRole = !!(profile.role && !["Owner","Developer","Admin","Moderator","Helper","VIP","VIP+","OG","Member"].includes(profile.role));
        }

        const [allMessages, gaming, music, dm, notifications, friends] = await Promise.all([
            supabaseClient.from("messages").select("id, room", { count: "exact", head: false }).eq("user_id", user.id).limit(5000),
            supabaseClient.from("messages").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("room", "gaming"),
            supabaseClient.from("messages").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("room", "music"),
            supabaseClient.from("dm_messages").select("id", { count: "exact", head: true }).eq("sender_id", user.id),
            supabaseClient.from("notifications").select("id", { count: "exact", head: true }).eq("recipient_id", user.id),
            supabaseClient.from("friend_requests").select("id, sender_id, receiver_id", { count: "exact", head: false }).eq("status", "accepted").or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`).limit(500)
        ]);

        stats.messages = allMessages.count ?? (allMessages.data?.length || 0);
        stats.gamingMessages = gaming.count || 0;
        stats.musicMessages = music.count || 0;
        stats.dmMessages = dm.count || 0;
        stats.notifications = notifications.count || 0;
        stats.friends = (friends.data || []).filter(r => r.sender_id !== r.receiver_id).length;
        stats.rooms = new Set((allMessages.data || []).map(m => m.room).filter(Boolean)).size;
    } catch (error) {
        console.warn("Profile achievement stats unavailable:", error);
    }

    return stats;
}

async function renderProfileAchievements(user) {
    const grid = get("profileAchievements");
    const countButton = get("profileAchievementsButton");
    if (!grid) return;

    grid.innerHTML = PROFILE_ACHIEVEMENTS.map(a => `
        <div class="profile-achievement locked" data-achievement="${a.id}">
            <div class="profile-achievement-icon">🔒</div>
            <span class="profile-achievement-name">${a.name}</span>
        </div>
    `).join("");

    const stats = await loadProfileAchievementStats(user);
    const unlocked = PROFILE_ACHIEVEMENTS.filter(a => {
        try { return !!a.test(stats); } catch { return false; }
    });

    PROFILE_ACHIEVEMENTS.forEach(a => {
        const item = grid.querySelector(`[data-achievement="${a.id}"]`);
        if (!item) return;
        const isUnlocked = unlocked.some(x => x.id === a.id);
        item.classList.toggle("unlocked", isUnlocked);
        item.classList.toggle("locked", !isUnlocked);
        const icon = item.querySelector(".profile-achievement-icon");
        if (icon) icon.textContent = isUnlocked ? a.icon : "🔒";
    });

    if (countButton) countButton.textContent = `${unlocked.length} / ${PROFILE_ACHIEVEMENTS.length} unlocked ›`;
    const friendsCount = get("profileFriendsCount");
    if (friendsCount) friendsCount.textContent = `${stats.friends} friend${stats.friends === 1 ? "" : "s"}`;
}

function renderProfileRoleList(role) {
    const host = get("profileRoles");
    if (!host) return;
    host.innerHTML = "";
    const rank = document.createElement("span");
    rank.className = "profile-rank";
    applyRank(rank, role);
    host.appendChild(rank);
}



// ============================================================
// PROFILE
// ============================================================

function openProfile() {
    openUserProfile(currentUser);
}


async function openUserProfile(user) {

    const modal = get("profileModal");
    if (!modal) return;

    const name = user.displayName || user.username || "User";
    viewedProfileUser = user;

    // Pull the latest profile record so the redesigned profile can show
    // accurate join date, avatar, role and custom-rank information.
    let profile = user;
    if (supabaseClient && user.id) {
        try {
            const result = await supabaseClient
                .from("profiles")
                .select("id, username, display_name, bio, avatar_url, role, created_at")
                .eq("id", user.id)
                .maybeSingle();
            if (result.data) {
                profile = {
                    ...user,
                    id: result.data.id,
                    username: result.data.username || user.username,
                    displayName: result.data.display_name || user.displayName || result.data.username,
                    bio: result.data.bio || "No bio yet.",
                    avatarUrl: result.data.avatar_url || user.avatarUrl || "",
                    role: getEffectiveRole(result.data, result.data),
                    created_at: result.data.created_at
                };
                viewedProfileUser = profile;
            }
        } catch (error) {
            console.warn("Profile refresh failed:", error);
        }
    }

    get("profileName").textContent = profile.displayName || profile.username || name;
    get("profileUsername").textContent = "@" + (profile.username || "user");

    const effectiveProfileRole = getEffectiveRole(profile, profile);
    applyRank(get("profileRole"), effectiveProfileRole);
    renderProfileRoleList(effectiveProfileRole);

    get("profileBio").textContent = profile.bio || "No bio yet.";
    updateAvatar(get("profileAvatar"), profile.displayName || profile.username || "User", profile.avatarUrl || "");

    const joined = get("profileJoined");
    if (joined) {
        joined.textContent = profile.created_at
            ? new Date(profile.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
            : "—";
    }

    const isOnline = profile.id === currentUser.id || user.isOnline === true;
    const statusText = isOnline ? "Online" : "Offline";
    const status = get("profileStatusText");
    if (status) status.innerHTML = `${statusText} <i class="profile-online-dot${isOnline ? "" : " offline"}"></i>`;
    const statusValue = get("profileStatusValue");
    if (statusValue) statusValue.textContent = statusText;

    modal.dataset.rank = String(effectiveProfileRole || "member").toLowerCase();

    const isOwnProfile = profile.id === currentUser.id;
    await updateProfileFriendButton(profile.id);
    get("editProfileButton").classList.toggle("hidden", !isOwnProfile);

    const messageButton = get("messageProfileButton");
    if (messageButton) messageButton.classList.toggle("hidden", isOwnProfile);

    renderPermissionPanel(profile);
    modal.classList.remove("hidden");

    // Render immediately, then replace the locked placeholders with live stats.
    renderProfileAchievements(profile);
}


// ============================================================
// MODERATION PANEL
// ============================================================

function renderPermissionPanel(user) {

    const panel =
        get("permissionPanel");

    if (!panel) {
        return;
    }

    const isOwnProfile =
        user.id === currentUser.id;

    if (isOwnProfile) {

        panel.classList.add("hidden");
        panel.innerHTML = "";

        return;
    }

    if (!STAFF_ROLES.includes(currentUser.role) &&
        !hasPermission("manage_staff") &&
        !hasPermission("set_ranks") &&
        !hasPermission("ban_users") &&
        !hasPermission("mute_users") &&
        !hasPermission("kick_users") &&
        !hasPermission("warn_users") &&
        !hasPermission("delete_any_message")) {

        panel.classList.add("hidden");
        panel.innerHTML = "";

        return;
    }

    const viewerLevel =
        ROLE_LEVELS[currentUser.role] ?? 0;

    const effectiveTargetRole = getEffectiveRole(user, user);

    const targetLevel =
        ROLE_LEVELS[effectiveTargetRole] ?? 0;

    if (targetLevel >= viewerLevel) {

        panel.classList.add("hidden");
        panel.innerHTML = "";

        return;
    }

    const availableActions =
        MODERATION_ACTIONS[currentUser.role] || CUSTOM_MODERATION_ACTIONS;

    const allowedActions =
        availableActions.filter(
            function (action) {

                return hasPermission(
                    action.permission
                );
            }
        );

    if (!allowedActions.length) {

        panel.classList.add("hidden");
        panel.innerHTML = "";

        return;
    }

    const title =
        document.createElement("h4");

    title.className =
        "permission-panel-title";

    title.textContent =
        "Actions";

    const actionsContainer =
        document.createElement("div");

    actionsContainer.className =
        "permission-actions";

    allowedActions.forEach(
        function (action) {

            if (action.id === "change_role") {
                return;
            }

            const button =
                document.createElement("button");

            button.type =
                "button";

            button.className =
                "moderation-action";

            button.dataset.action =
                action.id;

            button.textContent =
                action.label;

            button.addEventListener(
                "click",
                function () {

                    handleModerationAction(
                        action.id,
                        user
                    );
                }
            );

            actionsContainer.appendChild(
                button
            );
        }
    );

    panel.innerHTML = "";

    panel.appendChild(title);

    panel.appendChild(
        actionsContainer
    );


    // --------------------------------------------------------
    // CHANGE ROLE
    // --------------------------------------------------------

    if (
        allowedActions.some(
            function (action) {

                return action.id === "change_role";
            }
        )
    ) {

        const roleSection =
            document.createElement("div");

        roleSection.className =
            "change-role-section";

        const roleTitle =
            document.createElement("h4");

        roleTitle.className =
            "permission-section-label";

        roleTitle.textContent =
            "Change Role";

        const roleControls =
            document.createElement("div");

        roleControls.className =
            "change-role-controls";

        const roleSelect =
            document.createElement("select");

        roleSelect.className =
            "moderation-role-select";

        Object.keys(ROLE_LEVELS)
            .forEach(
                function (role) {

                    const roleLevel =
                        ROLE_LEVELS[role];

                    if (roleLevel >= viewerLevel) {
                        return;
                    }

                    const option =
                        document.createElement("option");

                    option.value =
                        role;

                    option.textContent =
                        role;

                    if (role === user.role) {
                        option.selected = true;
                    }

                    roleSelect.appendChild(option);
                }
            );

        const roleButton =
            document.createElement("button");

        roleButton.type =
            "button";

        roleButton.className =
            "moderation-action";

        roleButton.textContent =
            "🛡️ Apply Role";

        roleButton.addEventListener(
            "click",
            function () {

                handleModerationAction(
                    "change_role",
                    user,
                    roleSelect.value
                );
            }
        );

        roleControls.appendChild(
            roleSelect
        );

        roleControls.appendChild(
            roleButton
        );

        roleSection.appendChild(
            roleTitle
        );

        roleSection.appendChild(
            roleControls
        );

        panel.appendChild(
            roleSection
        );
    }

    panel.classList.remove("hidden");
}


// ============================================================
// MODERATION ACTION HANDLER
// ============================================================

async function handleModerationAction(
    action,
    user,
    selectedRole
) {

    if (!user || !user.id) {
        return;
    }

    if (user.id === currentUser.id) {

        alert(
            "You cannot moderate yourself."
        );

        return;
    }

    const viewerLevel =
        ROLE_LEVELS[currentUser.role] ?? 0;

    const targetLevel =
        ROLE_LEVELS[user.role] ?? 0;

    if (targetLevel >= viewerLevel) {

        alert(
            "You cannot moderate someone with an equal or higher rank."
        );

        return;
    }

    if (action === "change_role") {

        if (!hasPermission("set_ranks")) {

            alert(
                "You do not have permission to change roles."
            );

            return;
        }

        if (!selectedRole) {
            return;
        }

        const selectedLevel =
            ROLE_LEVELS[selectedRole];

        if (
            selectedLevel === undefined ||
            selectedLevel >= viewerLevel
        ) {

            alert(
                "You cannot assign that role."
            );

            return;
        }

        if (
            selectedRole === user.role
        ) {

            alert(
                "That user already has that role."
            );

            return;
        }

        const confirmed =
            confirm(
                "Change @" +
                user.username +
                " from " +
                user.role +
                " to " +
                selectedRole +
                "?"
            );

        if (!confirmed) {
            return;
        }

        const {
            error
        } = await supabaseClient.rpc(
            "afterhours_set_user_role",
            {
                target_id: user.id,
                new_role: selectedRole
            }
        );

        if (error) {

            console.error(error);

            alert(
                error.message ||
                "Unable to change this user's role."
            );

            return;
        }

        user.role =
            selectedRole;

        alert(
            "@" +
            user.username +
            " is now " +
            selectedRole +
            "."
        );

        openUserProfile(user);

        return;
    }


    let reason = null;
    let duration = null;


    // --------------------------------------------------------
    // MUTE
    // --------------------------------------------------------

    if (action === "mute") {

        duration =
            parseInt(
                prompt(
                    "Mute @" +
                    user.username +
                    " for how many minutes?",
                    "60"
                ),
                10
            );

        if (
            !Number.isFinite(duration) ||
            duration <= 0
        ) {

            alert(
                "Please enter a valid duration."
            );

            return;
        }

        reason =
            prompt(
                "Reason for muting @" +
                user.username +
                "?",
                ""
            );

        const {
            error
        } = await supabaseClient.rpc(
            "afterhours_mute_user",
            {
                target_id:
                    user.id,

                duration_minutes:
                    duration,

                reason_text:
                    reason || null
            }
        );

        if (error) {

            console.error(error);

            alert(
                error.message ||
                "Unable to mute this user."
            );

            return;
        }

        alert(
            "@" +
            user.username +
            " has been muted for " +
            duration +
            " minutes."
        );

        return;
    }


    // --------------------------------------------------------
    // KICK
    // --------------------------------------------------------

    if (action === "kick") {

        const confirmed =
            confirm(
                "Kick @" +
                user.username +
                "?"
            );

        if (!confirmed) {
            return;
        }

        reason =
            prompt(
                "Reason for kicking @" +
                user.username +
                "?",
                ""
            );

        const {
            error
        } = await supabaseClient.rpc(
            "afterhours_kick_user",
            {
                target_id:
                    user.id,

                reason_text:
                    reason || null
            }
        );

        if (error) {

            console.error(error);

            alert(
                error.message ||
                "Unable to kick this user."
            );

            return;
        }

        alert(
            "@" +
            user.username +
            " has been kicked."
        );

        return;
    }


    // --------------------------------------------------------
    // BAN
    // --------------------------------------------------------

    if (action === "ban") {

        duration =
            parseInt(
                prompt(
                    "Ban @" +
                    user.username +
                    " for how many minutes?",
                    "1440"
                ),
                10
            );

        if (
            !Number.isFinite(duration) ||
            duration <= 0
        ) {

            alert(
                "Please enter a valid duration."
            );

            return;
        }

        reason =
            prompt(
                "Reason for banning @" +
                user.username +
                "?",
                ""
            );

        const confirmed =
            confirm(
                "Ban @" +
                user.username +
                " for " +
                duration +
                " minutes?"
            );

        if (!confirmed) {
            return;
        }

        const {
            error
        } = await supabaseClient.rpc(
            "afterhours_ban_user",
            {
                target_id:
                    user.id,

                duration_minutes:
                    duration,

                reason_text:
                    reason || null
            }
        );

        if (error) {

            console.error(error);

            alert(
                error.message ||
                "Unable to ban this user."
            );

            return;
        }

        alert(
            "@" +
            user.username +
            " has been banned for " +
            duration +
            " minutes."
        );

        return;
    }


    // --------------------------------------------------------
    // WARN
    // --------------------------------------------------------

    if (action === "warn") {

        reason =
            prompt(
                "Warning reason for @" +
                user.username +
                "?",
                ""
            );

        const {
            error
        } = await supabaseClient.rpc(
            "afterhours_warn_user",
            {
                target_id:
                    user.id,

                reason_text:
                    reason || null
            }
        );

        if (error) {

            console.error(error);

            alert(
                error.message ||
                "Unable to warn this user."
            );

            return;
        }

        alert(
            "@" +
            user.username +
            " has been warned."
        );

        return;
    }


    // --------------------------------------------------------
    // RESTRICT
    // --------------------------------------------------------

    if (action === "restrict") {

        duration =
            parseInt(
                prompt(
                    "Restrict @" +
                    user.username +
                    " for how many minutes?",
                    "1440"
                ),
                10
            );

        if (
            !Number.isFinite(duration) ||
            duration <= 0
        ) {

            alert(
                "Please enter a valid duration."
            );

            return;
        }

        reason =
            prompt(
                "Reason for restricting @" +
                user.username +
                "?",
                ""
            );

        const {
            error
        } = await supabaseClient.rpc(
            "afterhours_restrict_user",
            {
                target_id:
                    user.id,

                duration_minutes:
                    duration,

                reason_text:
                    reason || null
            }
        );

        if (error) {

            console.error(error);

            alert(
                error.message ||
                "Unable to restrict this user."
            );

            return;
        }

        alert(
            "@" +
            user.username +
            " has been restricted for " +
            duration +
            " minutes."
        );

        return;
    }


    // --------------------------------------------------------
    // DELETE MESSAGES
    // --------------------------------------------------------

    if (action === "delete_messages") {

        const confirmed =
            confirm(
                "Delete ALL messages sent by @" +
                user.username +
                "?"
            );

        if (!confirmed) {
            return;
        }

        const {
            data,
            error
        } = await supabaseClient.rpc(
            "afterhours_delete_user_messages",
            {
                target_id:
                    user.id
            }
        );

        if (error) {

            console.error(error);

            alert(
                error.message ||
                "Unable to delete this user's messages."
            );

            return;
        }

        alert(
            "Deleted " +
            (data || 0) +
            " message(s) from @" +
            user.username +
            "."
        );

        loadMessages();

        return;
    }


    console.warn(
        "Unknown moderation action:",
        action
    );
}


// ============================================================
// MODERATION STATUS
// ============================================================

let moderationStatusInterval = null;


function updateMessageInputState() {

    const input =
        get("messageInput");

    const form =
        get("messageForm");

    if (!input || !form) {
        return;
    }

    const disabled =
        currentUser.muted ||
        currentUser.restricted;

    input.disabled =
        disabled;

    const button =
        form.querySelector("button");

    if (button) {
        button.disabled =
            disabled;
    }

    if (currentUser.muted) {

        input.placeholder =
            "You are currently muted.";

    } else if (currentUser.restricted) {

        input.placeholder =
            "You are currently restricted.";

    } else if (
        currentChatMode === "dm" &&
        currentDmUser
    ) {

        input.placeholder =
            "Message @" +
            currentDmUser.username +
            "...";

    } else if (rooms[currentRoom]) {

        input.placeholder =
            "Message " +
            rooms[currentRoom].title.substring(2) +
            "...";
    }
}


async function checkModerationStatus() {

    if (
        !supabaseClient ||
        !currentUser.id
    ) {
        return;
    }

    const {
        data,
        error
    } = await supabaseClient.rpc(
        "afterhours_get_my_status"
    );

    if (error) {

        console.error(
            "Moderation status check failed:",
            error
        );

        return;
    }

    if (!data) {
        return;
    }

    const status =
        Array.isArray(data)
            ? data[0]
            : data;

    if (!status) {
        return;
    }


    // --------------------------------------------------------
    // BAN
    // --------------------------------------------------------

    if (status.banned) {

        alert(
            "Your account is currently banned."
        );

        await stopOnlinePresence();
        await stopRoomMessageRealtime();
        await stopDmRealtime();

        if (supabaseClient) {
            await supabaseClient.auth.signOut();
        }

        currentUser = {

            id: null,

            username: "",

            displayName: "",

            bio: "",

            avatarUrl: "",

            role: "Member",

            muted: false,

            restricted: false
        };

        showLanding();

        return;
    }


    // --------------------------------------------------------
    // KICK
    // --------------------------------------------------------

    if (status.kicked) {

        alert(
            "You have been kicked from Afterhours."
        );

        await stopOnlinePresence();
        await stopRoomMessageRealtime();
        await stopDmRealtime();

        if (supabaseClient) {
            await supabaseClient.auth.signOut();
        }

        currentUser = {

            id: null,

            username: "",

            displayName: "",

            bio: "",

            avatarUrl: "",

            role: "Member",

            muted: false,

            restricted: false
        };

        showLanding();

        return;
    }


    currentUser.muted =
        Boolean(status.muted);

    currentUser.restricted =
        Boolean(status.restricted);

    updateMessageInputState();
}


function startModerationStatusChecks() {

    if (moderationStatusInterval) {

        clearInterval(
            moderationStatusInterval
        );
    }

    moderationStatusInterval =
        setInterval(
            checkModerationStatus,
            5000
        );
}


function stopModerationStatusChecks() {

    if (moderationStatusInterval) {

        clearInterval(
            moderationStatusInterval
        );

        moderationStatusInterval = null;
    }
}


function canTestStore() {
    return Boolean(currentUser?.id) && hasPermission("test_store_purchases");
}

let storeTestState = null;

async function loadStoreTestState() {
    storeTestState = null;
    if (!supabaseClient || !currentUser?.id) return;

    try {
        const { data, error } = await supabaseClient.rpc("afterhours_get_store_test_state");
        if (error) {
            if (error.code !== "42883" && error.code !== "PGRST202") {
                console.warn("Store test state unavailable:", error);
            }
            return;
        }
        storeTestState = data?.[0] || data || null;
    } catch (err) {
        console.warn("Store test state load failed:", err);
    }
}

function renderStoreTestControls() {
    const section = get("storeTestSection");
    const resetButton = get("resetStoreTestButton");
    const status = get("storeTestStatus");
    if (!section) return;

    const canTest = canTestStore();
    const active = Boolean(storeTestState?.original_role);
    section.classList.toggle("hidden", !canTest && !active);

    if (resetButton) {
        resetButton.classList.toggle("hidden", !active);
    }

    if (status) {
        status.textContent = active
            ? `Test rank active. Original rank: ${storeTestState.original_role}`
            : "No test rank is active.";
    }
}

async function openStore() {
    const modal = get("storeModal");
    if (!modal) return;
    await loadStoreTestState();
    renderStoreTestControls();
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
}

function closeStore() {
    const modal = get("storeModal");
    if (!modal) return;
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
}

async function startStoreTestPurchase(product) {
    const productName = product === "vip_plus" ? "VIP+" : product === "vip" ? "VIP" : null;
    const status = get("storeTestStatus");
    const buttons = document.querySelectorAll("[data-store-test-product]");

    console.log("[Store Test] click", { product, currentUser: currentUser?.id, role: currentUser?.role });

    if (status) {
        status.textContent = productName
            ? `Starting ${productName} test...`
            : "Invalid Store product.";
    }

    if (!productName) {
        alert("Invalid Store product.");
        return;
    }

    if (!currentUser?.id) {
        if (status) status.textContent = "Not logged in.";
        alert("Please log in before using Store test mode.");
        return;
    }

    const isOwner = currentUser.id === OWNER_USER_ID || currentUser.role === "Owner";
    if (!isOwner && !canTestStore()) {
        if (status) status.textContent = "You do not have Store Test permission.";
        alert("You do not have permission to use Store test mode.");
        return;
    }

    const confirmed = confirm(
        `Test ${productName}? No money will be charged. Your current rank will be saved so you can restore it later.`
    );
    if (!confirmed) {
        if (status) status.textContent = "Test purchase canceled.";
        return;
    }

    buttons.forEach(button => { button.disabled = true; });
    if (status) status.textContent = `Testing ${productName}...`;

    try {
        if (!supabaseClient) {
            throw new Error("Supabase is not connected.");
        }

        // V2 returns the created announcement so the UI can render it
        // immediately. Fall back to the original RPC for older databases.
        let rpcResult = await supabaseClient.rpc("afterhours_test_purchase_v2", {
            p_product: product
        });

        if (rpcResult.error && ["42883", "PGRST202"].includes(rpcResult.error.code)) {
            rpcResult = await supabaseClient.rpc("afterhours_test_purchase", {
                p_product: product
            });
        }

        if (rpcResult.error) throw rpcResult.error;

        const result = rpcResult.data || {};

        // The V2 RPC returns the exact message it inserted. Render that message
        // immediately so the purchase announcement does not depend on realtime
        // delivery or a second database read.
        const createdMessage = result?.message;
        if (createdMessage && currentRoom === "general" && currentChatMode === "room") {
            const messagesEl = get("messages");
            if (messagesEl) {
                const profile = {
                    id: currentUser.id,
                    username: currentUser.username,
                    display_name: currentUser.displayName,
                    bio: currentUser.bio,
                    avatar_url: currentUser.avatarUrl,
                    role: result.role || productName
                };
                renderMessage(createdMessage, profile);
                messagesEl.scrollTop = messagesEl.scrollHeight;
            }
        }

        await loadCurrentUser();
        await loadStoreTestState();
        renderStoreTestControls();

        // Re-read General as well. The duplicate-message guard prevents the
        // immediate render above from appearing twice.
        if (currentRoom === "general" && currentChatMode === "room") {
            await loadMessages();
        }

        if (status) {
            status.textContent = `${productName} test purchase complete! Announcement posted in General.`;
        }

        console.log("[Store Test] success", result);
        alert(`${productName} test purchase complete! Your original rank was saved.

The gold purchase announcement was posted in General.`);
    } catch (err) {
        console.error("[Store Test] purchase failed:", err);
        if (status) {
            status.textContent = `Test purchase failed: ${err?.message || "Unknown error"}`;
        }
        alert(err?.message || "Test purchase failed. Make sure the updated afterhours_upgrade.sql was run in Supabase.");
    } finally {
        buttons.forEach(button => { button.disabled = false; });
    }
}

// Make the test-purchase handler available to any legacy inline callers.
window.startStoreTestPurchase = startStoreTestPurchase;

async function resetStoreTestPurchase() {
    if (!currentUser?.id) return;
    if (!storeTestState?.original_role) {
        alert("You do not have an active Store test rank.");
        return;
    }

    if (!confirm(`Restore your original rank: ${storeTestState.original_role}?`)) return;

    try {
        const { data, error } = await supabaseClient.rpc("afterhours_reset_test_purchase");
        if (error) throw error;

        storeTestState = null;
        renderStoreTestControls();
        await loadCurrentUser();
        await loadMessages();
        alert(`Your original rank (${data || "restored"}) has been restored.`);
    } catch (err) {
        console.error("Store test reset failed:", err);
        alert(err?.message || "Unable to restore your original rank.");
    }
}

async function startStoreCheckout(product) {
    if (!currentUser?.id) {
        alert("Please log in before purchasing a Store item.");
        return;
    }

    if (!["vip", "vip_plus"].includes(product)) {
        alert("Invalid Store product.");
        return;
    }

    try {
        const session = await supabaseClient.auth.getSession();
        const accessToken = session?.data?.session?.access_token;
        if (!accessToken) {
            alert("Your session has expired. Please log in again.");
            return;
        }

        if (window.location.protocol === "file:") {
            alert("Stripe checkout needs the Afterhours server. Use the Store Test buttons instead while opening index.html directly.");
            return;
        }

        const response = await fetch("/api/create-checkout-session", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`
            },
            body: JSON.stringify({ product })
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.url) {
            throw new Error(result.error || "Unable to start checkout.");
        }

        window.location.href = result.url;
    } catch (err) {
        console.error("Store checkout failed:", err);
        alert(err?.message || "Unable to start checkout. Make sure the Afterhours server is running and Stripe is configured.");
    }
}
// ============================================================
// ACCOUNT SETTINGS
// ============================================================

const AFTERHOURS_SETTINGS_KEY = "afterhours-account-settings";

function getAccountSettings() {
    try {
        const local = JSON.parse(localStorage.getItem(AFTERHOURS_SETTINGS_KEY) || "{}") || {};
        const server = currentUser?.accountSettings && typeof currentUser.accountSettings === "object" ? currentUser.accountSettings : {};
        return { ...server, ...local };
    } catch (_) {
        return currentUser?.accountSettings || {};
    }
}

function saveAccountSettings(patch) {
    const next = { ...getAccountSettings(), ...patch };
    localStorage.setItem(AFTERHOURS_SETTINGS_KEY, JSON.stringify(next));
    if (currentUser) currentUser.accountSettings = next;
    void persistAccountSettings(next);
    return next;
}

async function persistAccountSettings(settings) {
    if (!supabaseClient || !currentUser?.id) return;
    try {
        const { error } = await supabaseClient.from("profiles").update({ settings }).eq("id", currentUser.id);
        if (error && error.code !== "42703" && error.code !== "PGRST204") console.warn("Account settings sync failed:", error.message || error);
    } catch (error) {
        console.warn("Account settings sync failed:", error);
    }
}

function openSettings(section = "account") {
    const modal = get("settingsModal");
    if (!modal) return;

    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    setSettingsSection(section);
    loadSettingsValues();
}

function closeSettings() {
    const modal = get("settingsModal");
    if (modal) {
        modal.classList.add("hidden");
        modal.setAttribute("aria-hidden", "true");
    }
}

function setSettingsSection(section) {
    document.querySelectorAll("[data-settings-section]").forEach(button => {
        button.classList.toggle("active", button.dataset.settingsSection === section);
    });
    document.querySelectorAll("[data-settings-content]").forEach(panel => {
        panel.classList.toggle("active", panel.dataset.settingsContent === section);
    });
}

async function loadSettingsValues() {
    const settings = getAccountSettings();
    const nameInput = get("settingsDisplayName");
    const usernameInput = get("settingsUsername");
    const bioInput = get("settingsBio");
    const avatar = get("settingsAvatar");

    if (nameInput) nameInput.value = currentUser.displayName || "";
    if (usernameInput) usernameInput.value = currentUser.username ? "@" + currentUser.username : "";
    if (bioInput) bioInput.value = currentUser.bio === "No bio yet." ? "" : (currentUser.bio || "");
    if (avatar) updateAvatar(avatar, currentUser.displayName || currentUser.username || "User", currentUser.avatarUrl);

    const email = get("settingsEmailValue");
    if (email) {
        try {
            const { data } = await supabaseClient?.auth?.getUser();
            email.textContent = data?.user?.email || "Not available";
        } catch (_) {
            email.textContent = "Not available";
        }
    }

    const accent = get("settingsAccent");
    const fontSize = get("settingsFontSize");
    const messageNotifications = get("settingsMessageNotifications");
    const friendNotifications = get("settingsFriendNotifications");
    const showOnline = get("settingsShowOnline");
    const typing = get("settingsTyping");
    const timestamps = get("settingsTimestamps");
    const allowFriends = get("settingsAllowFriends");
    const allowDMs = get("settingsAllowDMs");

    const theme = get("settingsTheme");
    if (theme) theme.value = settings.theme || "dark";
    if (accent) accent.value = settings.accent || "#8b5cf6";
    if (fontSize) fontSize.value = settings.fontSize || "normal";
    if (messageNotifications) messageNotifications.checked = settings.messageNotifications !== false;
    if (friendNotifications) friendNotifications.checked = settings.friendNotifications !== false;
    if (showOnline) showOnline.checked = settings.showOnline !== false;
    if (typing) typing.checked = settings.typing !== false;
    if (timestamps) timestamps.checked = settings.timestamps !== false;
    if (allowFriends) allowFriends.checked = settings.allowFriends !== false;
    if (allowDMs) allowDMs.checked = settings.allowDMs !== false;

    applyAccountPreferences(settings);

    const rank = get("settingsCurrentRank");
    if (rank) {
        rank.textContent = currentUser.role || "Member";
    }
}

function applyAccountPreferences(settings = getAccountSettings()) {
    const root = document.documentElement;
    const accent = settings.accent || "#8b5cf6";
    const theme = settings.theme || "dark";
    root.style.setProperty("--afterhours-accent", accent);
    let hex = String(accent).replace("#", "");
    if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
    if (/^[0-9a-fA-F]{6}$/.test(hex)) {
        const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
        root.style.setProperty("--afterhours-accent-rgb", `${r}, ${g}, ${b}`);
        root.style.setProperty("--afterhours-accent-soft", `rgba(${r}, ${g}, ${b}, .14)`);
        root.style.setProperty("--afterhours-accent-border", `rgba(${r}, ${g}, ${b}, .42)`);
        root.style.setProperty("--afterhours-accent-glow", `rgba(${r}, ${g}, ${b}, .24)`);
    }
    const prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
    const light = theme === "light" || (theme === "system" && prefersLight);
    document.body.classList.toggle("afterhours-light-theme", light);
    document.body.classList.toggle("afterhours-system-theme", theme === "system");
    document.body.classList.toggle("afterhours-large-text", settings.fontSize === "large");
    document.body.classList.toggle("afterhours-hide-timestamps", settings.timestamps === false);
    updateBrowserNotificationUI?.();
    updateTypingPreferenceUI?.();
}

async function saveSettingsProfile() {
    if (!supabaseClient || !currentUser.id) return;
    const displayName = get("settingsDisplayName")?.value.trim() || "";
    const username = get("settingsUsername")?.value.trim().replace(/^@/, "") || currentUser.username;
    const bio = get("settingsBio")?.value.trim() || "";
    const status = get("settingsProfileStatus");
    if (!displayName) { if (status) status.textContent = "Display name cannot be empty."; return; }
    if (!/^[A-Za-z0-9_]{3,32}$/.test(username)) { if (status) status.textContent = "Username must be 3–32 characters: letters, numbers, or _."; return; }
    if (username.toLowerCase() !== String(currentUser.username || "").toLowerCase()) {
        const { data: taken, error: checkError } = await supabaseClient.from("profiles").select("id").ilike("username", username).neq("id", currentUser.id).maybeSingle();
        if (checkError) { if (status) status.textContent = checkError.message || "Unable to check username."; return; }
        if (taken) { if (status) status.textContent = "That username is already taken."; return; }
    }
    const { data, error } = await supabaseClient.from("profiles").update({ display_name: displayName, username, bio }).eq("id", currentUser.id).select("id, username, display_name, bio").maybeSingle();
    if (error) { console.error("Settings profile save failed:", error); if (status) status.textContent = error.message || "Unable to save profile."; return; }
    currentUser.username = data?.username || username;
    currentUser.displayName = data?.display_name || displayName;
    currentUser.bio = data?.bio || "No bio yet.";
    updateUser();
    if (get("topUsername")) get("topUsername").textContent = currentUser.displayName || currentUser.username || "User";
    if (status) status.textContent = "Profile saved!";
}

async function changeAccountEmail() {
    if (!supabaseClient) return;
    const email = prompt("Enter your new email address:");
    if (!email || !email.includes("@")) return;

    const { error } = await supabaseClient.auth.updateUser({ email: email.trim() });
    if (error) {
        alert(error.message || "Unable to change your email.");
        return;
    }
    alert("A confirmation link may have been sent to your new email address.");
    loadSettingsValues();
}

async function changeAccountPassword() {
    if (!supabaseClient) return;
    const password = prompt("Enter your new password:");
    if (!password) return;
    if (password.length < 6) {
        alert("Your password must be at least 6 characters.");
        return;
    }

    const { error } = await supabaseClient.auth.updateUser({ password });
    if (error) {
        alert(error.message || "Unable to change your password.");
        return;
    }
    alert("Your password has been changed.");
}

function bindSettingsPreference(id, key, transform = value => value) {
    const element = get(id);
    if (!element) return;
    element.addEventListener("change", () => {
        const value = transform(element);
        const settings = saveAccountSettings({ [key]: value });
        applyAccountPreferences(settings);
    });
}

function initSettings() {
    get("settingsButton")?.addEventListener("click", () => openSettings("account"));
    get("closeSettingsButton")?.addEventListener("click", closeSettings);
    get("settingsModal")?.addEventListener("click", event => {
        if (event.target.id === "settingsModal") closeSettings();
    });

    document.querySelectorAll("[data-settings-section]").forEach(button => {
        button.addEventListener("click", () => setSettingsSection(button.dataset.settingsSection));
    });

    get("settingsSaveProfile")?.addEventListener("click", saveSettingsProfile);
    get("settingsEditProfileButton")?.addEventListener("click", () => {
        closeSettings();
        openEditProfile();
    });
    get("settingsChangeEmail")?.addEventListener("click", changeAccountEmail);
    get("settingsChangePassword")?.addEventListener("click", changeAccountPassword);
    get("settingsOpenStore")?.addEventListener("click", () => {
        closeSettings();
        openStore();
    });
    get("settingsBrowserNotifications")?.addEventListener("click", async () => {
        if (typeof requestBrowserNotificationPermission === "function") {
            await requestBrowserNotificationPermission();
        }
    });
    get("settingsClearLocal")?.addEventListener("click", () => {
        if (!confirm("Reset your saved Afterhours preferences on this account and device?")) return;
        localStorage.removeItem(AFTERHOURS_SETTINGS_KEY);
        localStorage.removeItem(AFTERHOURS_BROWSER_NOTIFICATION_MUTE_KEY);
        if (currentUser) currentUser.accountSettings = {};
        void persistAccountSettings({});
        applyAccountPreferences({});
        loadSettingsValues();
    });

    bindSettingsPreference("settingsTheme", "theme", element => element.value);
    bindSettingsPreference("settingsAccent", "accent", element => element.value);
    bindSettingsPreference("settingsFontSize", "fontSize", element => element.value);
    bindSettingsPreference("settingsMessageNotifications", "messageNotifications", element => element.checked);
    bindSettingsPreference("settingsFriendNotifications", "friendNotifications", element => element.checked);
    get("settingsShowOnline")?.addEventListener("change", () => {
        const enabled = get("settingsShowOnline").checked;
        const settings = saveAccountSettings({ showOnline: enabled });
        applyAccountPreferences(settings);
        if (!enabled) void stopOnlinePresence();
        else if (currentUser?.id && !onlinePresenceChannel) void startOnlinePresence();
    });
    bindSettingsPreference("settingsTyping", "typing", element => element.checked);
    bindSettingsPreference("settingsTimestamps", "timestamps", element => element.checked);
    bindSettingsPreference("settingsAllowFriends", "allowFriends", element => element.checked);
    bindSettingsPreference("settingsAllowDMs", "allowDMs", element => element.checked);

    const messageInput = get("messageInput");
    if (messageInput && messageInput.dataset.typingBound !== "true") {
        messageInput.dataset.typingBound = "true";
        messageInput.addEventListener("input", () => {
            if (getAccountSettings().typing === false) return;
            void updateOwnTypingState(Boolean(messageInput.value.trim()));
            clearTimeout(typingStopTimer);
            typingStopTimer = setTimeout(() => void updateOwnTypingState(false), 1400);
        });
    }

    applyAccountPreferences();
    updateTypingPreferenceUI();
}


// ============================================================
// PROFILE MODAL
// ============================================================

function closeProfile() {

    const modal =
        get("profileModal");

    if (modal) {
        modal.classList.add("hidden");
    }
}


function openEditProfile() {

    get("editUsername").value =
        currentUser.username || "";

    get("editName").value =
        currentUser.displayName || "";

    get("editBio").value =
        currentUser.bio === "No bio yet."
            ? ""
            : (currentUser.bio || "");

    updateAvatar(
        get("editAvatarPreview"),
        currentUser.displayName ||
        currentUser.username ||
        "User",
        currentUser.avatarUrl
    );

    const status =
        get("avatarUploadStatus");

    if (status) {

        status.textContent =
            "JPG, PNG, or WebP · Max 2 MB";
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


// ============================================================
// PROFILE PICTURE UPLOAD
// ============================================================

async function uploadProfilePicture(file) {

    if (!supabaseClient) {

        alert(
            "Profile pictures are currently unavailable."
        );

        return;
    }

    if (!currentUser.id) {

        alert(
            "You aren't logged in."
        );

        return;
    }

    if (!file) {
        return;
    }

    const allowedTypes = [
        "image/png",
        "image/jpeg",
        "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {

        alert(
            "Please choose a PNG, JPG, or WebP image."
        );

        return;
    }

    const maxSize =
        2 * 1024 * 1024;

    if (file.size > maxSize) {

        alert(
            "Your profile picture must be 2 MB or smaller."
        );

        return;
    }

    const status =
        get("avatarUploadStatus");

    if (status) {

        status.textContent =
            "Uploading picture...";
    }

    try {

        const extension =
            file.type === "image/png"
                ? "png"
                : file.type === "image/webp"
                    ? "webp"
                    : "jpg";

        const filePath =
            currentUser.id +
            "/avatar-" +
            Date.now() +
            "." +
            extension;


        // ----------------------------------------------------
        // UPLOAD TO SUPABASE STORAGE
        // ----------------------------------------------------

        const {
            error: uploadError
        } = await supabaseClient.storage
            .from("avatars")
            .upload(
                filePath,
                file,
                {
                    contentType:
                        file.type,

                    cacheControl:
                        "3600",

                    upsert:
                        false
                }
            );


        if (uploadError) {

            console.error(
                "AVATAR STORAGE ERROR:",
                uploadError
            );

            if (status) {

                status.textContent =
                    "Storage error: " +
                    (
                        uploadError.message ||
                        "Unable to upload the picture."
                    );
            }

            return;
        }


        // ----------------------------------------------------
        // GET PUBLIC URL
        // ----------------------------------------------------

        const {
            data: publicData
        } = supabaseClient.storage
            .from("avatars")
            .getPublicUrl(filePath);


        if (
            !publicData ||
            !publicData.publicUrl
        ) {

            console.error(
                "Unable to create public avatar URL."
            );

            if (status) {

                status.textContent =
                    "Upload worked, but the image URL could not be created.";
            }

            return;
        }


        const avatarUrl =
            publicData.publicUrl;


        // ----------------------------------------------------
        // SAVE URL TO PROFILE
        // ----------------------------------------------------

        const {
            data: updatedProfile,
            error: profileError
        } = await supabaseClient
            .from("profiles")
            .update({
                avatar_url:
                    avatarUrl
            })
            .eq(
                "id",
                currentUser.id
            )
            .select(
                "id, avatar_url"
            )
            .maybeSingle();


        if (profileError) {

            console.error(
                "AVATAR PROFILE ERROR:",
                profileError
            );

            if (status) {

                status.textContent =
                    "Profile save error: " +
                    (
                        profileError.message ||
                        "Unable to save your profile picture."
                    );
            }

            return;
        }


        // ----------------------------------------------------
        // VERIFY DATABASE UPDATE
        // ----------------------------------------------------

        if (
            !updatedProfile ||
            !updatedProfile.avatar_url
        ) {

            console.error(
                "Avatar URL was not saved to profiles:",
                updatedProfile
            );

            if (status) {

                status.textContent =
                    "The upload worked, but avatar_url was not saved.";
            }

            return;
        }


        // ----------------------------------------------------
        // SUCCESS
        // ----------------------------------------------------

        currentUser.avatarUrl =
            updatedProfile.avatar_url;


        try {

            localStorage.setItem(
                "afterhours-avatar-" +
                currentUser.id,
                updatedProfile.avatar_url
            );

        } catch (error) {

            console.warn(
                "Unable to save avatar locally:",
                error
            );
        }


        updateUser();


        updateAvatar(
            get("editAvatarPreview"),
            currentUser.displayName ||
            currentUser.username ||
            "User",
            currentUser.avatarUrl
        );


        loadMessages();


        if (status) {

            status.textContent =
                "Profile picture updated!";
        }


        const input =
            get("avatarFile");

        if (input) {
            input.value = "";
        }

    } catch (err) {

        console.error(
            "AVATAR UPLOAD EXCEPTION:",
            err
        );

        if (status) {

            status.textContent =
                "Upload error: " +
                (
                    err.message ||
                    "Something went wrong."
                );
        }
    }
}


// ============================================================
// SAVE PROFILE
// ============================================================

async function saveProfile() {

    if (!supabaseClient) {

        alert(
            "Unable to save profile right now."
        );

        return;
    }

    const displayName =
        get("editName").value.trim();

    const bio =
        get("editBio").value.trim();

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

    const {
        error
    } = await supabaseClient
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

    if (error) {

        console.error(error);

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

    if (onlinePresenceChannel) {
        try {
            await onlinePresenceChannel.track({
                user_id:
                    currentUser.id,
                username:
                    currentUser.username,
                display_name:
                    currentUser.displayName,
                avatar_url:
                    currentUser.avatarUrl
            });
        } catch (err) {
            console.warn(
                "Unable to refresh online presence:",
                err
            );
        }
    }

    closeEditProfile();

    alert(
        "Profile saved!"
    );
}


// ============================================================
// MESSAGES
// ============================================================

let currentRoom =
    "general";

let messageLoadVersion =
    0;


// ============================================================
// DIRECT MESSAGES STATE
// ============================================================

let currentChatMode =
    "room";

let currentDmConversationId =
    null;

let currentDmUser =
    null;

let dmRealtimeChannel =
    null;

let dmInboxRealtimeChannel =
    null;

let dmReadMessageIds =
    new Set();


// ============================================================
// REALTIME MESSAGING
// ============================================================

let messageRealtimeChannel =
    null;

let messageRealtimeRoom =
    null;


// ------------------------------------------------------------
// Realtime status indicator
// ------------------------------------------------------------

function updateRealtimeStatus(status) {

    let indicator =
        get("realtimeStatus");

    if (!indicator) {

        indicator =
            document.createElement("div");

        indicator.id =
            "realtimeStatus";

        indicator.style.position =
            "fixed";

        indicator.style.bottom =
            "15px";

        indicator.style.right =
            "15px";

        indicator.style.zIndex =
            "9999";

        indicator.style.padding =
            "8px 12px";

        indicator.style.borderRadius =
            "8px";

        indicator.style.background =
            "rgba(0, 0, 0, 0.8)";

        indicator.style.color =
            "white";

        indicator.style.fontSize =
            "13px";

        indicator.style.fontFamily =
            "Arial, sans-serif";

        indicator.style.pointerEvents =
            "none";

        indicator.style.boxShadow =
            "0 4px 12px rgba(0,0,0,0.25)";

        document.body.appendChild(
            indicator
        );
    }

    if (status === "SUBSCRIBED") {

        consoleEvent(
            "Supabase realtime connected.",
            "log"
        );

        indicator.textContent =
            "🟢 Realtime Connected";

        indicator.title =
            "Afterhours realtime is connected.";

    } else if (
        status === "CHANNEL_ERROR"
    ) {

        consoleEvent(
            "Supabase realtime channel error.",
            "error"
        );

        indicator.textContent =
            "🔴 Realtime Error";

        indicator.title =
            "Supabase realtime encountered an error.";

    } else if (
        status === "TIMED_OUT"
    ) {

        consoleEvent(
            "Supabase realtime connection timed out.",
            "warn"
        );

        indicator.textContent =
            "🟠 Realtime Timed Out";

        indicator.title =
            "Supabase realtime connection timed out.";

    } else if (
        status === "CLOSED"
    ) {

        consoleEvent(
            "Supabase realtime disconnected.",
            "warn"
        );

        indicator.textContent =
            "🔴 Realtime Disconnected";

        indicator.title =
            "The realtime connection was closed.";

    } else {

        indicator.textContent =
            "🟡 Realtime Connecting...";

        indicator.title =
            "Connecting to Afterhours realtime.";
    }
}


// ------------------------------------------------------------
// Subscribe to new messages for current room.
// ------------------------------------------------------------

async function subscribeToRoomMessages() {

    if (
        !supabaseClient ||
        !currentUser.id
    ) {

        updateRealtimeStatus(
            "CLOSED"
        );

        return;
    }

    if (
        messageRealtimeChannel &&
        messageRealtimeRoom === currentRoom
    ) {

        return;
    }


    if (messageRealtimeChannel) {

        try {

            await supabaseClient.removeChannel(
                messageRealtimeChannel
            );

        } catch (err) {

            console.warn(
                "Unable to remove previous realtime channel:",
                err
            );
        }

        messageRealtimeChannel =
            null;

        messageRealtimeRoom =
            null;
    }


    const roomAtSubscription =
        currentRoom;

    updateRealtimeStatus(
        "CONNECTING"
    );


    const channelName =
        "afterhours-messages-" +
        roomAtSubscription +
        "-" +
        Date.now();


    const channel =
        supabaseClient
            .channel(channelName);


    messageRealtimeChannel =
        channel;


    channel.on(
        "postgres_changes",
        {
            event:
                "INSERT",

            schema:
                "public",

            table:
                "messages",

            filter:
                "room=eq." +
                roomAtSubscription
        },
        async function (payload) {

            if (
                currentChatMode !== "room" ||
                currentRoom !==
                roomAtSubscription
            ) {
                return;
            }

            const message =
                payload.new;

            if (!message) {
                return;
            }


            if (message.id) {

                const existingMessage =
                    document.querySelector(
                        '[data-message-id="' +
                        message.id +
                        '"]'
                    );

                if (existingMessage) {
                    return;
                }
            }


            let profile =
                null;


            if (message.user_id) {

                const {
                    data,
                    error
                } = await supabaseClient
                    .from("profiles")
                    .select(
                        "id, username, display_name, bio, avatar_url, role"
                    )
                    .eq(
                        "id",
                        message.user_id
                    )
                    .maybeSingle();

                if (error) {

                    console.error(
                        "Realtime profile load failed:",
                        error
                    );

                } else {

                    profile =
                        data;
                }
            }


            if (
                !profile &&
                message.user_id ===
                currentUser.id
            ) {

                profile = {

                    id:
                        currentUser.id,

                    username:
                        currentUser.username,

                    display_name:
                        currentUser.displayName,

                    bio:
                        currentUser.bio,

                    avatar_url:
                        currentUser.avatarUrl,

                    role:
                        currentUser.role
                };
            }


            if (
                currentChatMode !== "room" ||
                currentRoom !==
                roomAtSubscription
            ) {
                return;
            }


            renderMessage(
                message,
                profile
            );


            const messages =
                get("messages");

            if (messages) {

                messages.scrollTop =
                    messages.scrollHeight;
            }
        }
    );


    channel.on(
        "postgres_changes",
        {
            event: "UPDATE",
            schema: "public",
            table: "messages",
            filter: "room=eq." + roomAtSubscription
        },
        async function (payload) {
            if (currentChatMode !== "room" || currentRoom !== roomAtSubscription || !payload.new) return;

            const message = payload.new;
            const existing = message.id
                ? document.querySelector('[data-message-id="' + message.id + '"]')
                : null;

            if (existing) existing.remove();

            let profile = null;
            if (message.user_id) {
                const { data, error } = await supabaseClient
                    .from("profiles")
                    .select("id, username, display_name, bio, avatar_url, role")
                    .eq("id", message.user_id)
                    .maybeSingle();
                if (error) console.error("Realtime updated-message profile load failed:", error);
                else profile = data;
            }

            if (!profile && message.user_id === currentUser.id) {
                profile = {
                    id: currentUser.id,
                    username: currentUser.username,
                    display_name: currentUser.displayName,
                    bio: currentUser.bio,
                    avatar_url: currentUser.avatarUrl,
                    role: currentUser.role
                };
            }

            renderMessage(message, profile);
        }
    );



    channel.subscribe(
        function (status) {

            console.log(
                "Afterhours realtime:",
                status,
                "room:",
                roomAtSubscription
            );


            if (
                messageRealtimeChannel ===
                channel
            ) {

                updateRealtimeStatus(
                    status
                );
            }


            if (
                status === "SUBSCRIBED"
            ) {

                if (
                    messageRealtimeChannel ===
                    channel &&
                    currentChatMode === "room" &&
                    currentRoom ===
                    roomAtSubscription
                ) {

                    messageRealtimeRoom =
                        roomAtSubscription;
                }
            }


            if (
                status === "CHANNEL_ERROR" ||
                status === "TIMED_OUT" ||
                status === "CLOSED"
            ) {

                console.warn(
                    "Afterhours realtime status:",
                    status
                );
            }
        }
    );
}


// ------------------------------------------------------------
// Stop current realtime listener.
// ------------------------------------------------------------

async function stopRoomMessageRealtime() {

    updateRealtimeStatus(
        "CLOSED"
    );

    if (
        !supabaseClient ||
        !messageRealtimeChannel
    ) {
        return;
    }

    const channel =
        messageRealtimeChannel;

    messageRealtimeChannel =
        null;

    messageRealtimeRoom =
        null;

    try {

        await supabaseClient.removeChannel(
            channel
        );

    } catch (err) {

        console.warn(
            "Unable to remove realtime channel:",
            err
        );
    }
}


// ============================================================
// DM REALTIME
// ============================================================

async function subscribeToDmMessages() {

    if (
        !supabaseClient ||
        !currentUser.id ||
        !currentDmConversationId
    ) {
        return;
    }


    await stopDmRealtime();


    const conversationAtSubscription =
        currentDmConversationId;


    updateRealtimeStatus(
        "CONNECTING"
    );


    const channelName =
        "afterhours-dm-" +
        conversationAtSubscription +
        "-" +
        Date.now();


    const channel =
        supabaseClient.channel(
            channelName
        );


    dmRealtimeChannel =
        channel;


    channel.on(
        "postgres_changes",
        {
            event:
                "INSERT",

            schema:
                "public",

            table:
                "dm_messages",

            filter:
                "conversation_id=eq." +
                conversationAtSubscription
        },
        async function (payload) {

            if (
                currentChatMode !== "dm" ||
                currentDmConversationId !==
                conversationAtSubscription
            ) {
                return;
            }

            const message =
                payload.new;

            if (!message) {
                return;
            }


            if (message.id) {

                const existingMessage =
                    document.querySelector(
                        '[data-message-id="' +
                        message.id +
                        '"]'
                    );

                if (existingMessage) {
                    return;
                }
            }


            let profile =
                null;


            if (message.sender_id) {

                const {
                    data,
                    error
                } = await supabaseClient
                    .from("profiles")
                    .select(
                        "id, username, display_name, bio, avatar_url, role"
                    )
                    .eq(
                        "id",
                        message.sender_id
                    )
                    .maybeSingle();

                if (error) {

                    console.error(
                        "DM realtime profile load failed:",
                        error
                    );

                } else {

                    profile =
                        data;
                }
            }


            if (
                !profile &&
                message.sender_id ===
                currentUser.id
            ) {

                profile = {

                    id:
                        currentUser.id,

                    username:
                        currentUser.username,

                    display_name:
                        currentUser.displayName,

                    bio:
                        currentUser.bio,

                    avatar_url:
                        currentUser.avatarUrl,

                    role:
                        currentUser.role
                };
            }


            if (
                currentChatMode !== "dm" ||
                currentDmConversationId !==
                conversationAtSubscription
            ) {
                return;
            }


            renderMessage(
                {
                    id:
                        message.id,

                    user_id:
                        message.sender_id,

                    content:
                        message.content,

                    created_at:
                        message.created_at
                },
                profile
            );


            const messages =
                get("messages");

            if (messages) {

                messages.scrollTop =
                    messages.scrollHeight;
            }
        }
    );


    channel.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "dm_message_reads" },
        payload => {
            const read = payload.new;
            if (!read || !read.message_id || read.reader_id === currentUser.id) return;
            dmReadMessageIds.add(read.message_id);
            const element = document.querySelector(`[data-message-id="${read.message_id}"] .dm-read-status`);
            if (element) {
                element.textContent = "Read";
                element.classList.add("read");
            }
            loadDmConversations();
        }
    );

    channel.subscribe(
        function (status) {

            console.log(
                "Afterhours DM realtime:",
                status,
                "conversation:",
                conversationAtSubscription
            );


            if (
                dmRealtimeChannel ===
                channel
            ) {

                updateRealtimeStatus(
                    status
                );
            }


            if (
                status === "CHANNEL_ERROR" ||
                status === "TIMED_OUT" ||
                status === "CLOSED"
            ) {

                console.warn(
                    "Afterhours DM realtime status:",
                    status
                );
            }
        }
    );
}


async function subscribeToDmInboxRealtime() {
    if (!supabaseClient || !currentUser.id || dmInboxRealtimeChannel) return;
    const channel = supabaseClient.channel("afterhours-dm-inbox-" + currentUser.id)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "dm_messages" }, async payload => {
            const message = payload.new;
            if (!message || message.sender_id === currentUser.id) return;
            if (message.conversation_id === currentDmConversationId && currentChatMode === "dm") {
                await markDmConversationRead(message.conversation_id);
            }
            await loadDmConversations();
        })
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "dm_message_reads" }, async () => {
            await loadDmConversations();
        });
    dmInboxRealtimeChannel = channel;
    channel.subscribe();
}

async function stopDmInboxRealtime() {
    if (!supabaseClient || !dmInboxRealtimeChannel) return;
    const channel = dmInboxRealtimeChannel;
    dmInboxRealtimeChannel = null;
    try { await supabaseClient.removeChannel(channel); } catch (err) { console.warn("Unable to remove DM inbox realtime channel:", err); }
}

async function stopDmRealtime() {

    if (
        !supabaseClient ||
        !dmRealtimeChannel
    ) {
        return;
    }

    const channel =
        dmRealtimeChannel;

    dmRealtimeChannel =
        null;

    try {

        await supabaseClient.removeChannel(
            channel
        );

    } catch (err) {

        console.warn(
            "Unable to remove DM realtime channel:",
            err
        );
    }
}


// ============================================================
// MESSAGE HELPERS
// ============================================================

function formatMessageTime(timestamp) {

    if (!timestamp) {
        return "";
    }

    return new Intl.DateTimeFormat(
        undefined,
        {
            dateStyle:
                "medium",

            timeStyle:
                "short"
        }
    ).format(
        new Date(timestamp)
    );
}


function showMessageStatus(text) {

    const messages =
        get("messages");

    if (!messages) {
        return;
    }

    messages.innerHTML = "";

    const status =
        document.createElement("p");

    status.className =
        "message-status";

    status.textContent =
        text;

    messages.appendChild(
        status
    );
}


// ============================================================
// RENDER MESSAGE
// ============================================================

function renderPurchaseAnnouncement(message, profile, messages) {
    const prefix = "__afterhours_purchase__:";
    if (!String(message.content || "").startsWith(prefix)) return false;

    let purchase;
    try {
        purchase = JSON.parse(String(message.content).slice(prefix.length));
    } catch (_) {
        return false;
    }

    const article = document.createElement("article");
    article.className = "message purchase-message";
    article.dataset.messageId = message.id || "";

    const icon = document.createElement("div");
    icon.className = "purchase-message-icon";
    icon.textContent = purchase.product === "VIP+" ? "✨" : "🌙";

    const copy = document.createElement("div");
    copy.className = "purchase-message-copy";

    const username = document.createElement("button");
    username.type = "button";
    username.className = "purchase-message-username";
    username.textContent = "@" + (purchase.username || profile?.username || "user");

    const product = document.createElement("span");
    product.textContent = ` purchased ${purchase.product || "VIP"}!`;

    copy.append(username, product);
    article.append(icon, copy);
    messages.appendChild(article);

    username.addEventListener("click", () => {
        openUserProfile({
            id: profile?.id || message.user_id,
            username: purchase.username || profile?.username || "user",
            displayName: profile?.display_name || profile?.username || purchase.username || "User",
            bio: profile?.bio || "No bio yet.",
            role: profile?.role || "Member",
            avatarUrl: profile?.avatar_url || ""
        });
    });

    return true;
}

function renderMessage(
    message,
    profile
) {

    const messages =
        get("messages");

    if (!messages || !message) {
        return;
    }

    if (renderPurchaseAnnouncement(message, profile, messages)) {
        return;
    }


    if (message.id) {

        const existingMessage =
            document.querySelector(
                '[data-message-id="' +
                message.id +
                '"]'
            );

        if (existingMessage) {
            return;
        }
    }


    const user =
        profile || {};


    const usernameValue =
        user.username ||
        "user";


    const displayName =
        user.display_name ||
        user.displayName ||
        usernameValue;


    const name =
        displayName;


    const role =
        getEffectiveRole(
            user
        );


    let avatarUrl =
        user.avatar_url ||
        user.avatarUrl ||
        "";


    if (
        !avatarUrl &&
        user.id === currentUser.id
    ) {

        avatarUrl =
            currentUser.avatarUrl ||
            localStorage.getItem(
                "afterhours-avatar-" +
                currentUser.id
            ) ||
            "";
    }


    const messageElement =
        document.createElement("article");

    messageElement.className =
        "message";

    messageElement.dataset.messageId =
        message.id || "";
    messageElement.dataset.rawContent =
        message.content || "";


    const avatar =
        document.createElement("div");

    avatar.className =
        "avatar clickable-profile";

    avatar.tabIndex =
        0;

    avatar.setAttribute(
        "role",
        "button"
    );

    avatar.setAttribute(
        "aria-label",
        "Open " +
        name +
        " profile"
    );


    updateAvatar(
        avatar,
        name,
        avatarUrl
    );


    const content =
        document.createElement("div");

    content.className =
        "message-content";


    const header =
        document.createElement("div");

    header.className =
        "message-header";


    const displayNameElement =
        document.createElement("strong");

    displayNameElement.className =
        "message-display-name";

    displayNameElement.textContent =
        displayName;


    const username =
        document.createElement("button");

    username.type =
        "button";

    username.className =
        "message-username";

    username.textContent =
        "@" +
        usernameValue;


    const roleElement =
        document.createElement("span");

    roleElement.className =
        "role";


    applyRank(
        roleElement,
        role
    );


    const timestamp =
        document.createElement("time");

    timestamp.className =
        "message-timestamp";

    timestamp.dateTime =
        message.created_at || "";

    timestamp.textContent =
        formatMessageTime(
            message.created_at
        );

    const edited = document.createElement("span");
    edited.className = "message-edited";
    if (message.edited_at) {
        edited.textContent = "(edited)";
        edited.title = "Edited " + formatMessageTime(message.edited_at);
    }


    const parsedContent =
        parseMessageContent(message.content);

    const textElement =
        document.createElement("p");

    textElement.textContent =
        parsedContent.text;

    header.appendChild(
        displayNameElement
    );

    header.appendChild(
        username
    );

    header.appendChild(
        roleElement
    );

    header.appendChild(
        timestamp
    );

    if (message.edited_at) {
        header.appendChild(edited);
    }


    content.appendChild(
        header
    );

    if (parsedContent.reply) {
        const replyPreview = document.createElement("div");
        replyPreview.className = "message-reply-preview";
        const replyLabel = document.createElement("strong");
        replyLabel.textContent = "↪ @" + (parsedContent.reply.username || "user");
        const replyText = document.createElement("span");
        replyText.textContent = parsedContent.reply.text || "Attachment";
        replyPreview.append(replyLabel, replyText);
        content.appendChild(replyPreview);
    }

    if (parsedContent.text) {
        content.appendChild(
            textElement
        );
    }

    if (parsedContent.attachment) {
        const attachmentWrap = document.createElement("div");
        attachmentWrap.className = "message-attachment";

        if (parsedContent.attachment.type && parsedContent.attachment.type.startsWith("image/")) {
            const image = document.createElement("img");
            image.className = "message-image";
            image.alt = parsedContent.attachment.name || "Image attachment";
            image.loading = "lazy";
            image.dataset.attachmentPath = parsedContent.attachment.path || "";
            image.addEventListener("click", () => {
                if (image.src) window.open(image.src, "_blank", "noopener,noreferrer");
            });
            getChatAttachmentUrl(parsedContent.attachment.path).then(url => {
                if (url) image.src = url;
            });
            attachmentWrap.appendChild(image);
        } else {
            const link = document.createElement("a");
            link.className = "message-file";
            link.href = "#";
            link.innerHTML = "";

            const icon = document.createElement("span");
            icon.className = "message-file-icon";
            icon.textContent = "📎";

            const info = document.createElement("span");
            info.className = "message-file-info";

            const fileName = document.createElement("div");
            fileName.className = "message-file-name";
            fileName.textContent = parsedContent.attachment.name || "Attached file";

            const meta = document.createElement("div");
            meta.className = "message-file-meta";
            meta.textContent = formatFileSize(parsedContent.attachment.size || 0);

            info.appendChild(fileName);
            info.appendChild(meta);
            link.appendChild(icon);
            link.appendChild(info);

            link.addEventListener("click", async event => {
                event.preventDefault();
                const url = await getChatAttachmentUrl(parsedContent.attachment.path);
                if (url) window.open(url, "_blank", "noopener,noreferrer");
            });

            attachmentWrap.appendChild(link);
        }

        content.appendChild(attachmentWrap);
    }


    if (currentChatMode === "dm" && message.user_id === currentUser.id && message.id) {
        const readStatus = document.createElement("div");
        readStatus.className = "dm-read-status";
        if (dmReadMessageIds.has(message.id)) {
            readStatus.textContent = "Read";
            readStatus.classList.add("read");
        } else {
            readStatus.textContent = "Unread";
        }
        content.appendChild(readStatus);
    }


    const actions = document.createElement("div");
    actions.className = "message-actions";

    const replyButton = document.createElement("button");
    replyButton.type = "button";
    replyButton.className = "message-action-button";
    replyButton.textContent = "↩ Reply";
    replyButton.title = "Reply to this message";
    replyButton.addEventListener("click", event => {
        event.stopPropagation();
        startReply(message, user, parsedContent);
    });
    actions.appendChild(replyButton);

    if (currentChatMode === "room" && message.user_id === currentUser.id && !String(message.content || "").startsWith("__afterhours_purchase__:")) {
        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "message-action-button";
        editButton.textContent = "✎ Edit";
        editButton.title = "Edit your message";
        editButton.addEventListener("click", event => {
            event.stopPropagation();
            startEditingMessage(message, parsedContent);
        });
        actions.appendChild(editButton);
    }

    messageElement.appendChild(actions);

    messageElement.appendChild(
        avatar
    );

    messageElement.appendChild(
        content
    );


    messages.appendChild(
        messageElement
    );


    const openProfileForMessage =
        function () {

            openUserProfile({

                id:
                    user.id ||
                    message.user_id,

                username:
                    usernameValue,

                displayName:
                    displayName,

                bio:
                    user.bio ||
                    "No bio yet.",

                role:
                    role,

                avatarUrl:
                    avatarUrl
            });
        };


    avatar.addEventListener(
        "click",
        openProfileForMessage
    );

    username.addEventListener(
        "click",
        openProfileForMessage
    );


    avatar.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Enter" ||
                event.key === " "
            ) {

                event.preventDefault();

                openProfileForMessage();
            }
        }
    );
}


// ============================================================
// LOAD MESSAGES
// ============================================================

async function loadMessages() {

    if (currentChatMode !== "room") {
        return;
    }

    const loadVersion =
        ++messageLoadVersion;


    if (
        !supabaseClient ||
        !currentUser.id
    ) {

        showMessageStatus(
            "Messages are unavailable right now."
        );

        return;
    }


    showMessageStatus(
        "Loading messages..."
    );


    const {
        data: messages,
        error
    } = await supabaseClient
        .from("messages")
        .select(
            "id, user_id, room, content, created_at, edited_at"
        )
        .eq(
            "room",
            currentRoom
        )
        .order(
            "created_at",
            {
                ascending:
                    true
            }
        );


    if (
        loadVersion !==
        messageLoadVersion
    ) {
        return;
    }


    if (error) {

        console.error(error);

        showMessageStatus(
            "Unable to load messages."
        );

        return;
    }


    const userIds =
        [
            ...new Set(
                (messages || [])
                    .map(
                        function (message) {

                            return message.user_id;
                        }
                    )
                    .filter(Boolean)
            )
        ];


    let profiles =
        [];


    if (userIds.length) {

        const {
            data,
            error: profileError
        } = await supabaseClient
            .from("profiles")
            .select(
                "id, username, display_name, bio, avatar_url, role"
            )
            .in(
                "id",
                userIds
            );


        if (profileError) {

            console.error(
                profileError
            );

        } else {

            profiles =
                data || [];
        }
    }


    if (
        loadVersion !==
        messageLoadVersion
    ) {
        return;
    }


    const profilesById =
        new Map(
            profiles.map(
                function (profile) {

                    return [
                        profile.id,
                        profile
                    ];
                }
            )
        );


    if (currentUser.id) {

        const localAvatar =
            localStorage.getItem(
                "afterhours-avatar-" +
                currentUser.id
            );


        if (
            localAvatar &&
            currentUser.avatarUrl !==
            localAvatar
        ) {

            currentUser.avatarUrl =
                currentUser.avatarUrl ||
                localAvatar;
        }


        const currentProfile =
            profilesById.get(
                currentUser.id
            );


        if (currentProfile) {

            if (
                !currentProfile.avatar_url &&
                currentUser.avatarUrl
            ) {

                currentProfile.avatar_url =
                    currentUser.avatarUrl;
            }

        } else {

            profilesById.set(
                currentUser.id,
                {

                    id:
                        currentUser.id,

                    username:
                        currentUser.username,

                    display_name:
                        currentUser.displayName,

                    bio:
                        currentUser.bio,

                    avatar_url:
                        currentUser.avatarUrl,

                    role:
                        currentUser.role
                }
            );
        }
    }


    const container =
        get("messages");

    if (!container) {
        return;
    }


    container.innerHTML =
        "";


    if (
        !messages ||
        !messages.length
    ) {

        container.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon">${rooms[currentRoom].title.substring(0, 2)}</div>
                <h3>Welcome to ${rooms[currentRoom].title.substring(2)}</h3>
                <p>Send the first message.</p>
            </div>
        `;

        return;
    }


    messages.forEach(
        function (message) {

            renderMessage(
                message,
                profilesById.get(
                    message.user_id
                )
            );
        }
    );


    container.scrollTop =
        container.scrollHeight;
}


// ============================================================
// SEND PUBLIC MESSAGE
// ============================================================

async function sendMessage() {

    if (currentChatMode === "dm") {
        await sendDmMessage();
        return;
    }

    const input =
        get("messageInput");

    const messages =
        get("messages");

    if (!input || !messages) {
        return;
    }

    if (editingMessageId) {
        await editMessage(editingMessageId, input.value.trim());
        return;
    }


    const text =
        input.value.trim();

    if (text && handleChatCommand(text)) {
        input.value = "";
        return;
    }

    if (
        (!text && !pendingAttachment) ||
        !supabaseClient ||
        !currentUser.id
    ) {
        return;
    }


    if (
        currentUser.muted ||
        currentUser.restricted
    ) {

        alert(
            currentUser.muted
                ? "You are currently muted."
                : "You are currently restricted."
        );

        return;
    }


    const form =
        get("messageForm");


    const button =
        form
            ? form.querySelector("button")
            : null;


    if (button) {
        button.disabled =
            true;
    }


    try {

        const messageContent =
            await appendAttachmentToMessage(
                text,
                pendingAttachment,
                replyingToMessage
            );

        const {
            data: message,
            error
        } = await supabaseClient.rpc(
            "afterhours_send_message",
            {

                message_room:
                    currentRoom,

                message_content:
                    messageContent
            }
        );


        if (error) {

            console.error(error);

            alert(
                error.message ||
                "Unable to send your message."
            );

            await checkModerationStatus();

            return;
        }


        input.value =
            "";

        clearPendingAttachment();
        clearMessageAction();

        renderMessage(
            message,
            {

                id:
                    currentUser.id,

                username:
                    currentUser.username,

                display_name:
                    currentUser.displayName,

                bio:
                    currentUser.bio,

                avatar_url:
                    currentUser.avatarUrl,

                role:
                    currentUser.role
            }
        );


        messages.scrollTop =
            messages.scrollHeight;


    } catch (err) {

        console.error(err);

        alert(
            "Something went wrong while sending your message."
        );

    } finally {

        if (button) {

            button.disabled =
                currentUser.muted ||
                currentUser.restricted;
        }
    }
}


// ============================================================
// DIRECT MESSAGES
// ============================================================

// ============================================================
// DIRECT MESSAGES
// ============================================================

let userSearchTimer = null;

let userSearchVersion = 0;


function getSidebar() {
    return document.querySelector(".sidebar");
}


function setSidebarInboxOpen(isOpen) {

    const sidebar =
        getSidebar();

    if (!sidebar) {
        return;
    }

    sidebar.classList.toggle(
        "inbox-open",
        Boolean(isOpen)
    );
}


function hideSidebarViews() {

    [
        "sidebarRoomsView",
        "sidebarMessagesView",
        "sidebarNewMessageView"
    ].forEach(function (id) {

        const el = get(id);

        if (el) {
            el.classList.add("hidden");
        }
    });
}


function showRoomsSidebar() {

    hideSidebarViews();

    const roomsView =
        get("sidebarRoomsView");

    if (roomsView) {
        roomsView.classList.remove("hidden");
    }

    setSidebarInboxOpen(false);
}


function showMessagesView() {

    hideSidebarViews();

    const messagesView =
        get("sidebarMessagesView");

    if (messagesView) {
        messagesView.classList.remove("hidden");
    }

    setSidebarInboxOpen(true);

    subscribeToDmInboxRealtime();
    loadDmConversations();
}


function showNewMessageView() {

    hideSidebarViews();

    const newMessageView =
        get("sidebarNewMessageView");

    if (newMessageView) {
        newMessageView.classList.remove("hidden");
    }

    setSidebarInboxOpen(true);

    const input =
        get("dmUsername");

    const status =
        get("dmSearchStatus");

    const results =
        get("userSearchResults");

    if (input) {
        input.value = "";
    }

    if (status) {
        status.textContent =
            "Search by name or username.";
    }

    if (results) {
        results.innerHTML = "";
    }

    setTimeout(function () {

        if (input) {
            input.focus();
        }

    }, 50);
}


function toggleDmList() {

    const messagesView =
        get("sidebarMessagesView");

    if (
        messagesView &&
        !messagesView.classList.contains("hidden")
    ) {

        loadDmConversations();
        return;
    }

    showMessagesView();
}


function truncatePreview(text) {

    const clean =
        String(text || "")
            .replace(/\s+/g, " ")
            .trim();

    if (!clean) {
        return "No messages yet.";
    }

    if (clean.length <= 52) {
        return clean;
    }

    return clean.slice(0, 49) + "...";
}


function highlightInboxConversation() {

    const list =
        get("dmList");

    if (!list) {
        return;
    }

    list.querySelectorAll(".inbox-item")
        .forEach(function (item) {

            item.classList.toggle(
                "active",
                item.dataset.conversationId ===
                    currentDmConversationId
            );
        });
}


function renderInboxItem(user, preview, conversationId, unreadCount = 0) {

    const button =
        document.createElement("button");

    button.type =
        "button";

    button.className =
        "inbox-item";

    if (conversationId) {

        button.dataset.conversationId =
            conversationId;
    }

    if (
        conversationId &&
        conversationId === currentDmConversationId
    ) {

        button.classList.add("active");
    }

    if (Number(unreadCount) > 0) {
        button.classList.add("unread");
    }


    const avatar =
        document.createElement("span");

    avatar.className =
        "avatar";


    updateAvatar(
        avatar,
        user.display_name ||
        user.username ||
        "User",
        user.avatar_url || ""
    );


    const textContainer =
        document.createElement("span");

    textContainer.className =
        "inbox-item-text";


    const name =
        document.createElement("span");

    name.className =
        "inbox-item-name";

    name.textContent =
        user.display_name ||
        user.username ||
        "User";


    const username =
        document.createElement("span");

    username.className =
        "inbox-item-username";

    username.textContent =
        "@" +
        (user.username || "user");


    textContainer.appendChild(name);
    textContainer.appendChild(username);


    if (preview !== null) {

        const previewElement =
            document.createElement("span");

        previewElement.className =
            "inbox-item-preview";

        previewElement.textContent =
            truncatePreview(preview);

        textContainer.appendChild(
            previewElement
        );
    }


    button.appendChild(avatar);
    button.appendChild(textContainer);

    if (Number(unreadCount) > 0) {
        const badge = document.createElement("span");
        badge.className = "inbox-unread-badge";
        badge.textContent = Number(unreadCount) > 99 ? "99+" : String(unreadCount);
        button.appendChild(badge);
    }

    return button;
}


function renderDmList(conversations) {

    const list =
        get("dmList");

    if (!list) {
        return;
    }


    list.innerHTML =
        "";


    if (!conversations.length) {

        const empty =
            document.createElement("p");

        empty.className =
            "inbox-empty";

        empty.textContent =
            "No conversations yet.";

        list.appendChild(
            empty
        );

        return;
    }


    conversations.forEach(
        function (conversation) {

            const user =
                conversation.user;

            if (!user) {
                return;
            }


            const button =
                renderInboxItem(
                    user,
                    conversation.preview,
                    conversation.id,
                    conversation.unread_count || 0
                );


            button.addEventListener(
                "click",
                function () {

                    openDmConversation(
                        conversation.id,
                        user
                    );
                }
            );


            list.appendChild(
                button
            );
        }
    );
}


async function loadLatestDmPreviews(conversationIds) {

    const previews =
        new Map();

    if (
        !supabaseClient ||
        !conversationIds.length
    ) {
        return previews;
    }


    await Promise.all(
        conversationIds.map(
            async function (conversationId) {

                const {
                    data,
                    error
                } = await supabaseClient
                    .from("dm_messages")
                    .select(
                        "conversation_id, content, created_at"
                    )
                    .eq(
                        "conversation_id",
                        conversationId
                    )
                    .order(
                        "created_at",
                        {
                            ascending:
                                false
                        }
                    )
                    .limit(1);


                if (error) {

                    console.error(
                        "Unable to load message preview:",
                        error
                    );

                    return;
                }


                if (data && data[0]) {

                    previews.set(
                        conversationId,
                        data[0]
                    );
                }
            }
        )
    );


    return previews;
}


async function loadDmUnreadCounts() {
    const counts = new Map();
    if (!supabaseClient || !currentUser.id) return counts;
    const { data, error } = await supabaseClient.rpc("afterhours_get_dm_unread_counts");
    if (error) {
        console.error("Unable to load DM unread counts:", error);
        return counts;
    }
    (data || []).forEach(row => {
        if (row && row.conversation_id) counts.set(row.conversation_id, Number(row.unread_count || 0));
    });
    return counts;
}

async function loadDmReadState(conversationId) {
    dmReadMessageIds = new Set();
    if (!supabaseClient || !conversationId) return;
    const { data, error } = await supabaseClient.rpc("afterhours_get_dm_read_state", { p_conversation_id: conversationId });
    if (error) {
        console.error("Unable to load DM read state:", error);
        return;
    }
    (data || []).forEach(row => {
        if (row && row.message_id && row.read_by_recipient) dmReadMessageIds.add(row.message_id);
    });
}

async function markDmConversationRead(conversationId) {
    if (!supabaseClient || !currentUser.id || !conversationId) return;
    const { error } = await supabaseClient.rpc("afterhours_mark_dm_read", { p_conversation_id: conversationId });
    if (error) {
        console.error("Unable to mark DM as read:", error);
        return;
    }
    await loadDmReadState(conversationId);
}

async function loadDmConversations() {

    if (
        !supabaseClient ||
        !currentUser.id
    ) {
        return;
    }


    const list =
        get("dmList");

    if (!list) {
        return;
    }


    const {
        data: conversations,
        error
    } = await supabaseClient
        .from("dm_conversations")
        .select(
            "id, participant_one, participant_two, created_at"
        )
        .or(
            "participant_one.eq." +
            currentUser.id +
            ",participant_two.eq." +
            currentUser.id
        )
        .order(
            "created_at",
            {
                ascending:
                    false
            }
        );


    if (error) {

        console.error(
            "Unable to load DM conversations:",
            error
        );

        list.innerHTML = "";

        const errorText =
            document.createElement("p");

        errorText.className =
            "inbox-empty";

        errorText.textContent =
            "Unable to load messages.";

        list.appendChild(
            errorText
        );

        return;
    }


    const rows =
        conversations || [];


    const otherUserIds =
        [
            ...new Set(
                rows
                    .map(
                        function (conversation) {

                            return conversation.participant_one ===
                                currentUser.id
                                ? conversation.participant_two
                                : conversation.participant_one;
                        }
                    )
                    .filter(Boolean)
            )
        ];


    let profiles =
        [];


    if (otherUserIds.length) {

        const {
            data,
            error: profileError
        } = await supabaseClient
            .from("profiles")
            .select(
                "id, username, display_name, bio, avatar_url, role"
            )
            .in(
                "id",
                otherUserIds
            );


        if (profileError) {

            console.error(
                "Unable to load DM profiles:",
                profileError
            );

        } else {

            profiles =
                data || [];
        }
    }


    const profilesById =
        new Map(
            profiles.map(
                function (profile) {

                    return [
                        profile.id,
                        profile
                    ];
                }
            )
        );


    const conversationIds =
        rows.map(function (conversation) {
            return conversation.id;
        });


    const previewsById =
        await loadLatestDmPreviews(
            conversationIds
        );

    const unreadById =
        await loadDmUnreadCounts();


    const formatted =
        rows.map(
            function (conversation) {

                const otherUserId =
                    conversation.participant_one ===
                    currentUser.id
                        ? conversation.participant_two
                        : conversation.participant_one;

                const previewRow =
                    previewsById.get(
                        conversation.id
                    );

                return {

                    id:
                        conversation.id,

                    created_at:
                        conversation.created_at,

                    last_message_at:
                        (previewRow &&
                            previewRow.created_at) ||
                        conversation.created_at,

                    preview:
                        previewRow
                            ? previewRow.content
                            : "No messages yet.",

                    unread_count:
                        unreadById.get(conversation.id) || 0,

                    user:
                        profilesById.get(
                            otherUserId
                        )
                };
            }
        ).filter(
            function (conversation) {
                return Boolean(conversation.user);
            }
        );


    formatted.sort(
        function (a, b) {

            return new Date(b.last_message_at) -
                new Date(a.last_message_at);
        }
    );


    renderDmList(
        formatted
    );
}


// ------------------------------------------------------------
// Find user by username
// ------------------------------------------------------------

async function findUserByUsername(username) {

    if (
        !supabaseClient ||
        !currentUser.id
    ) {
        return null;
    }


    const cleanUsername =
        username
            .trim()
            .replace(/^@/, "");


    if (!cleanUsername) {
        return null;
    }


    const {
        data,
        error
    } = await supabaseClient
        .from("profiles")
        .select(
            "id, username, display_name, bio, avatar_url, role"
        )
        .eq(
            "username",
            cleanUsername
        )
        .maybeSingle();


    if (error) {

        console.error(
            "Username search failed:",
            error
        );

        throw error;
    }


    return data || null;
}


// ------------------------------------------------------------
// Open New DM modal
// ------------------------------------------------------------

function openNewDmModal() {

    showNewMessageView();
}


function closeNewDmModal() {

    showMessagesView();
}


function sanitizeSearchQuery(value) {

    return String(value || "")
        .trim()
        .replace(/^@/, "")
        .replace(/[,%()]/g, "");
}


function renderUserSearchResults(users) {

    const results =
        get("userSearchResults");

    const status =
        get("dmSearchStatus");

    if (!results) {
        return;
    }


    results.innerHTML =
        "";


    if (!users.length) {

        if (status) {
            status.textContent =
                "No users found.";
        }

        return;
    }


    if (status) {
        status.textContent =
            "";
    }


    users.forEach(
        function (user) {

            const button =
                renderInboxItem(
                    user,
                    null,
                    null
                );


            button.addEventListener(
                "click",
                async function () {

                    showMessagesView();

                    await openDmWithUser(
                        user
                    );
                }
            );


            results.appendChild(
                button
            );
        }
    );
}


async function searchUsersLive(rawQuery) {

    const status =
        get("dmSearchStatus");

    const results =
        get("userSearchResults");


    if (
        !supabaseClient ||
        !currentUser.id
    ) {

        if (status) {
            status.textContent =
                "Search is unavailable right now.";
        }

        return;
    }


    const query =
        sanitizeSearchQuery(
            rawQuery
        );


    const searchVersion =
        ++userSearchVersion;


    if (!query) {

        if (results) {
            results.innerHTML = "";
        }

        if (status) {
            status.textContent =
                "Search by name or username.";
        }

        return;
    }


    if (status) {
        status.textContent =
            "Searching...";
    }


    const pattern =
        "%" +
        query.replace(/\\/g, "\\\\")
            .replace(/%/g, "\\%")
            .replace(/_/g, "\\_") +
        "%";


    const {
        data,
        error
    } = await supabaseClient
        .from("profiles")
        .select(
            "id, username, display_name, bio, avatar_url, role"
        )
        .or(
            "username.ilike.\"" +
            pattern +
            "\",display_name.ilike.\"" +
            pattern +
            "\""
        )
        .limit(20);


    if (searchVersion !== userSearchVersion) {
        return;
    }


    if (error) {

        console.error(
            "User search failed:",
            error
        );


        try {

            const user =
                await findUserByUsername(
                    query
                );


            if (searchVersion !== userSearchVersion) {
                return;
            }


            if (
                user &&
                user.id !== currentUser.id
            ) {

                renderUserSearchResults(
                    [user]
                );

                return;
            }

        } catch (fallbackError) {

            console.error(
                fallbackError
            );
        }


        if (status) {
            status.textContent =
                "Unable to search users.";
        }

        if (results) {
            results.innerHTML = "";
        }

        return;
    }


    const users =
        (data || []).filter(
            function (user) {

                return user.id !== currentUser.id;
            }
        );


    renderUserSearchResults(
        users
    );
}


function handleUserSearchInput() {

    const input =
        get("dmUsername");

    const query =
        input
            ? input.value
            : "";


    if (userSearchTimer) {

        clearTimeout(
            userSearchTimer
        );
    }


    userSearchTimer =
        setTimeout(
            function () {

                searchUsersLive(
                    query
                );

            },
            160
        );
}


// ------------------------------------------------------------
// Start DM from username search
// ------------------------------------------------------------

async function startNewDm() {

    const input =
        get("dmUsername");

    const status =
        get("dmSearchStatus");

    const button =
        get("startDmButton");


    if (!input) {
        return;
    }


    const username =
        input.value.trim();


    if (!username) {

        if (status) {
            status.textContent =
                "Enter a username.";
        }

        return;
    }


    if (button) {
        button.disabled = true;
        button.textContent = "Searching...";
    }


    if (status) {
        status.textContent =
            "";
    }


    try {

        const user =
            await findUserByUsername(
                username
            );


        if (!user) {

            if (status) {
                status.textContent =
                    "User not found.";
            }

            return;
        }


        if (
            user.id ===
            currentUser.id
        ) {

            if (status) {
                status.textContent =
                    "You cannot message yourself.";
            }

            return;
        }


        closeNewDmModal();


        await openDmWithUser(
            user
        );

    } catch (err) {

        console.error(err);

        if (status) {
            status.textContent =
                err.message ||
                "Unable to find that user.";
        }

    } finally {

        if (button) {
            button.disabled = false;
            button.textContent =
                "Start Conversation";
        }
    }
}


// ------------------------------------------------------------
// Open/create DM with a user
// ------------------------------------------------------------

async function openDmWithUser(user) {

    if (!user || !user.id) {
        return;
    }


    if (
        !currentUser.id ||
        user.id === currentUser.id
    ) {
        return;
    }


    if (!supabaseClient) {

        alert(
            "Messages are currently unavailable."
        );

        return;
    }


    try {

        const { data: targetProfile } = await supabaseClient
            .from("profiles")
            .select("settings")
            .eq("id", user.id)
            .maybeSingle();
        if (targetProfile?.settings?.allowDMs === false) {
            alert("This user is not accepting direct messages right now.");
            return;
        }

        const {
            data: conversationId,
            error
        } = await supabaseClient.rpc(
            "afterhours_get_or_create_dm",
            {
                target_user_id:
                    user.id
            }
        );


        if (error) {

            console.error(error);

            alert(
                error.message ||
                "Unable to start this conversation."
            );

            return;
        }


        if (!conversationId) {

            alert(
                "Unable to create this conversation."
            );

            return;
        }


        await openDmConversation(
            conversationId,
            user
        );


        loadDmConversations();

    } catch (err) {

        console.error(err);

        alert(
            err.message ||
            "Something went wrong while opening this conversation."
        );
    }
}


// ------------------------------------------------------------
// Open a DM conversation
// ------------------------------------------------------------

async function openDmConversation(
    conversationId,
    user
) {

    if (
        !conversationId ||
        !user
    ) {
        return;
    }


    currentChatMode =
        "dm";

    currentDmConversationId =
        conversationId;

    currentDmUser =
        user;


    document
        .querySelectorAll(".room")
        .forEach(
            function (button) {

                button.classList.remove(
                    "active"
                );
            }
        );


    highlightInboxConversation();


    await stopRoomMessageRealtime();


    const roomTitle =
        get("roomTitle");

    const roomDescription =
        get("roomDescription");


    if (roomTitle) {

        roomTitle.textContent =
            "💬 @" +
            (user.username || "user");
    }


    if (roomDescription) {

        roomDescription.textContent =
            "Private conversation";
    }


    updateMessageInputState();


    await subscribeToDmMessages();

    await loadDmMessages();


    const messages =
        get("messages");

    if (messages) {

        messages.scrollTop =
            messages.scrollHeight;
    }
}


// ------------------------------------------------------------
// Load DM messages
// ------------------------------------------------------------

async function loadDmMessages() {

    const loadVersion =
        ++messageLoadVersion;


    if (
        !supabaseClient ||
        !currentUser.id ||
        !currentDmConversationId
    ) {

        showMessageStatus(
            "Messages are unavailable right now."
        );

        return;
    }


    showMessageStatus(
        "Loading messages..."
    );


    const conversationAtLoad =
        currentDmConversationId;


    const {
        data: messages,
        error
    } = await supabaseClient
        .from("dm_messages")
        .select(
            "id, conversation_id, sender_id, content, created_at"
        )
        .eq(
            "conversation_id",
            conversationAtLoad
        )
        .order(
            "created_at",
            {
                ascending:
                    true
            }
        );


    if (
        loadVersion !==
        messageLoadVersion ||
        currentChatMode !== "dm" ||
        currentDmConversationId !==
        conversationAtLoad
    ) {
        return;
    }


    if (error) {

        console.error(error);

        showMessageStatus(
            "Unable to load messages."
        );

        return;
    }


    const senderIds =
        [
            ...new Set(
                (messages || [])
                    .map(
                        function (message) {

                            return message.sender_id;
                        }
                    )
                    .filter(Boolean)
            )
        ];


    let profiles =
        [];


    if (senderIds.length) {

        const {
            data,
            error: profileError
        } = await supabaseClient
            .from("profiles")
            .select(
                "id, username, display_name, bio, avatar_url, role"
            )
            .in(
                "id",
                senderIds
            );


        if (profileError) {

            console.error(
                "Unable to load DM profiles:",
                profileError
            );

        } else {

            profiles =
                data || [];
        }
    }


    if (
        loadVersion !==
        messageLoadVersion ||
        currentChatMode !== "dm" ||
        currentDmConversationId !==
        conversationAtLoad
    ) {
        return;
    }


    const profilesById =
        new Map(
            profiles.map(
                function (profile) {

                    return [
                        profile.id,
                        profile
                    ];
                }
            )
        );


    if (currentUser.id) {

        const currentProfile =
            profilesById.get(
                currentUser.id
            );


        if (currentProfile) {

            if (
                !currentProfile.avatar_url &&
                currentUser.avatarUrl
            ) {

                currentProfile.avatar_url =
                    currentUser.avatarUrl;
            }

        } else {

            profilesById.set(
                currentUser.id,
                {

                    id:
                        currentUser.id,

                    username:
                        currentUser.username,

                    display_name:
                        currentUser.displayName,

                    bio:
                        currentUser.bio,

                    avatar_url:
                        currentUser.avatarUrl,

                    role:
                        currentUser.role
                }
            );
        }
    }


    await loadDmReadState(conversationAtLoad);
    await markDmConversationRead(conversationAtLoad);

    const container =
        get("messages");

    if (!container) {
        return;
    }


    container.innerHTML =
        "";


    if (
        !messages ||
        !messages.length
    ) {

        container.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon">💬</div>
                <h3>Start a conversation with @${currentDmUser ? currentDmUser.username : "user"}</h3>
                <p>Send the first private message.</p>
            </div>
        `;

        return;
    }


    messages.forEach(
        function (message) {

            renderMessage(
                {
                    id:
                        message.id,

                    user_id:
                        message.sender_id,

                    content:
                        message.content,

                    created_at:
                        message.created_at
                },
                profilesById.get(
                    message.sender_id
                )
            );
        }
    );


    container.scrollTop =
        container.scrollHeight;
}


// ------------------------------------------------------------
// Send DM
// ------------------------------------------------------------

async function sendDmMessage() {

    const input =
        get("messageInput");

    const messages =
        get("messages");

    if (
        !input ||
        !messages
    ) {
        return;
    }


    const text =
        input.value.trim();

    const dmContent = buildMessageContent(text, null, replyingToMessage);


    if (
        !text ||
        !supabaseClient ||
        !currentUser.id ||
        !currentDmConversationId
    ) {
        return;
    }


    if (
        currentUser.muted ||
        currentUser.restricted
    ) {

        alert(
            currentUser.muted
                ? "You are currently muted."
                : "You are currently restricted."
        );

        return;
    }


    const form =
        get("messageForm");


    const button =
        form
            ? form.querySelector("button")
            : null;


    if (button) {
        button.disabled =
            true;
    }


    try {

        const {
            data: message,
            error
        } = await supabaseClient.rpc(
            "afterhours_send_dm_message",
            {
                target_conversation_id:
                    currentDmConversationId,

                message_content:
                    dmContent
            }
        );


        if (error) {

            console.error(error);

            alert(
                error.message ||
                "Unable to send your message."
            );

            await checkModerationStatus();

            return;
        }


        input.value =
            "";
        clearMessageAction();


        const dmMessage =
            Array.isArray(message)
                ? message[0]
                : message;


        if (dmMessage) {

            renderMessage(
                {
                    id:
                        dmMessage.id,

                    user_id:
                        dmMessage.sender_id,

                    content:
                        dmMessage.content,

                    created_at:
                        dmMessage.created_at
                },
                {

                    id:
                        currentUser.id,

                    username:
                        currentUser.username,

                    display_name:
                        currentUser.displayName,

                    bio:
                        currentUser.bio,

                    avatar_url:
                        currentUser.avatarUrl,

                    role:
                        currentUser.role
                }
            );
        }


        messages.scrollTop =
            messages.scrollHeight;


        loadDmConversations();


    } catch (err) {

        console.error(err);

        alert(
            "Something went wrong while sending your message."
        );

    } finally {

        if (button) {

            button.disabled =
                currentUser.muted ||
                currentUser.restricted;
        }
    }
}


// ============================================================
// ROOMS
// ============================================================

const rooms = {
    general: { title: "💬 General", description: "Talk. Connect. Chill.", isBuiltin: true, allowed_roles: null },
    gaming: { title: "🎮 Gaming", description: "Talk about games.", isBuiltin: true, allowed_roles: null },
    music: { title: "🎵 Music", description: "Share music and discover new stuff.", isBuiltin: true, allowed_roles: null }
};

const roomMeta = new Map();

function canAccessRoom(room) {
    if (!room || room.isBuiltin || !Array.isArray(room.allowed_roles) || !room.allowed_roles.length) return true;
    if (currentUser?.role === "Owner") return true;
    return room.allowed_roles.includes(currentUser?.role || "Member");
}


async function changeRoom(
    roomName,
    button
) {

    const room =
        rooms[roomName];

    if (!room) {
        return;
    }

    if (!canAccessRoom(room)) {
        alert("You do not have access to this room.");
        return;
    }


    currentChatMode =
        "room";

    currentDmConversationId =
        null;

    currentDmUser =
        null;


    currentRoom =
        roomName;


    showRoomsSidebar();


    document
        .querySelectorAll(".room")
        .forEach(
            function (btn) {

                btn.classList.remove(
                    "active"
                );
            }
        );


    if (button) {

        button.classList.add(
            "active"
        );
    }


    const roomTitle =
        get("roomTitle");

    const roomDescription =
        get("roomDescription");


    if (roomTitle) {

        roomTitle.textContent =
            room.title;
    }


    if (roomDescription) {

        roomDescription.textContent =
            room.description;
    }


    updateMessageInputState();


    await stopDmRealtime();

    subscribeToRoomMessages();

    loadMessages();
}




/* FRIENDS v0.6 FIXED LOGIC */
let friendsCache = [];
let friendRequestsCache = [];
let friendsRealtimeChannel = null;

async function sendFriendRequest(targetUserId) {
    if (!supabaseClient || !currentUser.id || !targetUserId || targetUserId === currentUser.id) return;
    const { data: targetProfile } = await supabaseClient.from("profiles").select("settings").eq("id", targetUserId).maybeSingle();
    if (targetProfile?.settings?.allowFriends === false) { alert("This user is not accepting friend requests right now."); return; }
    const { data: existing, error: checkError } = await supabaseClient.from("friend_requests").select("id,status,sender_id,receiver_id").or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${currentUser.id})`).in("status", ["pending","accepted"]).limit(1).maybeSingle();
    if (checkError) { console.error("Friend request check failed:", checkError); alert("Couldn't check friendship status."); return; }
    if (existing?.status === "accepted") { alert("You're already friends."); return; }
    if (existing?.status === "pending") { alert(existing.sender_id === currentUser.id ? "Friend request already sent." : "This user already sent you a friend request."); return; }
    const { error } = await supabaseClient.from("friend_requests").insert({ sender_id: currentUser.id, receiver_id: targetUserId, status: "pending" });
    if (error) { console.error("Friend request failed:", error); alert("Couldn't send the friend request."); return; }
    await updateProfileFriendButton(targetUserId);
}

async function respondToFriendRequest(requestId, accept) {
    if (!supabaseClient || !currentUser.id) return;
    const { error } = await supabaseClient.from("friend_requests").update({ status: accept ? "accepted" : "declined", responded_at: new Date().toISOString() }).eq("id", requestId).eq("receiver_id", currentUser.id).eq("status", "pending");
    if (error) { console.error("Friend request response failed:", error); alert("Couldn't update the friend request."); return; }
    await loadFriends();
}

async function loadFriends() {
    if (!supabaseClient || !currentUser.id) return;
    const { data, error } = await supabaseClient.from("friend_requests").select("*").or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`).in("status", ["pending","accepted"]).order("created_at", { ascending:false }).limit(200);
    if (error) { console.error("Friends load failed:", error); return; }
    const rows=data||[];
    // Determine the OTHER account in every relationship. Never treat a
    // malformed/self relationship as a friend of the logged-in user.
    const getOtherId = (r) => r.sender_id === currentUser.id ? r.receiver_id : r.sender_id;
    const ids=[...new Set(rows.map(getOtherId).filter(id => id && id !== currentUser.id))];
    let profiles=[];
    if(ids.length){
        const result=await supabaseClient
            .from("profiles")
            .select("id,username,display_name,bio,avatar_url,role")
            .in("id",ids);
        if (result.error) console.error("Friends profiles load failed:", result.error);
        profiles=result.data||[];
    }
    const map=new Map(profiles.map(p=>[p.id,p]));
    friendsCache=rows
        .filter(r=>r.status==="accepted")
        .map(r=>({...r, other_id:getOtherId(r), profile:map.get(getOtherId(r))}))
        .filter(r=>r.other_id && r.other_id !== currentUser.id && r.profile);
    friendRequestsCache=rows
        .filter(r=>r.status==="pending"&&r.receiver_id===currentUser.id)
        .map(r=>({...r,profile:map.get(r.sender_id)}))
        .filter(r=>r.profile);
    renderFriends(); renderFriendRequests();
    const badge=get("friendRequestBadge"), count=get("friendsTabRequestCount");
    if(badge){badge.textContent=friendRequestsCache.length>99?"99+":String(friendRequestsCache.length); badge.classList.toggle("hidden",friendRequestsCache.length===0);}
    if(count) count.textContent=friendRequestsCache.length?`(${friendRequestsCache.length})`:"";
}

function renderFriends(){
    const list = get("friendsList");
    if (!list) return;
    list.innerHTML = "";

    if (!friendsCache.length) {
        list.innerHTML = '<div class="friends-empty">No friends yet.</div>';
        return;
    }

    friendsCache.forEach(r => {
        const p = r.profile;
        const item = document.createElement("div");
        item.className = "friend-row";

        const av = document.createElement("span");
        av.className = "avatar";
        updateAvatar(av, p.display_name || p.username || "User", p.avatar_url || "");

        const info = document.createElement("div");
        info.className = "friend-row-info";
        info.innerHTML = '<div class="friend-row-name"></div><div class="friend-row-username"></div>';
        info.children[0].textContent = p.display_name || p.username || "User";
        info.children[1].textContent = p.username ? `@${p.username}` : "";

        const user = {
            id: p.id,
            username: p.username,
            displayName: p.display_name,
            bio: p.bio,
            avatarUrl: p.avatar_url,
            role: getEffectiveRole(p, p)
        };

        const actions = document.createElement("div");
        actions.className = "friend-row-actions";

        const profileBtn = document.createElement("button");
        profileBtn.type = "button";
        profileBtn.className = "friend-action";
        profileBtn.textContent = "Profile";
        profileBtn.onclick = async (event) => {
            event.preventDefault();
            event.stopPropagation();

            // Friends must close before the real profile opens.
            toggleFriends(false);

            // p.id is the OTHER user's auth/profile UUID. Fetch that exact
            // record so the profile modal cannot accidentally use currentUser.
            let actualUser = {
                id: p.id,
                username: p.username || "user",
                displayName: p.display_name || p.username || "User",
                bio: p.bio || "No bio yet.",
                avatarUrl: p.avatar_url || "",
                role: getEffectiveRole(p, p)
            };

            if (p.id && p.id !== currentUser.id) {
                const result = await supabaseClient
                    .from("profiles")
                    .select("id,username,display_name,bio,avatar_url,role")
                    .eq("id", p.id)
                    .maybeSingle();

                if (result.data) {
                    actualUser = {
                        id: result.data.id,
                        username: result.data.username,
                        displayName: result.data.display_name || result.data.username || "User",
                        bio: result.data.bio || "No bio yet.",
                        avatarUrl: result.data.avatar_url || "",
                        role: getEffectiveRole(result.data, result.data)
                    };
                } else if (result.error) {
                    console.error("Friend profile lookup failed:", result.error);
                }
            }

            openUserProfile(actualUser);
        };

        const messageBtn = document.createElement("button");
        messageBtn.type = "button";
        messageBtn.className = "friend-action friend-message-action";
        messageBtn.textContent = "💬 Message";
        messageBtn.onclick = async () => {
            toggleFriends(false);
            showMessagesView();
            await openDmWithUser(user);
        };

        actions.append(profileBtn, messageBtn);
        item.append(av, info, actions);
        list.appendChild(item);
    });
}

function renderFriendRequests(){ const list=get("friendRequestsList"); if(!list)return; list.innerHTML=""; if(!friendRequestsCache.length){list.innerHTML='<div class="friends-empty">No pending requests.</div>';return;} friendRequestsCache.forEach(r=>{const p=r.profile,item=document.createElement("div");item.className="friend-row";const av=document.createElement("span");av.className="avatar";updateAvatar(av,p.display_name||p.username||"User",p.avatar_url||"");const info=document.createElement("div");info.className="friend-row-info";info.innerHTML=`<div class="friend-row-name"></div><div class="friend-row-username"></div>`;info.children[0].textContent=p.display_name||p.username||"User";info.children[1].textContent=p.username?`@${p.username}`:"";const actions=document.createElement("div");actions.className="friend-row-actions";const a=document.createElement("button");a.type="button";a.className="friend-action accept";a.textContent="Accept";a.onclick=()=>respondToFriendRequest(r.id,true);const d=document.createElement("button");d.type="button";d.className="friend-action decline";d.textContent="Decline";d.onclick=()=>respondToFriendRequest(r.id,false);actions.append(a,d);item.append(av,info,actions);list.appendChild(item);});}

function toggleFriends(force){ const panel=get("friendsPanel"), overlay=get("friendsOverlay"), button=get("friendsButton"); if(!panel||!overlay)return; const open=typeof force==="boolean"?force:panel.classList.contains("hidden"); panel.classList.toggle("hidden",!open); overlay.classList.toggle("hidden",!open); panel.setAttribute("aria-hidden",String(!open)); if(button)button.setAttribute("aria-expanded",String(open)); if(open){loadFriends();} }

async function updateProfileFriendButton(targetUserId){ const button=get("profileFriendButton"); if(!button)return; const own=targetUserId===currentUser.id; button.classList.toggle("hidden",own); if(own)return; button.disabled=false; button.textContent="👥 Add Friend"; button.onclick=()=>sendFriendRequest(targetUserId); const {data,error}=await supabaseClient.from("friend_requests").select("id,status,sender_id,receiver_id").or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${currentUser.id})`).in("status",["pending","accepted"]).limit(1).maybeSingle(); if(error)return; if(data?.status==="accepted"){button.textContent="✓ Friends";button.disabled=true;} else if(data?.status==="pending"){if(data.sender_id===currentUser.id){button.textContent="✓ Request Sent";button.disabled=true;}else{button.textContent="👥 Accept Request";button.onclick=async()=>{await respondToFriendRequest(data.id,true);await updateProfileFriendButton(targetUserId);};}} }

function subscribeToFriends(){ if(!supabaseClient||!currentUser.id||friendsRealtimeChannel)return; friendsRealtimeChannel=supabaseClient.channel("afterhours-friends-"+currentUser.id).on("postgres_changes",{event:"*",schema:"public",table:"friend_requests",filter:"sender_id=eq."+currentUser.id},loadFriends).on("postgres_changes",{event:"*",schema:"public",table:"friend_requests",filter:"receiver_id=eq."+currentUser.id},loadFriends).subscribe(); }

// ============================================================
// SETUP BUTTONS
// ============================================================

function setupButtons() {

    // --------------------------------------------------------
    // Landing
    // --------------------------------------------------------

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


    // --------------------------------------------------------
    // Login
    // --------------------------------------------------------

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
            function (e) {

                e.preventDefault();

                login();
            }
        );


    // --------------------------------------------------------
    // Register
    // --------------------------------------------------------

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
            function (e) {

                e.preventDefault();

                register();
            }
        );


    // --------------------------------------------------------
    // Chat
    // --------------------------------------------------------

    initSettings();


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


    get("storeButton")?.addEventListener("click", openStore);
    get("closeStoreButton")?.addEventListener("click", closeStore);
    get("storeModal")?.addEventListener("click", event => {
        if (event.target.id === "storeModal") closeStore();
    });
    document.querySelectorAll("[data-store-product]").forEach(button => {
        button.addEventListener("click", () => startStoreCheckout(button.dataset.storeProduct));
    });

    get("broadcastSaveButton")?.addEventListener("click", saveBroadcast);
    get("broadcastCancelButton")?.addEventListener("click", closeBroadcastEditor);
    get("broadcastModal")?.addEventListener("click", event => {
        if (event.target.id === "broadcastModal") closeBroadcastEditor();
    });

    // --------------------------------------------------------
    // Profile DM button
    // --------------------------------------------------------

    get("messageProfileButton")
        .addEventListener(
            "click",
            async function () {

                if (
                    !viewedProfileUser ||
                    viewedProfileUser.id ===
                    currentUser.id
                ) {
                    return;
                }

                const user =
                    viewedProfileUser;

                closeProfile();

                showMessagesView();

                await openDmWithUser(
                    user
                );
            }
        );


    // --------------------------------------------------------
    // Direct Messages
    // --------------------------------------------------------

    get("messagesButton")
        .addEventListener(
            "click",
            toggleDmList
        );

    const notificationsButton = get("notificationsButton");
    if (notificationsButton) {
        notificationsButton.addEventListener("click", function () {
            toggleNotifications();
        });
    }

    // Friends controls are bound separately below so they still work even if
    // an optional setup control fails earlier in this large initializer.
    document.querySelectorAll(".friends-tab").forEach(tab => {
        tab.addEventListener("click", () => {
            document.querySelectorAll(".friends-tab").forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            get("friendsList")?.classList.toggle("hidden", tab.dataset.friendsTab !== "friends");
            get("friendRequestsList")?.classList.toggle("hidden", tab.dataset.friendsTab !== "requests");
        });
    });

    const markNotificationsReadButton = get("markNotificationsRead");
    if (markNotificationsReadButton) {
        markNotificationsReadButton.addEventListener("click", markAllNotificationsRead);
    }


    const messagesBackButton =
        get("messagesBackButton");

    if (messagesBackButton) {

        messagesBackButton.addEventListener(
            "click",
            showRoomsSidebar
        );
    }


    const newMessageButton =
        get("newMessageButton");

    if (newMessageButton) {

        newMessageButton.addEventListener(
            "click",
            openNewDmModal
        );
    }


    const newMessageBackButton =
        get("newMessageBackButton");

    if (newMessageBackButton) {

        newMessageBackButton.addEventListener(
            "click",
            closeNewDmModal
        );
    }


    const dmUsernameInput =
        get("dmUsername");

    if (dmUsernameInput) {

        dmUsernameInput.addEventListener(
            "input",
            handleUserSearchInput
        );

        dmUsernameInput.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key === "Enter"
                ) {

                    event.preventDefault();

                    startNewDm();
                }
            }
        );
    }


    // --------------------------------------------------------
    // Profile picture picker
    // --------------------------------------------------------

    get("avatarFile")
        .addEventListener(
            "change",
            function (event) {

                const file =
                    event.target.files[0];

                if (file) {

                    uploadProfilePicture(
                        file
                    );
                }
            }
        );


    // --------------------------------------------------------
    // Messages
    // --------------------------------------------------------

    get("messageForm")
        .addEventListener(
            "submit",
            function (e) {

                e.preventDefault();

                sendMessage();
            }
        );


    // --------------------------------------------------------
    // Chat attachments
    // --------------------------------------------------------

    const attachmentButton =
        get("attachmentButton");

    const attachmentInput =
        get("attachmentInput");

    if (attachmentButton && attachmentInput) {
        attachmentButton.addEventListener("click", function () {
            attachmentInput.click();
        });

        attachmentInput.addEventListener("change", function (event) {
            const file = event.target.files && event.target.files[0];
            handleAttachmentSelection(file);
        });
    }


    // --------------------------------------------------------
    // Rooms
    // --------------------------------------------------------

    document
        .querySelectorAll(".room")
        .forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        changeRoom(
                            button.dataset.room,
                            button
                        );
                    }
                );
            }
        );
}


// ============================================================
// SESSION
// ============================================================

async function checkSession() {

    if (!supabaseClient) {

        showLanding();

        return;
    }


    try {

        const {
            data,
            error
        } = await supabaseClient.auth.getSession();


        if (
            error ||
            !data.session
        ) {

            showLanding();

            return;
        }


        const user =
            data.session.user;


        if (!user.email_confirmed_at) {

            await supabaseClient.auth.signOut();

            showLanding();

            return;
        }


        const {
            data: profile,
            error: profileError
        } = await supabaseClient
            .from("profiles")
            .select(
                "id, username, display_name, bio, avatar_url, role"
            )
            .eq(
                "id",
                user.id
            )
            .single();


        if (
            profileError ||
            !profile
        ) {

            console.error(
                profileError
            );

            await supabaseClient.auth.signOut();

            showLanding();

            return;
        }


        const localAvatar =
            localStorage.getItem(
                "afterhours-avatar-" +
                profile.id
            );


        currentUser = {

            id:
                profile.id,

            username:
                profile.username,

            displayName:
                profile.display_name,

            bio:
                profile.bio ||
                "No bio yet.",

            avatarUrl:
                profile.avatar_url ||
                localAvatar ||
                "",

            role:
                getEffectiveRole(
                    profile,
                    user
                ),

            muted:
                false,

            restricted:
                false
        };

        await loadCustomRoles();
        await loadCustomRooms();
        showChat();


    } catch (err) {

        console.error(
            "Session check failed:",
            err
        );

        showLanding();
    }
}


// ============================================================
// CUSTOM RANK + ROOM EDITOR
// ============================================================

const CUSTOM_MODERATION_ACTIONS = [
    { id:"mute", label:"🔇 Mute", permission:"mute_users" },
    { id:"kick", label:"👢 Kick", permission:"kick_users" },
    { id:"ban", label:"🔨 Ban", permission:"ban_users" },
    { id:"warn", label:"⚠️ Warn", permission:"warn_users" },
    { id:"restrict", label:"🚫 Restrict", permission:"restrict_users" },
    { id:"delete_messages", label:"🗑️ Delete Messages", permission:"delete_any_message" },
    { id:"change_role", label:"🛡️ Change Role", permission:"set_ranks" }
];

const EDITOR_PERMISSION_CATALOG = [
    ["chat", "Chat"],
    ["send_messages", "Send messages"],
    ["manage_own_profile", "Manage own profile"],
    ["upload_profile_picture", "Upload profile picture"],
    ["join_rooms", "Join rooms"],
    ["create_rooms", "Create rooms"],
    ["manage_rooms", "Manage rooms"],
    ["edit_any_room", "Edit any room"],
    ["delete_rooms", "Delete rooms"],
    ["manage_room_permissions", "Manage room permissions"],
    ["manage_staff", "Manage staff"],
    ["set_ranks", "Assign ranks"],
    ["manage_ranks", "Create/edit ranks"],
    ["view_staff_console", "View staff console"],
    ["ban_users", "Ban users"],
    ["unban_users", "Unban users"],
    ["mute_users", "Mute users"],
    ["unmute_users", "Unmute users"],
    ["kick_users", "Kick users"],
    ["warn_users", "Warn users"],
    ["restrict_users", "Restrict users"],
    ["delete_any_message", "Delete any message"],
    ["handle_reports", "Handle reports"],
    ["handle_serious_reports", "Handle serious reports"],
    ["manage_conversations", "Manage conversations"],
    ["manage_site_settings", "Manage site settings"],
    ["test_store_purchases", "Test Store purchases"],
    ["vip_badge", "VIP badge"],
    ["vip_name_color", "VIP name color"],
    ["vip_plus_badge", "VIP+ badge"],
    ["vip_plus_profile_themes", "VIP+ profile themes"],
    ["vip_plus_chat_effects", "VIP+ chat effects"],
    ["og_badge", "OG badge"]
];

let editorRoles = [];
let editorRooms = [];
let editorSelectedRoleId = null;

function editorCanOpen() {
    return currentUser?.id && (hasPermission("manage_ranks") || hasPermission("create_rooms"));
}

async function loadCustomRoles() {
    if (!supabaseClient || !currentUser?.id) return;
    const { data, error } = await supabaseClient
        .from("afterhours_roles")
        .select("id,name,color,badge,priority,permissions,is_system")
        .order("priority", { ascending: false });
    if (error) {
        if (!String(error.code || "").startsWith("PGRST") && error.code !== "42P01") console.warn("Custom ranks unavailable:", error);
        return;
    }
    editorRoles = data || [];
    editorRoles.forEach(role => {
        rankDefinitions[role.name] = {
            icon: role.badge || "🏷️",
            className: role.is_system ? (rankDefinitions[role.name]?.className || "rank-member") : "custom-rank",
            permissions: Array.isArray(role.permissions) ? role.permissions : [],
            color: role.color || "#ffffff",
            badge: role.badge || "🏷️"
        };
        ROLE_LEVELS[role.name] = Number(role.priority) || 0;
    });
}

async function loadEditorRooms() {
    if (!supabaseClient || !currentUser?.id) return;
    const { data, error } = await supabaseClient
        .from("afterhours_rooms")
        .select("id,name,description,visibility,created_by,allowed_roles,manage_roles")
        .order("created_at", { ascending: true });
    if (!error) editorRooms = data || [];
}

function closeEditor() {
    const modal = get("editorModal");
    if (!modal) return;
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
}

function openEditor() {
    if (!editorCanOpen()) {
        alert("You do not have permission to open the Editor.");
        return false;
    }
    const modal = get("editorModal");
    if (!modal) return false;
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    loadEditorData();
    return true;
}

async function loadEditorData() {
    await Promise.all([loadCustomRoles(), loadEditorRooms(), loadCustomRooms()]);
    renderEditorRoles();
    renderEditorRooms();
    if (!editorSelectedRoleId && editorRoles.length) editorSelectedRoleId = editorRoles[0].id;
    renderEditorRoleForm();
    if (!get("editorRoomEditId")?.value) {
        renderEditorRoomAccessSelector([], get("editorRoomVisibility")?.value || "public");
    }
}

function renderEditorRoles() {
    const list = get("editorRoleList");
    if (!list) return;
    list.innerHTML = "";
    if (!editorRoles.length) {
        list.innerHTML = '<div class="editor-empty">No ranks loaded. Run custom_editor.sql in Supabase.</div>';
        return;
    }
    editorRoles.forEach(role => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "editor-role-item" + (role.id === editorSelectedRoleId ? " active" : "");
        const dot = document.createElement("span");
        dot.className = "editor-role-dot";
        dot.style.background = role.color || "#fff";
        const text = document.createElement("span");
        text.textContent = `${role.badge || "🏷️"} ${role.name}`;
        button.append(dot, text);
        button.addEventListener("click", () => { editorSelectedRoleId = role.id; renderEditorRoles(); renderEditorRoleForm(); });
        list.appendChild(button);
    });
}

function renderEditorRoleForm() {
    const role = editorRoles.find(r => r.id === editorSelectedRoleId);
    const form = get("editorRoleForm");
    if (!form) return;
    form.innerHTML = "";
    if (!role) { form.innerHTML = '<div class="editor-empty">Select a rank to edit.</div>'; return; }

    const heading = document.createElement("div"); heading.className = "editor-form-heading"; heading.textContent = "Edit rank"; form.appendChild(heading);
    const fields = document.createElement("div"); fields.className = "editor-fields";
    const name = editorInput("Name", "editorRankName", role.name, "text", role.is_system && role.name === "Owner");
    const color = editorInput("Color", "editorRankColor", role.color || "#ffffff", "color", false);
    const badge = editorInput("Badge", "editorRankBadge", role.badge || "🏷️", "text", false);
    const priority = editorInput("Priority", "editorRankPriority", String(role.priority ?? 0), "number", false);
    fields.append(name, color, badge, priority); form.appendChild(fields);

    const label = document.createElement("div"); label.className = "editor-section-label"; label.textContent = "Permissions"; form.appendChild(label);
    const permissions = document.createElement("div"); permissions.className = "editor-permission-grid";
    const selected = new Set(Array.isArray(role.permissions) ? role.permissions : []);
    EDITOR_PERMISSION_CATALOG.forEach(([key, title]) => {
        const wrap = document.createElement("label"); wrap.className = "editor-permission";
        const cb = document.createElement("input"); cb.type = "checkbox"; cb.dataset.permission = key; cb.checked = selected.has(key);
        const span = document.createElement("span"); span.textContent = title; wrap.append(cb, span); permissions.appendChild(wrap);
    });
    form.appendChild(permissions);

    const actions = document.createElement("div"); actions.className = "editor-form-actions";
    const save = document.createElement("button"); save.type = "button"; save.className = "primary-button"; save.textContent = "Save Rank"; save.onclick = () => saveEditorRole(role.id);
    const del = document.createElement("button"); del.type = "button"; del.className = "secondary-button"; del.textContent = role.is_system ? "Built-in Rank" : "Delete Rank"; del.disabled = role.is_system; if (!role.is_system) del.onclick = () => deleteEditorRole(role.id);
    actions.append(save, del); form.appendChild(actions);
}

function editorInput(labelText, id, value, type, disabled) {
    const wrap = document.createElement("label"); wrap.className = "editor-field";
    const label = document.createElement("span"); label.textContent = labelText;
    const input = document.createElement("input"); input.id = id; input.type = type; input.value = value; input.disabled = !!disabled;
    wrap.append(label, input); return wrap;
}

async function saveEditorRole(id) {
    const role = editorRoles.find(r => r.id === id); if (!role) return;
    const permissions = [...document.querySelectorAll("#editorRoleForm input[type=checkbox]:checked")].map(x => x.dataset.permission);
    const payload = { p_id:id, p_name:get("editorRankName")?.value?.trim(), p_color:get("editorRankColor")?.value || "#ffffff", p_badge:get("editorRankBadge")?.value || "🏷️", p_priority:Number(get("editorRankPriority")?.value || 0), p_permissions:permissions };
    const { data, error } = await supabaseClient.rpc("afterhours_editor_save_role", payload);
    if (error) { console.error("Rank save failed:", error); alert(error.message || "Unable to save rank."); return; }
    editorSelectedRoleId = data.id; await loadCustomRoles(); renderEditorRoles(); renderEditorRoleForm(); alert("Rank saved.");
}

async function createEditorRole() {
    if (!editorCanOpen()) return;
    const { data, error } = await supabaseClient.rpc("afterhours_editor_save_role", { p_id:null, p_name:"New Rank", p_color:"#ffffff", p_badge:"🏷️", p_priority:1, p_permissions:["chat","send_messages","join_rooms"] });
    if (error) { console.error("Rank creation failed:", error); alert(error.message || "Unable to create rank."); return; }
    await loadCustomRoles(); editorSelectedRoleId = data.id; renderEditorRoles(); renderEditorRoleForm();
}

async function deleteEditorRole(id) {
    if (!confirm("Delete this custom rank? Users with it will become Member.")) return;
    const { error } = await supabaseClient.rpc("afterhours_editor_delete_role", { p_id:id });
    if (error) { console.error("Rank delete failed:", error); alert(error.message || "Unable to delete rank."); return; }
    editorSelectedRoleId = null; await loadCustomRoles(); renderEditorRoles(); renderEditorRoleForm();
}

async function loadCustomRooms() {
    if (!supabaseClient || !currentUser?.id) return;

    const { data, error } = await supabaseClient
        .from("afterhours_rooms")
        .select("id,name,description,visibility,created_by,allowed_roles,manage_roles")
        .order("created_at", { ascending: true });

    if (error) {
        if (!String(error.code || "").startsWith("PGRST") && error.code !== "42P01") {
            console.warn("Custom rooms unavailable:", error);
        }
        return;
    }

    Object.keys(rooms).forEach(key => {
        if (!rooms[key].isBuiltin) delete rooms[key];
    });
    roomMeta.clear();

    (data || []).forEach(room => {
        const key = String(room.name || "").toLowerCase().trim()
            .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        if (!key || rooms[key]) return;

        const allowedRoles = Array.isArray(room.allowed_roles) ? room.allowed_roles : [];
        rooms[key] = {
            title: "💬 " + room.name,
            description: room.description || "",
            isBuiltin: false,
            allowed_roles: allowedRoles,
            id: room.id,
            visibility: room.visibility || "public",
            name: room.name
        };
        roomMeta.set(key, room);
    });

    renderRoomButtons();

    if (currentChatMode === "room" && currentRoom && !canAccessRoom(rooms[currentRoom])) {
        await changeRoom("general", document.querySelector('.room[data-room="general"]'));
    }
}

function renderRoomButtons() {
    const container = document.querySelector(".rooms");
    if (!container) return;
    const active = currentRoom;
    container.innerHTML = "";

    Object.keys(rooms).forEach(key => {
        const room = rooms[key];
        if (!canAccessRoom(room)) return;

        const button = document.createElement("button");
        button.type = "button";
        button.className = "room" + (key === active ? " active" : "");
        button.dataset.room = key;
        button.textContent = room.title;
        button.title = room.description || room.title;
        button.addEventListener("click", () => changeRoom(key, button));
        container.appendChild(button);
    });
}

function renderEditorRoomAccessSelector(selectedRoles = [], visibility = "public") {
    const host = get("editorRoomAccess");
    if (!host) return;
    host.innerHTML = "";

    const builtInRoles = Object.keys(rankDefinitions).map(name => ({
        name,
        badge: rankDefinitions[name]?.badge || rankDefinitions[name]?.icon || "🏷️",
        priority: ROLE_LEVELS[name] ?? 0,
        is_system: true
    }));
    const customRoles = editorRoles.filter(role => !builtInRoles.some(builtIn => builtIn.name === role.name));
    const roles = [...builtInRoles, ...customRoles];

    const selected = new Set(Array.isArray(selectedRoles) ? selectedRoles : []);
    const heading = document.createElement("div");
    heading.className = "editor-section-label";
    heading.textContent = "Who can access this room?";
    host.appendChild(heading);

    const grid = document.createElement("div");
    grid.className = "editor-room-access-grid";

    roles.forEach(role => {
        const label = document.createElement("label");
        label.className = "editor-room-access-option";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.dataset.role = role.name;
        cb.checked = visibility === "public" || selected.has(role.name) || role.name === "Owner";
        cb.disabled = role.name === "Owner";
        const span = document.createElement("span");
        span.textContent = `${role.badge || "🏷️"} ${role.name}`;
        label.append(cb, span);
        grid.appendChild(label);
    });

    host.appendChild(grid);

    const note = document.createElement("div");
    note.className = "editor-room-access-note";
    note.textContent = visibility === "public"
        ? "Public rooms allow every rank. Private rooms use the selected ranks."
        : "Owner always has access.";
    host.appendChild(note);
}

function getSelectedRoomRoles() {
    return [...document.querySelectorAll("#editorRoomAccess input[type=checkbox]:checked")]
        .map(input => input.dataset.role).filter(Boolean);
}

function setRoomFormMode(room = null) {
    const title = document.querySelector("#editorRoomsView .editor-form-heading");
    const button = get("editorCreateRoomButton");
    const cancel = get("editorCancelRoomEditButton");
    if (title) title.textContent = room ? "Edit Room" : "Create Room";
    if (button) button.textContent = room ? "Save Room" : "Create Room";
    if (cancel) cancel.classList.toggle("hidden", !room);
}

function resetEditorRoomForm() {
    get("editorRoomName").value = "";
    get("editorRoomDescription").value = "";
    get("editorRoomVisibility").value = "public";
    get("editorRoomEditId").value = "";
    renderEditorRoomAccessSelector([], "public");
    setRoomFormMode(null);
}

function editEditorRoom(room) {
    if (!room) return;
    get("editorRoomName").value = room.name || "";
    get("editorRoomDescription").value = room.description || "";
    get("editorRoomVisibility").value = room.visibility || "public";
    get("editorRoomEditId").value = room.id || "";
    renderEditorRoomAccessSelector(room.allowed_roles || [], room.visibility || "public");
    setRoomFormMode(room);
}

async function deleteEditorRoom(id, name) {
    if (!hasPermission("delete_rooms")) {
        alert("You do not have permission to delete rooms.");
        return;
    }
    if (!confirm(`Delete the room "${name}"? Its messages will be kept.`)) return;

    const { error } = await supabaseClient.rpc("afterhours_editor_delete_room", { p_id: id });
    if (error) {
        console.error("Room delete failed:", error);
        alert(error.message || "Unable to delete room.");
        return;
    }

    if (get("editorRoomEditId")?.value === id) resetEditorRoomForm();
    await loadEditorRooms();
    await loadCustomRooms();
    renderEditorRooms();

    if (currentRoom && !rooms[currentRoom]) {
        await changeRoom("general", document.querySelector('.room[data-room="general"]'));
    }
}

function renderEditorRooms() {
    const list = get("editorRoomList");
    if (!list) return;
    list.innerHTML = "";

    if (!editorRooms.length) {
        list.innerHTML = '<div class="editor-empty">No custom rooms yet.</div>';
        return;
    }

    editorRooms.forEach(room => {
        const row = document.createElement("div");
        row.className = "editor-room-item";

        const info = document.createElement("div");
        info.className = "editor-room-info";

        const name = document.createElement("div");
        name.className = "editor-room-name";
        name.textContent = "# " + room.name;

        const desc = document.createElement("div");
        desc.className = "editor-room-desc";
        desc.textContent = room.description || "No description";

        const access = document.createElement("div");
        access.className = "editor-room-access-summary";
        const roles = Array.isArray(room.allowed_roles) ? room.allowed_roles : [];
        access.textContent = room.visibility === "public"
            ? "Everyone"
            : `Access: ${roles.length ? roles.join(", ") : "Member"}`;

        info.append(name, desc, access);

        const vis = document.createElement("span");
        vis.className = "editor-room-visibility";
        vis.textContent = room.visibility === "private" ? "🔒 Private" : "🌐 Public";

        const actions = document.createElement("div");
        actions.className = "editor-room-actions";

        const edit = document.createElement("button");
        edit.type = "button";
        edit.className = "editor-room-action edit";
        edit.textContent = "Edit";
        edit.addEventListener("click", () => editEditorRoom(room));

        const del = document.createElement("button");
        del.type = "button";
        del.className = "editor-room-action delete";
        del.textContent = "🗑️";
        del.title = "Delete room";
        del.addEventListener("click", () => deleteEditorRoom(room.id, room.name));

        actions.append(edit, del);
        row.append(info, vis, actions);
        list.appendChild(row);
    });
}

async function createEditorRoom() {
    const name = get("editorRoomName")?.value?.trim();
    const description = get("editorRoomDescription")?.value?.trim() || "";
    const visibility = get("editorRoomVisibility")?.value || "public";
    const editId = get("editorRoomEditId")?.value || "";

    if (!name) {
        alert("Enter a room name.");
        return;
    }

    const allowedRoles = visibility === "public"
        ? editorRoles.map(r => r.name)
        : getSelectedRoomRoles();

    if (!allowedRoles.length) {
        alert("Select at least one rank for this private room.");
        return;
    }
    if (!allowedRoles.includes("Owner")) allowedRoles.push("Owner");

    const manage = editorRoles
        .filter(r => Number(r.priority) >= (ROLE_LEVELS[currentUser.role] || 0))
        .map(r => r.name);

    const result = editId
        ? await supabaseClient.rpc("afterhours_editor_update_room", {
            p_id: editId, p_name: name, p_description: description,
            p_visibility: visibility, p_allowed_roles: allowedRoles,
            p_manage_roles: manage.length ? manage : ["Owner"]
        })
        : await supabaseClient.rpc("afterhours_editor_create_room_v2", {
            p_name: name, p_description: description, p_visibility: visibility,
            p_allowed_roles: allowedRoles, p_manage_roles: manage.length ? manage : ["Owner"]
        });

    if (result.error) {
        console.error("Room save failed:", result.error);
        alert(result.error.message || "Unable to save room.");
        return;
    }

    resetEditorRoomForm();
    await loadEditorRooms();
    await loadCustomRooms();
    renderEditorRooms();
}

function setupEditor() {
    get("closeEditorButton")?.addEventListener("click", closeEditor);
    get("editorOverlay")?.addEventListener("click", event => { if (event.target.id === "editorOverlay") closeEditor(); });
    get("editorNewRoleButton")?.addEventListener("click", createEditorRole);
    get("editorCreateRoomButton")?.addEventListener("click", createEditorRoom);
    get("editorCancelRoomEditButton")?.addEventListener("click", resetEditorRoomForm);
    get("editorRoomVisibility")?.addEventListener("change", () => {
        renderEditorRoomAccessSelector(getSelectedRoomRoles(), get("editorRoomVisibility")?.value || "public");
    });
    document.querySelectorAll("[data-editor-tab]").forEach(tab => {
        tab.addEventListener("click", () => {
            document.querySelectorAll("[data-editor-tab]").forEach(t => t.classList.toggle("active", t === tab));
            get("editorRanksView")?.classList.toggle("hidden", tab.dataset.editorTab !== "ranks");
            get("editorRoomsView")?.classList.toggle("hidden", tab.dataset.editorTab !== "rooms");
        });
    });
    document.addEventListener("keydown", event => { if (event.key === "Escape") closeEditor(); });
}

// ============================================================
// START
// ============================================================

setupButtons();
setupStaffConsole();
setupEditor();

checkSession();

startModerationStatusChecks();


// ============================================================
// NOTIFICATIONS UI 0.5
// ============================================================

let notificationsPanelOpen = false;
let liveNotificationsChannel = null;

function notificationTypeIcon(type) {
    if (type === "message") return "💬";
    if (type === "friend_request") return "👥";
    if (type === "mention") return "🏷️";
    if (type === "system") return "⭐";
    return "🔔";
}

function formatNotificationTime(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const diff = Date.now() - date.getTime();
    if (diff < 60 * 1000) return "just now";
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}m ago`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}h ago`;
    if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / (24 * 60 * 60 * 1000))}d ago`;
    return date.toLocaleDateString();
}

function renderNotifications(notifications) {
    const list = document.getElementById("notificationsList");
    const badge = document.getElementById("notificationBadge");
    if (!list || !badge) return;

    const items = Array.isArray(notifications) ? notifications : [];
    const unread = items.filter(n => !n.read);

    badge.textContent = unread.length > 99 ? "99+" : String(unread.length);
    badge.hidden = unread.length === 0;
    const notificationButton = document.getElementById("notificationsButton");
    if (notificationButton) {
        notificationButton.classList.toggle("has-unread", unread.length > 0);
        notificationButton.classList.toggle("notification-dot-visible", unread.length > 0);
        notificationButton.title = unread.length
            ? `${unread.length} unread notification${unread.length === 1 ? "" : "s"}`
            : "Notifications";
    }

    list.innerHTML = "";

    if (!items.length) {
        list.innerHTML = '<div class="notifications-empty">No notifications yet.</div>';
        return;
    }

    const newItems = items.filter(n => !n.read);
    const oldItems = items.filter(n => n.read);

    function addSection(label, sectionItems) {
        if (!sectionItems.length) return;

        const heading = document.createElement("div");
        heading.className = "notifications-section-label";
        heading.textContent = label;
        list.appendChild(heading);

        sectionItems.forEach(notification => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = `notification-item${notification.read ? "" : " unread"}`;

            const icon = document.createElement("span");
            icon.className = "notification-icon";
            icon.textContent = notificationTypeIcon(notification.type);

            const content = document.createElement("span");
            content.className = "notification-content";

            const message = document.createElement("div");
            message.className = "notification-message";
            message.textContent = notification.message || "You have a new notification.";

            const time = document.createElement("div");
            time.className = "notification-time";
            time.textContent = formatNotificationTime(notification.created_at);

            content.appendChild(message);
            content.appendChild(time);

            button.appendChild(icon);
            button.appendChild(content);

            if (!notification.read) {
                const dot = document.createElement("span");
                dot.className = "notification-unread-dot";
                button.appendChild(dot);
            }

            button.addEventListener("click", async () => {
                await markNotificationRead(notification.id);

                // If the notification references a DM, let the existing
                // app open it when that helper exists.
                if (
                    notification.type === "message" &&
                    notification.reference_id &&
                    typeof openDm === "function"
                ) {
                    try {
                        await openDm(notification.reference_id);
                    } catch (err) {
                        console.warn("Unable to open notification DM:", err);
                    }
                }

                closeNotificationsPanel();
            });

            list.appendChild(button);
        });
    }

    addSection("NEW", newItems);
    addSection("EARLIER", oldItems);
}

function openNotificationsPanel() {
    const panel = document.getElementById("notificationsPanel");
    const overlay = document.getElementById("notificationsOverlay");
    if (!panel || !overlay) return;

    notificationsPanelOpen = true;
    panel.hidden = false;
    overlay.hidden = false;
    panel.setAttribute("aria-hidden", "false");

    if (typeof loadNotifications === "function") {
        loadNotifications();
    }
}

function closeNotificationsPanel() {
    const panel = document.getElementById("notificationsPanel");
    const overlay = document.getElementById("notificationsOverlay");
    if (!panel || !overlay) return;

    notificationsPanelOpen = false;
    panel.hidden = true;
    overlay.hidden = true;
    panel.setAttribute("aria-hidden", "true");
}

async function markNotificationRead(id) {
    if (!id || !supabaseClient) return;

    try {
        await supabaseClient
            .from("notifications")
            .update({ read: true })
            .eq("id", id)
            .eq("recipient_id", currentUser.id);

        if (typeof loadNotifications === "function") {
            await loadNotifications();
        }
    } catch (err) {
        console.error("Failed to mark notification as read:", err);
    }
}

async function markAllNotificationsRead() {
    if (!supabaseClient || !currentUser?.id) return;

    try {
        await supabaseClient
            .from("notifications")
            .update({ read: true })
            .eq("recipient_id", currentUser.id)
            .eq("read", false);

        if (typeof loadNotifications === "function") {
            await loadNotifications();
        }
    } catch (err) {
        console.error("Failed to mark all notifications as read:", err);
    }
}

async function loadNotifications() {
    if (!supabaseClient || !currentUser?.id) return;

    try {
        const { data, error } = await supabaseClient
            .from("notifications")
            .select("*")
            .eq("recipient_id", currentUser.id)
            .order("created_at", { ascending: false })
            .limit(100);

        if (error) throw error;
        renderNotifications(data || []);
    } catch (err) {
        console.error("Failed to load notifications:", err);
    }
}

function subscribeToNotifications() {
    if (!supabaseClient || !currentUser?.id) return;

    if (liveNotificationsChannel) {
        supabaseClient.removeChannel(liveNotificationsChannel).catch(() => {});
        liveNotificationsChannel = null;
    }

    liveNotificationsChannel = supabaseClient
        .channel(`notifications-${currentUser.id}`)
        .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `recipient_id=eq.${currentUser.id}`
        }, payload => {
            if (payload.eventType === "INSERT" && payload.new && !payload.new.read) {
                const button = document.getElementById("notificationsButton");
                button?.classList.add("notification-dot-visible", "notification-pulse");
                setTimeout(() => button?.classList.remove("notification-pulse"), 900);
                showBrowserNotification(payload.new);
            }
            loadNotifications();
        })
        .subscribe(status => {
            consoleEvent("Notifications realtime: " + status, status === "CHANNEL_ERROR" ? "error" : "log");
            if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
                console.warn("Notifications realtime is not connected. Make sure the notifications table is enabled in Supabase Realtime.");
            }
        });

    // Keep the older cleanup variable pointed at the active channel so logout
    // removes the actual realtime subscription too.
    notificationsChannel = liveNotificationsChannel;

    return liveNotificationsChannel;
}
document.addEventListener("DOMContentLoaded", () => {
    setupBrowserNotificationControls();

    // Store Test controls use one direct binding. This is intentionally
    // independent from setupButtons so unrelated UI initialization cannot
    // make the test purchase controls dead.
    document.querySelectorAll("[data-store-test-product]").forEach(button => {
        if (button.dataset.storeTestBound === "true") return;
        button.dataset.storeTestBound = "true";
        button.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            void startStoreTestPurchase(button.dataset.storeTestProduct);
        });
    });

    const resetStoreTestButton = document.getElementById("resetStoreTestButton");
    if (resetStoreTestButton && resetStoreTestButton.dataset.storeTestResetBound !== "true") {
        resetStoreTestButton.dataset.storeTestResetBound = "true";
        resetStoreTestButton.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            void resetStoreTestPurchase();
        });
    }

    // Friends controls: bind directly to the actual elements.
    // This avoids relying on delegated clicks if another UI layer interferes.
    const friendsButton = document.getElementById("friendsButton");
    if (friendsButton) {
        friendsButton.onclick = (event) => {
            event.preventDefault();
            event.stopPropagation();
            console.log("Friends button clicked");
            toggleFriends();
        };
    }

    const closeFriends = document.getElementById("closeFriends");
    if (closeFriends) {
        closeFriends.onclick = (event) => {
            event.preventDefault();
            event.stopPropagation();
            toggleFriends(false);
        };
    }

    const friendsOverlay = document.getElementById("friendsOverlay");
    if (friendsOverlay) {
        friendsOverlay.onclick = () => toggleFriends(false);
    }

    document.getElementById("notificationsButton")
        ?.addEventListener("click", openNotificationsPanel);

    document.getElementById("closeNotifications")
        ?.addEventListener("click", closeNotificationsPanel);

    document.getElementById("notificationsOverlay")
        ?.addEventListener("click", closeNotificationsPanel);

    document.getElementById("markAllNotificationsRead")
        ?.addEventListener("click", markAllNotificationsRead);

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && notificationsPanelOpen) {
            closeNotificationsPanel();
        }
    });
});
