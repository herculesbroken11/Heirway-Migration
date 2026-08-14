
-- Document templates table (admin-managed)
CREATE TABLE public.heirway_document_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  file_path text, -- path in storage bucket (null for built-in)
  is_builtin boolean NOT NULL DEFAULT false,
  merge_fields jsonb NOT NULL DEFAULT '[]'::jsonb, -- list of available merge field names
  conditional_fields jsonb NOT NULL DEFAULT '[]'::jsonb, -- conditional logic definitions
  version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Generated documents table (per trust, with version tracking)
CREATE TABLE public.heirway_generated_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.heirway_clients(id) ON DELETE CASCADE,
  trust_id uuid NOT NULL REFERENCES public.heirway_trust_progress(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.heirway_document_templates(id),
  version integer NOT NULL DEFAULT 1,
  file_path_docx text, -- generated docx in storage
  file_path_pdf text, -- generated pdf in storage
  status text NOT NULL DEFAULT 'draft', -- draft, generated, edited, final
  is_admin_edited boolean NOT NULL DEFAULT false,
  edited_file_path text, -- admin re-uploaded version
  generated_by uuid,
  notes text,
  merge_data_snapshot jsonb, -- snapshot of data used for generation
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.heirway_document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.heirway_generated_documents ENABLE ROW LEVEL SECURITY;

-- Templates: admin-only management, authenticated can view active
CREATE POLICY "Admins can manage all templates" ON public.heirway_document_templates FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Authenticated can view active templates" ON public.heirway_document_templates FOR SELECT TO authenticated USING (is_active = true);

-- Generated documents: admin full access, users can view own
CREATE POLICY "Admins can manage all generated documents" ON public.heirway_generated_documents FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Users can view own generated documents" ON public.heirway_generated_documents FOR SELECT TO authenticated USING (client_id IN (SELECT id FROM heirway_clients WHERE user_id = auth.uid()));

-- Updated_at triggers
CREATE TRIGGER update_heirway_document_templates_updated_at BEFORE UPDATE ON public.heirway_document_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_heirway_generated_documents_updated_at BEFORE UPDATE ON public.heirway_generated_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
