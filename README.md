This is a working chatroom site made by @999MadHatter. Im a solo dev working on this project, which so far has taken about a week to even get to a working design.
This project is about 1/6 way done so far, as there will be more updates, fixes, and additions to this project in the future!

# Afterhours — Update 0.3

### Direct Messages

A major update focused on private communication and improving the foundation of Afterhours.

## ✉️ Direct Messages

* Added a complete Direct Message system.
* Users can start conversations by searching for another user's **@username**.
* Added a 💬 Message button to other users' profiles.
* Users cannot message themselves.
* DM conversations are saved and persist between sessions.
* Added DM conversation history.
* Added realtime DM messaging through Supabase.
* Added secure database rules so users can only access conversations they participate in.
* Added server-side validation for DM messages.
* Added a 2,000-character DM limit.
* Added protection against sending messages while not authenticated.

## 👤 Profile Messaging

* Added a **💬 Message** button when viewing another user's profile.
* The button is automatically hidden when viewing your own profile.
* Starting a DM from a profile automatically opens the private conversation.

## 🗄️ Backend

* Added `dm_conversations` table.
* Added `dm_messages` table.
* Added indexes for DM performance.
* Added Row Level Security (RLS) policies.
* Added `afterhours_get_or_create_dm()` RPC.
* Added `afterhours_send_dm_message()` RPC.
* Added Supabase Realtime support for `dm_messages`.

## 🛡️ Security

* DM conversations are private.
* Users can only read conversations they are part of.
* Users can only send messages as themselves.
* Users cannot access another user's private conversations.
* Server-side validation prevents invalid or oversized messages.

## 🎨 UI

* Added the initial ✉️ Messages section to the sidebar.
* Added a **New Message** interface for starting conversations.
* Added DM-specific chat headers and message input behavior.

## 🔧 Fixes

* Fixed public-room realtime messaging.
* Prevented duplicate messages from appearing when realtime and local rendering happen together.
* Improved switching between public rooms and private conversations.

### Status

**Update 0.3 — Direct Messages: Complete ✅**

### Coming Next

* Redesigned Messages panel
* Last-message previews
* DM timestamps
* Unread message indicators
* Better DM avatars
* Mobile DM improvements
* General UI polish
