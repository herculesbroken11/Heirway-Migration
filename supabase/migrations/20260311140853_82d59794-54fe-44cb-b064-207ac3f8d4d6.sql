-- Allow anonymous users to view active learning modules (for landing page)
CREATE POLICY "Anon can view active learning modules"
ON public.heirway_learning_modules
FOR SELECT
TO anon
USING (is_active = true);

-- Allow anonymous users to view active learning content (for landing page)
CREATE POLICY "Anon can view active learning content"
ON public.heirway_learning_content
FOR SELECT
TO anon
USING (is_active = true);