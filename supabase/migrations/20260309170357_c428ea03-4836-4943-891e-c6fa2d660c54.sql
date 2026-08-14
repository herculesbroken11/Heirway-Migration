
-- Table for admin-uploaded intake training videos
CREATE TABLE public.heirway_intake_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text NOT NULL UNIQUE, -- e.g. 'trustees', 'beneficiaries'
  video_url text NOT NULL,
  title text NOT NULL DEFAULT '',
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.heirway_intake_videos ENABLE ROW LEVEL SECURITY;

-- Admins can manage
CREATE POLICY "Admins can manage intake videos" ON public.heirway_intake_videos
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- All authenticated users can view
CREATE POLICY "Users can view intake videos" ON public.heirway_intake_videos
  FOR SELECT TO authenticated USING (true);
