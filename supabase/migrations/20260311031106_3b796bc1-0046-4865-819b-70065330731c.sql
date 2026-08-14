
-- Create storage bucket for document templates
INSERT INTO storage.buckets (id, name, public) VALUES ('document-templates', 'document-templates', false);

-- Create storage bucket for generated documents
INSERT INTO storage.buckets (id, name, public) VALUES ('generated-documents', 'generated-documents', false);

-- RLS policies for document-templates bucket (admin only)
CREATE POLICY "Admins can manage template files" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'document-templates' AND (SELECT is_admin())) WITH CHECK (bucket_id = 'document-templates' AND (SELECT is_admin()));

-- RLS policies for generated-documents bucket
CREATE POLICY "Admins can manage generated doc files" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'generated-documents' AND (SELECT is_admin())) WITH CHECK (bucket_id = 'generated-documents' AND (SELECT is_admin()));

-- Users can read their own generated documents (path starts with their client_id)
CREATE POLICY "Users can view own generated doc files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'generated-documents' AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.heirway_clients WHERE user_id = auth.uid()));
