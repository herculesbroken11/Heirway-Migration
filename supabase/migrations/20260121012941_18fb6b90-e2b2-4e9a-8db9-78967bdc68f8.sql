-- Fix security issues: Add SELECT policies to restrict data access to admins only

-- 1. Add SELECT policy for prospects table to restrict reading to admins only
CREATE POLICY "Only admins can view prospects"
  ON public.prospects FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- 2. Add SELECT policy for assessments table to restrict reading to admins only
CREATE POLICY "Only admins can view assessments"
  ON public.assessments FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- 3. Add SELECT policy for prospect_notes table to restrict reading to admins only
CREATE POLICY "Only admins can view notes"
  ON public.prospect_notes FOR SELECT
  TO authenticated
  USING (public.is_admin());