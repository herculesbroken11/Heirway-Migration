
ALTER TABLE public.heirway_trust_progress 
  ADD COLUMN trust_type text NOT NULL DEFAULT 'revocable',
  ADD COLUMN has_bank_account boolean NOT NULL DEFAULT false;

ALTER TABLE public.heirway_assets
  ADD COLUMN trust_id uuid REFERENCES public.heirway_trust_progress(id) ON DELETE SET NULL,
  ADD COLUMN llc_state text;
