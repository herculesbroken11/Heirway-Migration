
-- Helper: current user's effective plan key
CREATE OR REPLACE FUNCTION public.current_user_plan()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT NULLIF(c.selected_plan, '') FROM public.heirway_clients c WHERE c.user_id = auth.uid() LIMIT 1),
    'free'
  )
$$;

CREATE OR REPLACE FUNCTION public.can_access_plan_content(_allowed_plans text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN _allowed_plans IS NULL OR array_length(_allowed_plans, 1) IS NULL THEN true
      WHEN 'free' = ANY(_allowed_plans) THEN true
      WHEN auth.uid() IS NULL THEN false
      WHEN public.is_admin() THEN true
      WHEN public.current_user_plan() = ANY(_allowed_plans) THEN true
      WHEN EXISTS (
        SELECT 1 FROM public.heirway_clients c
        WHERE c.user_id = auth.uid() AND c.premium_access_granted = true
      ) THEN true
      ELSE false
    END
$$;

-- Learning content: enforce allowed_plans
DROP POLICY IF EXISTS "Anon can view active learning content" ON public.heirway_learning_content;
DROP POLICY IF EXISTS "Authenticated users can view active learning content" ON public.heirway_learning_content;

CREATE POLICY "Anon can view free active learning content"
ON public.heirway_learning_content FOR SELECT TO anon
USING (is_active = true AND public.can_access_plan_content(allowed_plans));

CREATE POLICY "Users can view permitted active learning content"
ON public.heirway_learning_content FOR SELECT TO authenticated
USING (is_active = true AND public.can_access_plan_content(allowed_plans));

-- Knowledgebase: enforce allowed_plans
DROP POLICY IF EXISTS "Anon can view published kb articles" ON public.heirway_knowledgebase;
DROP POLICY IF EXISTS "Authenticated users can view published kb articles" ON public.heirway_knowledgebase;

CREATE POLICY "Anon can view free published kb articles"
ON public.heirway_knowledgebase FOR SELECT TO anon
USING (is_published = true AND public.can_access_plan_content(allowed_plans));

CREATE POLICY "Users can view permitted published kb articles"
ON public.heirway_knowledgebase FOR SELECT TO authenticated
USING (is_published = true AND public.can_access_plan_content(allowed_plans));

-- Learning modules: catalog stays listable (needed for locked/upgrade UI),
-- but restrict to active rows only, which it already was.
DROP POLICY IF EXISTS "Anon can view active learning modules" ON public.heirway_learning_modules;
DROP POLICY IF EXISTS "Authenticated users can view active learning modules" ON public.heirway_learning_modules;

CREATE POLICY "Anon can view active learning module catalog"
ON public.heirway_learning_modules FOR SELECT TO anon
USING (is_active = true);

CREATE POLICY "Users can view active learning module catalog"
ON public.heirway_learning_modules FOR SELECT TO authenticated
USING (is_active = true);

-- Intake videos: only admins and users who actually have a client record
DROP POLICY IF EXISTS "Clients and admins can view intake videos" ON public.heirway_intake_videos;

CREATE POLICY "Admins and own clients can view intake videos"
ON public.heirway_intake_videos FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.heirway_clients c
    WHERE c.user_id = auth.uid()
  )
);
