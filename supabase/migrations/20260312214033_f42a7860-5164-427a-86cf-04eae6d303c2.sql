
-- Knowledgebase articles table
CREATE TABLE public.heirway_knowledgebase (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  summary text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  content_type text NOT NULL DEFAULT 'article',
  category text NOT NULL DEFAULT 'general',
  tags text[] NOT NULL DEFAULT '{}',
  thumbnail_url text,
  video_url text,
  document_url text,
  document_name text,
  external_url text,
  allowed_plans text[] NOT NULL DEFAULT '{education,foundation,business,wealth_builder}',
  is_published boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  views_count integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.heirway_knowledgebase ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage all kb articles"
  ON public.heirway_knowledgebase FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Authenticated users can view published articles
CREATE POLICY "Authenticated users can view published kb articles"
  ON public.heirway_knowledgebase FOR SELECT
  TO authenticated
  USING (is_published = true);

-- Anon can view published articles (for landing page etc)
CREATE POLICY "Anon can view published kb articles"
  ON public.heirway_knowledgebase FOR SELECT
  TO anon
  USING (is_published = true);
