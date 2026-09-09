This is a working chatroom site made by @999MadHatter. Im a solo dev working on this project, which so far has taken about a week to even get to a working design.
This project is about 1/6 way done so far, as there will be more updates, fixes, and additions to this project in the future!

Update 0.4 - Made a better layout!
Made profile pictures work now.
I made minor changes to the way messages act. 
There is more to come too! 
Future updates:
1:Online status update.
2:Notifications
3:Friends
4:Priority Messaging
5:Console (so I can see errors)
6: More moderation tools.

If you are going to use this repo as your own, please ask permission first because I spent a ton of money, and time making this as my first actual website ever! -MadHatter


## Update 0.5 — Notifications

Added the first notification system. Run `supabase/notifications.sql` in the Supabase SQL Editor to create the notifications table, RLS policies, DM notification trigger, and realtime publication. The app then shows unread notifications in the sidebar and opens a DM when a DM notification is clicked.

## 🌙 Afterhours Editor — Custom Ranks & Rooms

This build adds the first version of the Afterhours Editor.

### Setup

1. Open Supabase → SQL Editor.
2. Run `supabase/custom_editor.sql` once.
3. Log into an account with `manage_ranks` (Owner has it by default).
4. In chat, use:

```text
/editor
```

### Ranks

The Editor can create and edit ranks, including the existing built-in ranks. Each rank supports:

- Name
- Color
- Badge
- Priority
- Individual permissions

Custom ranks are stored in `afterhours_roles` and their permissions are stored as JSONB. The database RPC checks the editor's permission and priority before allowing changes.

### Rooms

The Editor's Rooms tab can create public or private rooms. Public custom rooms are added to the normal room list automatically after login/creation.

### Security

The Editor UI is not the security boundary. The SQL RPCs enforce rank/room management permissions server-side. Continue using RLS and database functions as the production security layer.
