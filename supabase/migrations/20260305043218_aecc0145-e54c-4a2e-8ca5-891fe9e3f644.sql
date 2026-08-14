
ALTER TABLE public.heirway_clients 
  ADD COLUMN IF NOT EXISTS creator_available boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS avatar_url text;
