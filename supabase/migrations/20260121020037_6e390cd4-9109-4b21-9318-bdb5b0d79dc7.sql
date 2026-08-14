-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create prospects" ON public.prospects;

-- Create a new INSERT policy that only allows admins to insert prospects
CREATE POLICY "Only admins can create prospects" 
ON public.prospects 
FOR INSERT 
WITH CHECK (is_admin());

-- Also fix the assessments table INSERT policy which has the same issue
DROP POLICY IF EXISTS "Authenticated users can create assessments" ON public.assessments;

-- Create a new INSERT policy that only allows admins to insert assessments
CREATE POLICY "Only admins can create assessments" 
ON public.assessments 
FOR INSERT 
WITH CHECK (is_admin());