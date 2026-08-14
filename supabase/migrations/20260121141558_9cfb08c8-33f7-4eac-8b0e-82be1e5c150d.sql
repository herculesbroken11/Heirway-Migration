-- Drop existing INSERT policies that require authentication
DROP POLICY IF EXISTS "Users can create their own prospect record" ON public.prospects;
DROP POLICY IF EXISTS "Users can create their own assessments" ON public.assessments;

-- Create policies allowing anonymous inserts for public form
CREATE POLICY "Anyone can create prospect records"
ON public.prospects
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Anyone can create assessments"
ON public.assessments
FOR INSERT
TO anon, authenticated
WITH CHECK (true);