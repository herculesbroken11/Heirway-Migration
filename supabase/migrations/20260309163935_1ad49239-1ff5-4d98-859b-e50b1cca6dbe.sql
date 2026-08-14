
-- Create a public bucket for learning videos
INSERT INTO storage.buckets (id, name, public) VALUES ('learning-videos', 'learning-videos', true);

-- Allow admins to upload to the bucket
CREATE POLICY "Admins can upload learning videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'learning-videos' AND public.is_admin());

-- Allow admins to update learning videos
CREATE POLICY "Admins can update learning videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'learning-videos' AND public.is_admin());

-- Allow admins to delete learning videos
CREATE POLICY "Admins can delete learning videos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'learning-videos' AND public.is_admin());

-- Allow public read access to learning videos
CREATE POLICY "Anyone can view learning videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'learning-videos');
