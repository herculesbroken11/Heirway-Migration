
ALTER TABLE public.heirway_trust_progress
  ADD COLUMN creator_name text,
  ADD COLUMN trustees jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN beneficiaries jsonb NOT NULL DEFAULT '[]'::jsonb;
