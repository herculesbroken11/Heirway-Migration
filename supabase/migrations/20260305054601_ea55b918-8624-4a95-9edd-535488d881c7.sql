
-- Admin-created learning modules (course sections)
CREATE TABLE public.heirway_learning_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  thumbnail_url text,
  difficulty text NOT NULL DEFAULT 'beginner',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.heirway_learning_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all learning modules"
  ON public.heirway_learning_modules FOR ALL
  USING (is_admin());

CREATE POLICY "Authenticated users can view active learning modules"
  ON public.heirway_learning_modules FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Add a foreign key reference from learning content to learning modules
ALTER TABLE public.heirway_learning_content
  ADD COLUMN module_ref_id uuid REFERENCES public.heirway_learning_modules(id) ON DELETE CASCADE;

-- Add duration field for lessons
ALTER TABLE public.heirway_learning_content
  ADD COLUMN duration_minutes integer DEFAULT 0;
