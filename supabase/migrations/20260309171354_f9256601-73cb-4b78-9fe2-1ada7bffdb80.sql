CREATE TABLE public.heirway_intake_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid REFERENCES public.heirway_clients(id) ON DELETE CASCADE,
  question text NOT NULL,
  admin_response text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.heirway_intake_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own questions" ON public.heirway_intake_questions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own questions" ON public.heirway_intake_questions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all questions" ON public.heirway_intake_questions
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());