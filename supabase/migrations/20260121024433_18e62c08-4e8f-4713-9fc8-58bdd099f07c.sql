-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create prospects" ON public.prospects;

-- Create a more restrictive INSERT policy that requires created_by to match the authenticated user
CREATE POLICY "Users can create their own prospect record"
ON public.prospects
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- Also fix the same issue on assessments table
DROP POLICY IF EXISTS "Authenticated users can create assessments" ON public.assessments;

CREATE POLICY "Users can create their own assessments"
ON public.assessments
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());