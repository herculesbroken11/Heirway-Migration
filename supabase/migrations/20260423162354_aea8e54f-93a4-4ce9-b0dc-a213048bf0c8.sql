CREATE OR REPLACE FUNCTION public.create_thread_for_contact_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_thread_id uuid;
BEGIN
  IF NEW.message_thread_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.message_threads (contact_message_id, title, contact_full_name, contact_email, status, last_message_at)
  VALUES (NEW.id, COALESCE(NULLIF(NEW.subject, ''), 'Contact inquiry'), NEW.full_name, NEW.email, 'open', NEW.created_at)
  RETURNING id INTO new_thread_id;

  INSERT INTO public.message_thread_participants (thread_id, email, role)
  VALUES (new_thread_id, NEW.email, 'client')
  ON CONFLICT (thread_id, email) DO NOTHING;

  INSERT INTO public.message_replies (thread_id, sender_role, sender_name, body, created_at)
  VALUES (new_thread_id, 'client', NEW.full_name, NEW.message, NEW.created_at);

  UPDATE public.contact_messages
  SET message_thread_id = new_thread_id,
      updated_at = now()
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.touch_message_thread()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.message_threads
  SET last_message_at = NEW.created_at,
      updated_at = now(),
      status = CASE WHEN NEW.sender_role = 'admin' THEN 'responded' ELSE 'open' END
  WHERE id = NEW.thread_id;

  UPDATE public.contact_messages cm
  SET status = CASE WHEN NEW.sender_role = 'admin' THEN 'responded' ELSE 'new' END,
      updated_at = now()
  FROM public.message_threads mt
  WHERE mt.id = NEW.thread_id
    AND cm.id = mt.contact_message_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_contact_message_thread ON public.contact_messages;
DROP TRIGGER IF EXISTS create_thread_for_contact_message_trigger ON public.contact_messages;
CREATE TRIGGER create_thread_for_contact_message_trigger
AFTER INSERT ON public.contact_messages
FOR EACH ROW
EXECUTE FUNCTION public.create_thread_for_contact_message();

DROP TRIGGER IF EXISTS touch_message_thread_on_reply ON public.message_replies;
CREATE TRIGGER touch_message_thread_on_reply
AFTER INSERT ON public.message_replies
FOR EACH ROW
EXECUTE FUNCTION public.touch_message_thread();

DO $$
DECLARE
  contact_row record;
  new_thread_id uuid;
BEGIN
  FOR contact_row IN
    SELECT id, full_name, email, message, subject, created_at
    FROM public.contact_messages
    WHERE message_thread_id IS NULL
    ORDER BY created_at
  LOOP
    INSERT INTO public.message_threads (contact_message_id, title, contact_full_name, contact_email, status, last_message_at)
    VALUES (contact_row.id, COALESCE(NULLIF(contact_row.subject, ''), 'Contact inquiry'), contact_row.full_name, contact_row.email, 'open', contact_row.created_at)
    RETURNING id INTO new_thread_id;

    INSERT INTO public.message_thread_participants (thread_id, email, role)
    VALUES (new_thread_id, contact_row.email, 'client')
    ON CONFLICT (thread_id, email) DO NOTHING;

    INSERT INTO public.message_replies (thread_id, sender_role, sender_name, body, created_at)
    VALUES (new_thread_id, 'client', contact_row.full_name, contact_row.message, contact_row.created_at);

    UPDATE public.contact_messages
    SET message_thread_id = new_thread_id,
        updated_at = now()
    WHERE id = contact_row.id;
  END LOOP;
END $$;