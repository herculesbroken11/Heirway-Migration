-- Allow anyone to insert prospects (for public form)
CREATE POLICY "Anyone can create prospects" 
ON public.prospects FOR INSERT 
WITH CHECK (true);

-- Allow anyone to insert assessments (for public form)
CREATE POLICY "Anyone can create assessments" 
ON public.assessments FOR INSERT 
WITH CHECK (true);