
-- Add creator address fields to trust progress table
ALTER TABLE public.heirway_trust_progress
  ADD COLUMN IF NOT EXISTS creator_address_street text,
  ADD COLUMN IF NOT EXISTS creator_address_city text,
  ADD COLUMN IF NOT EXISTS creator_address_state text,
  ADD COLUMN IF NOT EXISTS creator_address_zip text;
