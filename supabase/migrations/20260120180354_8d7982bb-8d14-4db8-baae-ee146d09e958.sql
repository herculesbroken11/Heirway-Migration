-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Anyone can create prospects" ON public.prospects;
DROP POLICY IF EXISTS "Anyone can create assessments" ON public.assessments;

-- Recreate as PERMISSIVE policies (default is PERMISSIVE when not specified as RESTRICTIVE)
CREATE POLICY "Anyone can create prospects" 
ON public.prospects 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Anyone can create assessments" 
ON public.assessments 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);