CREATE TABLE public.message_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_message_id UUID NULL,
  title TEXT NOT NULL DEFAULT 'Contact inquiry',
  contact_full_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  last_message_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.message_thread_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  user_id UUID NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'client',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(thread_id, email)
);

CREATE TABLE public.message_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  sender_user_id UUID NULL,
  sender_role TEXT NOT NULL DEFAULT 'client',
  sender_name TEXT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_messages
ADD COLUMN IF NOT EXISTS message_thread_id UUID NULL;

CREATE INDEX idx_message_threads_contact_email ON public.message_threads (lower(contact_email));
CREATE INDEX idx_message_threads_last_message_at ON public.message_threads (last_message_at DESC);
CREATE INDEX idx_message_participants_user_id ON public.message_thread_participants (user_id);
CREATE INDEX idx_message_participants_email ON public.message_thread_participants (lower(email));
CREATE INDEX idx_message_replies_thread_id ON public.message_replies (thread_id, created_at);

ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_thread_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_replies ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.user_can_access_message_thread(_thread_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.message_thread_participants p
      WHERE p.thread_id = _thread_id
        AND (
          p.user_id = auth.uid()
          OR lower(p.email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
        )
    )
$$;

CREATE POLICY "Admins can manage message threads"
ON public.message_threads
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Participants can view own message threads"
ON public.message_threads
FOR SELECT
TO authenticated
USING (public.user_can_access_message_thread(id));

CREATE POLICY "Admins can manage message participants"
ON public.message_thread_participants
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Participants can view own thread participants"
ON public.message_thread_participants
FOR SELECT
TO authenticated
USING (public.user_can_access_message_thread(thread_id));

CREATE POLICY "Admins can manage message replies"
ON public.message_replies
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Participants can view own message replies"
ON public.message_replies
FOR SELECT
TO authenticated
USING (public.user_can_access_message_thread(thread_id));

CREATE POLICY "Participants can add own message replies"
ON public.message_replies
FOR INSERT
TO authenticated
WITH CHECK (
  public.user_can_access_message_thread(thread_id)
  AND sender_user_id = auth.uid()
  AND sender_role = 'client'
  AND char_length(btrim(body)) BETWEEN 1 AND 5000
);

CREATE OR REPLACE FUNCTION public.create_thread_for_contact_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_thread_id uuid;
BEGIN
  INSERT INTO public.message_threads (contact_message_id, title, contact_full_name, contact_email, status, last_message_at)
  VALUES (NEW.id, 'Contact inquiry', NEW.full_name, NEW.email, 'open', NEW.created_at)
  RETURNING id INTO new_thread_id;

  INSERT INTO public.message_thread_participants (thread_id, email, role)
  VALUES (new_thread_id, NEW.email, 'client')
  ON CONFLICT (thread_id, email) DO NOTHING;

  INSERT INTO public.message_replies (thread_id, sender_role, sender_name, body, created_at)
  VALUES (new_thread_id, 'client', NEW.full_name, NEW.message, NEW.created_at);

  NEW.message_thread_id := new_thread_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_contact_message_thread ON public.contact_messages;
CREATE TRIGGER create_contact_message_thread
BEFORE INSERT ON public.contact_messages
FOR EACH ROW
EXECUTE FUNCTION public.create_thread_for_contact_message();

CREATE OR REPLACE FUNCTION public.touch_message_thread()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.message_threads
  SET last_message_at = NEW.created_at,
      updated_at = now(),
      status = CASE WHEN NEW.sender_role = 'admin' THEN 'responded' ELSE 'open' END
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_message_thread_on_reply ON public.message_replies;
CREATE TRIGGER touch_message_thread_on_reply
AFTER INSERT ON public.message_replies
FOR EACH ROW
EXECUTE FUNCTION public.touch_message_thread();

INSERT INTO public.message_threads (contact_message_id, title, contact_full_name, contact_email, status, last_message_at, created_at, updated_at)
SELECT cm.id, 'Contact inquiry', cm.full_name, cm.email, cm.status, cm.created_at, cm.created_at, cm.updated_at
FROM public.contact_messages cm
WHERE cm.message_thread_id IS NULL
ON CONFLICT DO NOTHING;

UPDATE public.contact_messages cm
SET message_thread_id = mt.id
FROM public.message_threads mt
WHERE mt.contact_message_id = cm.id
  AND cm.message_thread_id IS NULL;

INSERT INTO public.message_thread_participants (thread_id, email, role)
SELECT mt.id, mt.contact_email, 'client'
FROM public.message_threads mt
ON CONFLICT (thread_id, email) DO NOTHING;

INSERT INTO public.message_replies (thread_id, sender_role, sender_name, body, created_at)
SELECT mt.id, 'client', cm.full_name, cm.message, cm.created_at
FROM public.message_threads mt
JOIN public.contact_messages cm ON cm.id = mt.contact_message_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.message_replies mr
  WHERE mr.thread_id = mt.id
    AND mr.sender_role = 'client'
    AND mr.created_at = cm.created_at
);

CREATE TRIGGER update_message_threads_updated_at
BEFORE UPDATE ON public.message_threads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();