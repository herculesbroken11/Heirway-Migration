
ALTER TABLE public.heirway_intake
  ADD COLUMN IF NOT EXISTS trust_names text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS business_name text,
  ADD COLUMN IF NOT EXISTS business_type text,
  ADD COLUMN IF NOT EXISTS business_description text,
  ADD COLUMN IF NOT EXISTS business_revenue text;
