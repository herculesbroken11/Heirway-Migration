
-- Heirway clients table
CREATE TABLE public.heirway_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Questionnaire answers
  is_18_plus BOOLEAN NOT NULL DEFAULT true,
  state TEXT NOT NULL,
  is_married BOOLEAN NOT NULL DEFAULT false,
  has_children BOOLEAN NOT NULL DEFAULT false,
  owns_real_estate BOOLEAN NOT NULL DEFAULT false,
  over_1m_assets BOOLEAN NOT NULL DEFAULT false,
  business_ownership TEXT NOT NULL DEFAULT 'none',
  employment_type TEXT NOT NULL DEFAULT 'w2',
  
  -- Plan info
  recommended_plan TEXT NOT NULL,
  selected_plan TEXT,
  plan_status TEXT NOT NULL DEFAULT 'recommended',
  
  -- Profile info
  full_name TEXT,
  email TEXT,
  phone TEXT,
  
  UNIQUE(user_id)
);

ALTER TABLE public.heirway_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own client record" ON public.heirway_clients
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own client record" ON public.heirway_clients
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own client record" ON public.heirway_clients
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all clients" ON public.heirway_clients
  FOR ALL TO authenticated USING (is_admin());

-- Heirway documents table
CREATE TABLE public.heirway_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.heirway_clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  category TEXT NOT NULL DEFAULT 'other',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.heirway_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents" ON public.heirway_documents
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own documents" ON public.heirway_documents
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own documents" ON public.heirway_documents
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all documents" ON public.heirway_documents
  FOR ALL TO authenticated USING (is_admin());

-- Heirway learning progress table
CREATE TABLE public.heirway_learning_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  module_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, module_id, lesson_id)
);

ALTER TABLE public.heirway_learning_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress" ON public.heirway_learning_progress
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own progress" ON public.heirway_learning_progress
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own progress" ON public.heirway_learning_progress
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Storage bucket for client documents
INSERT INTO storage.buckets (id, name, public) VALUES ('client-documents', 'client-documents', false);

CREATE POLICY "Users can upload own documents" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'client-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own documents" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'client-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own documents" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'client-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Updated_at trigger for heirway_clients
CREATE TRIGGER update_heirway_clients_updated_at
  BEFORE UPDATE ON public.heirway_clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
