
-- Asset tracker table
CREATE TABLE public.heirway_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid NOT NULL REFERENCES public.heirway_clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  asset_type text NOT NULL DEFAULT 'other',
  estimated_value numeric DEFAULT 0,
  entity_type text DEFAULT 'none',
  entity_name text,
  in_private_trust boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.heirway_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assets" ON public.heirway_assets FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own assets" ON public.heirway_assets FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own assets" ON public.heirway_assets FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own assets" ON public.heirway_assets FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all assets" ON public.heirway_assets FOR ALL USING (is_admin());

-- Trust progress tracking table
CREATE TABLE public.heirway_trust_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid NOT NULL REFERENCES public.heirway_clients(id) ON DELETE CASCADE,
  trust_name text NOT NULL,
  stage text NOT NULL DEFAULT 'processing_documents',
  stage_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.heirway_trust_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trust progress" ON public.heirway_trust_progress FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own trust progress" ON public.heirway_trust_progress FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can manage all trust progress" ON public.heirway_trust_progress FOR ALL USING (is_admin());

-- Meeting minutes table
CREATE TABLE public.heirway_meeting_minutes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid NOT NULL REFERENCES public.heirway_clients(id) ON DELETE CASCADE,
  trust_id uuid REFERENCES public.heirway_trust_progress(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  meeting_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.heirway_meeting_minutes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own minutes" ON public.heirway_meeting_minutes FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own minutes" ON public.heirway_meeting_minutes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own minutes" ON public.heirway_meeting_minutes FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own minutes" ON public.heirway_meeting_minutes FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all minutes" ON public.heirway_meeting_minutes FOR ALL USING (is_admin());

-- Admin requests table
CREATE TABLE public.heirway_admin_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid NOT NULL REFERENCES public.heirway_clients(id) ON DELETE CASCADE,
  request_type text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.heirway_admin_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own requests" ON public.heirway_admin_requests FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own requests" ON public.heirway_admin_requests FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can manage all requests" ON public.heirway_admin_requests FOR ALL USING (is_admin());

-- Add miro_board_url to heirway_clients for admin to set per client
ALTER TABLE public.heirway_clients ADD COLUMN miro_board_url text;
