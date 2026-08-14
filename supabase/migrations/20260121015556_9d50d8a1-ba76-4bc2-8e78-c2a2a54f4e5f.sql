-- Add viewed_at column to assessments to track when admin viewed it
ALTER TABLE public.assessments 
ADD COLUMN viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for efficient querying of unviewed assessments
CREATE INDEX idx_assessments_unviewed ON public.assessments (viewed_at) WHERE viewed_at IS NULL;