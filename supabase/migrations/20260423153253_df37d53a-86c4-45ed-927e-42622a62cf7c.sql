CREATE OR REPLACE FUNCTION public.create_thread_for_contact_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  UPDATE public.contact_messages
  SET message_thread_id = new_thread_id
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_thread_for_contact_message_trigger ON public.contact_messages;

CREATE TRIGGER create_thread_for_contact_message_trigger
AFTER INSERT ON public.contact_messages
FOR EACH ROW
EXECUTE FUNCTION public.create_thread_for_contact_message();