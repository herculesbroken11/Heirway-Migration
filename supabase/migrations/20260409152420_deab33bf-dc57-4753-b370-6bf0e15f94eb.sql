
CREATE TABLE public.heirway_kb_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID REFERENCES public.heirway_clients(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.heirway_kb_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own kb requests" ON public.heirway_kb_requests
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own kb requests" ON public.heirway_kb_requests
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all kb requests" ON public.heirway_kb_requests
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
