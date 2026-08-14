-- Drop the anonymous insert policies
DROP POLICY IF EXISTS "Anyone can create prospects" ON public.prospects;
DROP POLICY IF EXISTS "Anyone can create assessments" ON public.assessments;

-- Create new policies requiring authentication
CREATE POLICY "Authenticated users can create prospects" 
ON public.prospects 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can create assessments" 
ON public.assessments 
FOR INSERT 
TO authenticated
WITH CHECK (true);