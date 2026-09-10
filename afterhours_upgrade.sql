-- Afterhours feature upgrade
-- Run this in Supabase SQL Editor before using room access, DM read state,
-- broadcast, and automatic Stripe rank delivery.

-- ------------------------------------------------------------
-- Custom room access
-- ------------------------------------------------------------
ALTER TABLE public.afterhours_rooms
    ADD COLUMN IF NOT EXISTS allowed_roles text[] NOT NULL DEFAULT ARRAY['Member','VIP','VIP+','OG','Helper','Moderator','Admin','Developer','Owner'];

ALTER TABLE public.afterhours_rooms
    ADD COLUMN IF NOT EXISTS manage_roles text[] NOT NULL DEFAULT ARRAY['Owner'];

-- Public/private room access check used by the database trigger.
CREATE OR REPLACE FUNCTION public.afterhours_room_access_allowed(p_room text, p_user uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    r public.afterhours_rooms%ROWTYPE;
    user_role text;
BEGIN
    SELECT * INTO r
    FROM public.afterhours_rooms
    WHERE lower(regexp_replace(trim(name), '[^a-zA-Z0-9]+', '-', 'g')) = lower(p_room)
    LIMIT 1;

    IF NOT FOUND THEN
        -- Built-in rooms are not stored in afterhours_rooms.
        RETURN true;
    END IF;

    IF r.visibility = 'public' THEN
        RETURN true;
    END IF;

    IF p_user = 'e3b8dd5d-56cf-447e-95e6-4506a1c818ce'::uuid THEN
        RETURN true;
    END IF;

    SELECT role INTO user_role FROM public.profiles WHERE id = p_user;
    IF user_role = 'Owner' THEN
        RETURN true;
    END IF;

    RETURN COALESCE(user_role = ANY(r.allowed_roles), false);
END;
$$;

CREATE OR REPLACE FUNCTION public.afterhours_enforce_room_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.afterhours_room_access_allowed(NEW.room, NEW.user_id) THEN
        RAISE EXCEPTION 'You do not have access to this room.' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS afterhours_messages_room_access ON public.messages;
CREATE TRIGGER afterhours_messages_room_access
BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.afterhours_enforce_room_access();

-- ------------------------------------------------------------
-- Role assignment, including custom ranks
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.afterhours_role_priority(p_role text)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE p integer;
BEGIN
    SELECT priority INTO p FROM public.afterhours_roles WHERE name = p_role LIMIT 1;
    IF p IS NOT NULL THEN RETURN p; END IF;
    RETURN CASE p_role
        WHEN 'Member' THEN 0
        WHEN 'OG' THEN 0
        WHEN 'VIP' THEN 0
        WHEN 'VIP+' THEN 0
        WHEN 'Helper' THEN 1
        WHEN 'Moderator' THEN 2
        WHEN 'Admin' THEN 3
        WHEN 'Developer' THEN 4
        WHEN 'Owner' THEN 5
        ELSE -1
    END;
END;
$$;

CREATE OR REPLACE FUNCTION public.afterhours_set_user_role(target_id uuid, new_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    actor_role text;
    actor_priority integer;
    target_priority integer;
    role_exists boolean;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated.'; END IF;
    IF target_id = auth.uid() THEN RAISE EXCEPTION 'You cannot change your own role.'; END IF;

    SELECT role INTO actor_role FROM public.profiles WHERE id = auth.uid();
    actor_priority := CASE
        WHEN auth.uid() = 'e3b8dd5d-56cf-447e-95e6-4506a1c818ce'::uuid THEN 5
        ELSE public.afterhours_role_priority(actor_role)
    END;
    target_priority := public.afterhours_role_priority(new_role);

    SELECT EXISTS (
        SELECT 1 FROM (VALUES ('Member'),('OG'),('VIP'),('VIP+'),('Helper'),('Moderator'),('Admin'),('Developer'),('Owner')) v(name)
        WHERE v.name = new_role
    ) OR EXISTS (
        SELECT 1 FROM public.afterhours_roles WHERE name = new_role
    ) INTO role_exists;

    IF NOT role_exists THEN RAISE EXCEPTION 'Invalid role.'; END IF;
    IF auth.uid() <> 'e3b8dd5d-56cf-447e-95e6-4506a1c818ce'::uuid AND actor_role <> 'Owner' AND actor_priority < 4 THEN
        RAISE EXCEPTION 'You do not have permission to change roles.' USING ERRCODE = '42501';
    END IF;
    IF target_priority >= actor_priority THEN
        RAISE EXCEPTION 'You cannot assign an equal or higher role.' USING ERRCODE = '42501';
    END IF;

    UPDATE public.profiles SET role = new_role WHERE id = target_id;
    RETURN true;
END;
$$;

-- Create-room RPC used by the existing Editor.
CREATE OR REPLACE FUNCTION public.afterhours_editor_create_room_v2(
    p_name text,
    p_description text,
    p_visibility text,
    p_allowed_roles text[],
    p_manage_roles text[]
)
RETURNS public.afterhours_rooms
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE out_room public.afterhours_rooms;
DECLARE actor_role text;
BEGIN
    SELECT role INTO actor_role FROM public.profiles WHERE id = auth.uid();
    IF auth.uid() <> 'e3b8dd5d-56cf-447e-95e6-4506a1c818ce'::uuid AND (actor_role IS NULL OR (actor_role <> 'Owner' AND actor_role <> 'Admin' AND actor_role <> 'Developer')) THEN
        RAISE EXCEPTION 'You do not have permission to create rooms.' USING ERRCODE = '42501';
    END IF;

    INSERT INTO public.afterhours_rooms(name, description, visibility, created_by, allowed_roles, manage_roles)
    VALUES (
        trim(p_name),
        COALESCE(p_description, ''),
        CASE WHEN p_visibility = 'private' THEN 'private' ELSE 'public' END,
        auth.uid(),
        COALESCE(p_allowed_roles, ARRAY['Member']),
        COALESCE(p_manage_roles, ARRAY['Owner'])
    )
    RETURNING * INTO out_room;

    RETURN out_room;
END;
$$;

-- ------------------------------------------------------------
-- Room editor update/delete
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.afterhours_editor_update_room(
    p_id uuid,
    p_name text,
    p_description text,
    p_visibility text,
    p_allowed_roles text[],
    p_manage_roles text[]
)
RETURNS public.afterhours_rooms
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE out_room public.afterhours_rooms;
DECLARE actor_role text;
BEGIN
    SELECT role INTO actor_role FROM public.profiles WHERE id = auth.uid();
    IF auth.uid() <> 'e3b8dd5d-56cf-447e-95e6-4506a1c818ce'::uuid AND (actor_role IS NULL OR (actor_role <> 'Owner' AND actor_role <> 'Admin' AND actor_role <> 'Developer')) THEN
        RAISE EXCEPTION 'You do not have permission to edit rooms.' USING ERRCODE = '42501';
    END IF;

    UPDATE public.afterhours_rooms
    SET name = trim(p_name),
        description = COALESCE(p_description, ''),
        visibility = CASE WHEN p_visibility = 'private' THEN 'private' ELSE 'public' END,
        allowed_roles = COALESCE(p_allowed_roles, ARRAY['Member']),
        manage_roles = COALESCE(p_manage_roles, ARRAY['Owner'])
    WHERE id = p_id
    RETURNING * INTO out_room;

    IF out_room.id IS NULL THEN RAISE EXCEPTION 'Room not found.'; END IF;
    RETURN out_room;
END;
$$;

CREATE OR REPLACE FUNCTION public.afterhours_editor_delete_room(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE actor_role text;
BEGIN
    SELECT role INTO actor_role FROM public.profiles WHERE id = auth.uid();
    IF auth.uid() <> 'e3b8dd5d-56cf-447e-95e6-4506a1c818ce'::uuid AND (actor_role IS NULL OR (actor_role <> 'Owner' AND actor_role <> 'Admin')) THEN
        RAISE EXCEPTION 'You do not have permission to delete rooms.' USING ERRCODE = '42501';
    END IF;
    DELETE FROM public.afterhours_rooms WHERE id = p_id;
    RETURN true;
END;
$$;

-- ------------------------------------------------------------
-- Broadcast
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.afterhours_site_settings (
    key text PRIMARY KEY,
    value text NOT NULL DEFAULT '',
    updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.afterhours_site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "broadcast_read" ON public.afterhours_site_settings;
CREATE POLICY "broadcast_read" ON public.afterhours_site_settings FOR SELECT TO authenticated USING (key = 'broadcast');

CREATE OR REPLACE FUNCTION public.afterhours_set_broadcast(p_value text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE actor_role text;
BEGIN
    SELECT role INTO actor_role FROM public.profiles WHERE id = auth.uid();
    IF auth.uid() <> 'e3b8dd5d-56cf-447e-95e6-4506a1c818ce'::uuid AND (actor_role IS NULL OR (actor_role <> 'Owner' AND actor_role <> 'Developer' AND actor_role <> 'Admin')) THEN
        RAISE EXCEPTION 'You do not have permission to edit the broadcast.' USING ERRCODE = '42501';
    END IF;
    INSERT INTO public.afterhours_site_settings(key,value,updated_by,updated_at)
    VALUES ('broadcast', left(coalesce(p_value,''),180), auth.uid(), now())
    ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at;
    RETURN true;
END;
$$;

-- ------------------------------------------------------------
-- DM read state
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dm_message_reads (
    message_id uuid NOT NULL REFERENCES public.dm_messages(id) ON DELETE CASCADE,
    reader_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    read_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (message_id, reader_id)
);

ALTER TABLE public.dm_message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_message_reads REPLICA IDENTITY FULL;
DROP POLICY IF EXISTS "dm_reads_participants" ON public.dm_message_reads;
CREATE POLICY "dm_reads_participants" ON public.dm_message_reads FOR SELECT TO authenticated USING (
    reader_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.dm_messages m
        JOIN public.dm_conversations c ON c.id = m.conversation_id
        WHERE m.id = dm_message_reads.message_id
        AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
    )
);
DROP POLICY IF EXISTS "dm_reads_own_insert" ON public.dm_message_reads;
CREATE POLICY "dm_reads_own_insert" ON public.dm_message_reads FOR INSERT TO authenticated WITH CHECK (reader_id = auth.uid());
DROP POLICY IF EXISTS "dm_reads_own_update" ON public.dm_message_reads;
CREATE POLICY "dm_reads_own_update" ON public.dm_message_reads FOR UPDATE TO authenticated USING (reader_id = auth.uid()) WITH CHECK (reader_id = auth.uid());

CREATE OR REPLACE FUNCTION public.afterhours_mark_dm_read(p_conversation_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n integer;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.dm_conversations
        WHERE id = p_conversation_id AND (participant_one = auth.uid() OR participant_two = auth.uid())
    ) THEN RAISE EXCEPTION 'Conversation not found.'; END IF;

    INSERT INTO public.dm_message_reads(message_id, reader_id, read_at)
    SELECT m.id, auth.uid(), now()
    FROM public.dm_messages m
    WHERE m.conversation_id = p_conversation_id
      AND m.sender_id <> auth.uid()
    ON CONFLICT (message_id, reader_id) DO UPDATE SET read_at = excluded.read_at;

    GET DIAGNOSTICS n = ROW_COUNT;
    RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION public.afterhours_get_dm_read_state(p_conversation_id uuid)
RETURNS TABLE(message_id uuid, read_by_recipient boolean, read_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT m.id,
           EXISTS (
               SELECT 1 FROM public.dm_message_reads r
               WHERE r.message_id = m.id
                 AND r.reader_id <> m.sender_id
           ),
           max(r.read_at)
    FROM public.dm_messages m
    LEFT JOIN public.dm_message_reads r ON r.message_id = m.id AND r.reader_id <> m.sender_id
    WHERE m.conversation_id = p_conversation_id
      AND EXISTS (
          SELECT 1 FROM public.dm_conversations c
          WHERE c.id = p_conversation_id AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
      )
    GROUP BY m.id;
$$;

CREATE OR REPLACE FUNCTION public.afterhours_get_dm_unread_counts()
RETURNS TABLE(conversation_id uuid, unread_count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT m.conversation_id, count(*)::bigint
    FROM public.dm_messages m
    JOIN public.dm_conversations c ON c.id = m.conversation_id
    WHERE (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
      AND m.sender_id <> auth.uid()
      AND NOT EXISTS (
          SELECT 1 FROM public.dm_message_reads r
          WHERE r.message_id = m.id AND r.reader_id = auth.uid()
      )
    GROUP BY m.conversation_id;
$$;

CREATE OR REPLACE FUNCTION public.afterhours_mark_dm_unread(p_conversation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM public.dm_message_reads r
    USING public.dm_messages m
    WHERE r.message_id = m.id
      AND r.reader_id = auth.uid()
      AND m.conversation_id = p_conversation_id;
    RETURN true;
END;
$$;

-- Optional realtime support for the new tables/settings.
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_message_reads;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.afterhours_site_settings;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END $$;

-- Purchase announcements use this format in messages.content:
-- __afterhours_purchase__:{"username":"MadHatter","product":"VIP"}

-- ------------------------------------------------------------
-- Stripe webhook idempotency
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.afterhours_stripe_events (
    event_id text PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    product text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- Permission-based Store test purchases
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.afterhours_store_test_state (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    original_role text NOT NULL,
    test_role text NOT NULL,
    started_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.afterhours_store_test_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "store_test_state_own" ON public.afterhours_store_test_state;
CREATE POLICY "store_test_state_own" ON public.afterhours_store_test_state
FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.afterhours_test_purchase(p_product text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    actor_role text;
    original_role text;
    actor_username text;
    new_role text;
    normalized_product text;
    allowed boolean := false;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated.'; END IF;

    SELECT role, username INTO actor_role, actor_username
    FROM public.profiles
    WHERE id = auth.uid();

    -- The hardcoded Afterhours Owner remains Owner even while Store Test
    -- temporarily changes the profile.role column to VIP/VIP+.
    IF auth.uid() = 'e3b8dd5d-56cf-447e-95e6-4506a1c818ce'::uuid OR actor_role = 'Owner' THEN
        allowed := true;
    ELSE
        SELECT EXISTS (
            SELECT 1
            FROM public.afterhours_roles r
            WHERE r.name = actor_role
              AND to_jsonb(r.permissions) @> '["test_store_purchases"]'::jsonb
        ) INTO allowed;
    END IF;

    IF NOT allowed THEN
        RAISE EXCEPTION 'You do not have permission to use Store test mode.' USING ERRCODE = '42501';
    END IF;

    normalized_product := lower(trim(coalesce(p_product, '')));
    IF normalized_product IN ('vip', 'vip+') THEN
        new_role := CASE WHEN normalized_product = 'vip+' THEN 'VIP+' ELSE 'VIP' END;
    ELSIF normalized_product IN ('vip_plus', 'vip plus') THEN
        new_role := 'VIP+';
    ELSE
        RAISE EXCEPTION 'Invalid Store product.';
    END IF;

    -- Save the real/original rank only the first time test mode is used.
    -- Explicitly preserve Owner for the hardcoded Owner account.
    original_role := CASE
        WHEN auth.uid() = 'e3b8dd5d-56cf-447e-95e6-4506a1c818ce'::uuid THEN 'Owner'
        ELSE COALESCE(actor_role, 'Member')
    END;

    INSERT INTO public.afterhours_store_test_state(user_id, original_role, test_role)
    VALUES (auth.uid(), original_role, new_role)
    ON CONFLICT (user_id) DO UPDATE
        SET test_role = excluded.test_role,
            updated_at = now();

    UPDATE public.profiles
    SET role = new_role
    WHERE id = auth.uid();

    INSERT INTO public.messages(user_id, room, content)
    VALUES (
        auth.uid(),
        'general',
        '__afterhours_purchase__:' || json_build_object(
            'username', coalesce(actor_username, 'user'),
            'product', new_role
        )::text
    );

    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.afterhours_get_store_test_state()
RETURNS TABLE(original_role text, test_role text, started_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT s.original_role, s.test_role, s.started_at
    FROM public.afterhours_store_test_state s
    WHERE s.user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.afterhours_reset_test_purchase()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE original text;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated.'; END IF;

    SELECT original_role INTO original
    FROM public.afterhours_store_test_state
    WHERE user_id = auth.uid();

    IF original IS NULL THEN
        RAISE EXCEPTION 'No active Store test rank.';
    END IF;

    IF auth.uid() = 'e3b8dd5d-56cf-447e-95e6-4506a1c818ce'::uuid THEN
        original := 'Owner';
    END IF;

    UPDATE public.profiles SET role = original WHERE id = auth.uid();
    DELETE FROM public.afterhours_store_test_state WHERE user_id = auth.uid();
    RETURN original;
END;
$$;



-- V2 Store Test RPC: returns the created announcement so the client can
-- confirm the purchase immediately instead of depending on realtime timing.
CREATE OR REPLACE FUNCTION public.afterhours_test_purchase_v2(p_product text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    actor_role text;
    original_role text;
    actor_username text;
    new_role text;
    normalized_product text;
    allowed boolean := false;
    created_message public.messages%ROWTYPE;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated.';
    END IF;

    SELECT role, username INTO actor_role, actor_username
    FROM public.profiles
    WHERE id = auth.uid();

    IF auth.uid() = 'e3b8dd5d-56cf-447e-95e6-4506a1c818ce'::uuid OR actor_role = 'Owner' THEN
        allowed := true;
    ELSE
        SELECT EXISTS (
            SELECT 1
            FROM public.afterhours_roles r
            WHERE r.name = actor_role
              AND to_jsonb(r.permissions) @> '["test_store_purchases"]'::jsonb
        ) INTO allowed;
    END IF;

    IF NOT allowed THEN
        RAISE EXCEPTION 'You do not have permission to use Store test mode.' USING ERRCODE = '42501';
    END IF;

    normalized_product := lower(trim(coalesce(p_product, '')));
    IF normalized_product IN ('vip', 'vip+') THEN
        new_role := CASE WHEN normalized_product = 'vip+' THEN 'VIP+' ELSE 'VIP' END;
    ELSIF normalized_product IN ('vip_plus', 'vip plus') THEN
        new_role := 'VIP+';
    ELSE
        RAISE EXCEPTION 'Invalid Store product.';
    END IF;

    SELECT original_role INTO original_role
    FROM public.afterhours_store_test_state
    WHERE user_id = auth.uid();

    original_role := CASE
        WHEN auth.uid() = 'e3b8dd5d-56cf-447e-95e6-4506a1c818ce'::uuid THEN 'Owner'
        ELSE COALESCE(original_role, actor_role, 'Member')
    END;

    INSERT INTO public.afterhours_store_test_state(user_id, original_role, test_role)
    VALUES (auth.uid(), original_role, new_role)
    ON CONFLICT (user_id) DO UPDATE
        SET test_role = excluded.test_role, updated_at = now();

    UPDATE public.profiles
    SET role = new_role
    WHERE id = auth.uid();

    INSERT INTO public.messages(user_id, room, content)
    VALUES (
        auth.uid(),
        'general',
        '__afterhours_purchase__:' || json_build_object(
            'username', coalesce(actor_username, 'user'),
            'product', new_role
        )::text
    )
    RETURNING * INTO created_message;

    RETURN jsonb_build_object(
        'success', true,
        'role', new_role,
        'message', jsonb_build_object(
            'id', created_message.id,
            'user_id', created_message.user_id,
            'room', created_message.room,
            'content', created_message.content,
            'created_at', created_message.created_at
        )
    );
END;
$$;

REVOKE ALL ON FUNCTION public.afterhours_test_purchase_v2(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.afterhours_test_purchase_v2(text) TO authenticated;

REVOKE ALL ON FUNCTION public.afterhours_test_purchase(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.afterhours_get_store_test_state() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.afterhours_reset_test_purchase() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.afterhours_test_purchase(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.afterhours_get_store_test_state() TO authenticated;
GRANT EXECUTE ON FUNCTION public.afterhours_reset_test_purchase() TO authenticated;
