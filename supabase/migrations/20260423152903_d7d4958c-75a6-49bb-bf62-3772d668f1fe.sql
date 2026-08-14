ALTER TABLE public.message_threads
ADD CONSTRAINT message_threads_contact_message_id_fkey
FOREIGN KEY (contact_message_id) REFERENCES public.contact_messages(id) ON DELETE SET NULL;

ALTER TABLE public.contact_messages
ADD CONSTRAINT contact_messages_message_thread_id_fkey
FOREIGN KEY (message_thread_id) REFERENCES public.message_threads(id) ON DELETE SET NULL;