DROP TRIGGER IF EXISTS create_contact_message_thread ON public.contact_messages;
DROP TRIGGER IF EXISTS create_thread_for_contact_message_trigger ON public.contact_messages;

CREATE TRIGGER create_thread_for_contact_message_trigger
AFTER INSERT ON public.contact_messages
FOR EACH ROW
EXECUTE FUNCTION public.create_thread_for_contact_message();