-- Revert: Allow authenticated users to create prospects and assessments (needed for public diagnostic form)
DROP POLICY IF EXISTS "Only admins can create prospects" ON public.prospects;
DROP POLICY IF EXISTS "Only admins can create assessments" ON public.assessments;

-- Restore policies that allow authenticated users to INSERT (for public diagnostic form)
-- The created_by field tracks who created the record
CREATE POLICY "Authenticated users can create prospects" 
ON public.prospects 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create assessments" 
ON public.assessments 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);