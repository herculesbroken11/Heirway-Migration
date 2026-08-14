ALTER TABLE public.heirway_clients
ADD COLUMN IF NOT EXISTS trust_name_pool text[] NOT NULL DEFAULT '{}'::text[];