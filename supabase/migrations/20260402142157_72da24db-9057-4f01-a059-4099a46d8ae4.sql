DROP POLICY IF EXISTS "Anyone can submit contact messages" ON public.contact_messages;

CREATE POLICY "Anyone can submit contact messages"
ON public.contact_messages
FOR INSERT
TO anon, authenticated
WITH CHECK (
  char_length(btrim(full_name)) BETWEEN 2 AND 120
  AND char_length(btrim(email)) BETWEEN 5 AND 255
  AND email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  AND char_length(btrim(message)) BETWEEN 10 AND 5000
  AND (subject IS NULL OR char_length(btrim(subject)) <= 200)
  AND status = 'new'
);