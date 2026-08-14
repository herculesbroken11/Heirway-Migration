
-- Admin-managed learning content
CREATE TABLE public.heirway_learning_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id text NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  difficulty text NOT NULL DEFAULT 'beginner',
  video_url text,
  thumbnail_url text,
  attachment_url text,
  attachment_name text,
  sort_order integer NOT NULL DEFAULT 0,
  is_free boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.heirway_learning_content ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins can manage all learning content"
  ON public.heirway_learning_content FOR ALL
  USING (is_admin());

-- All authenticated users can view active content
CREATE POLICY "Authenticated users can view active learning content"
  ON public.heirway_learning_content FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Client notification read tracking
CREATE TABLE public.heirway_notification_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  notification_id text NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, notification_id)
);

ALTER TABLE public.heirway_notification_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notification reads"
  ON public.heirway_notification_reads FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
