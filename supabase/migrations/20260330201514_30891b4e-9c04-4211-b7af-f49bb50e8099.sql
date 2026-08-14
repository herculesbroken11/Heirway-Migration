
CREATE TABLE public.consent_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text,
  full_name text,
  ip_address text,
  consent_type text NOT NULL DEFAULT 'terms_and_privacy',
  form_context text NOT NULL DEFAULT 'unknown',
  privacy_policy_version text DEFAULT '03/11/2026',
  terms_version text DEFAULT '03/11/2026',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.consent_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all consent logs" ON public.consent_log
  FOR SELECT TO authenticated USING (is_admin());

CREATE POLICY "Admins can manage consent logs" ON public.consent_log
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Anyone can insert consent logs" ON public.consent_log
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Users can view own consent logs" ON public.consent_log
  FOR SELECT TO authenticated USING (user_id = auth.uid());
