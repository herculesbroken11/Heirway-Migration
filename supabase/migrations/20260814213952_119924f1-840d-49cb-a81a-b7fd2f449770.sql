-- 1. Revoke anon EXECUTE on SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.current_user_plan() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_access_plan_content(text[]) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_plan() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_plan_content(text[]) TO authenticated, service_role;

-- 2. Harden client-documents storage policies with application-table verification
DROP POLICY IF EXISTS "Users can view own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;

CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'client-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND NOT EXISTS (
    SELECT 1 FROM public.heirway_documents d
    WHERE d.file_path = storage.objects.name
      AND d.user_id IS DISTINCT FROM auth.uid()
      AND d.client_id NOT IN (SELECT c.id FROM public.heirway_clients c WHERE c.user_id = auth.uid())
  )
);

CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'client-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND EXISTS (SELECT 1 FROM public.heirway_clients c WHERE c.user_id = auth.uid())
  AND NOT EXISTS (
    SELECT 1 FROM public.heirway_documents d
    WHERE d.file_path = storage.objects.name
      AND d.user_id IS DISTINCT FROM auth.uid()
      AND d.client_id NOT IN (SELECT c.id FROM public.heirway_clients c WHERE c.user_id = auth.uid())
  )
);

CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'client-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND NOT EXISTS (
    SELECT 1 FROM public.heirway_documents d
    WHERE d.file_path = storage.objects.name
      AND d.user_id IS DISTINCT FROM auth.uid()
      AND d.client_id NOT IN (SELECT c.id FROM public.heirway_clients c WHERE c.user_id = auth.uid())
  )
);

-- 3. Prevent spoofed consent records
DROP POLICY IF EXISTS "Anyone can insert consent logs" ON public.consent_log;

CREATE POLICY "Consent logs cannot be attributed to other users"
ON public.consent_log FOR INSERT TO anon, authenticated
WITH CHECK (
  (user_id IS NULL OR user_id = auth.uid())
  AND email IS NOT NULL
  AND length(email) BETWEEN 5 AND 254
  AND email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  AND (full_name IS NULL OR length(full_name) <= 200)
  AND (consent_type IS NULL OR length(consent_type) <= 100)
  AND (form_context IS NULL OR length(form_context) <= 100)
);