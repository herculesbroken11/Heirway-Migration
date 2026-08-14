
-- Successor Vault: main record per user
CREATE TABLE public.successor_vault (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.heirway_clients(id) ON DELETE CASCADE,
  funeral_instructions TEXT DEFAULT '',
  healthcare_directives TEXT DEFAULT '',
  power_of_attorney TEXT DEFAULT '',
  hipaa_authorization TEXT DEFAULT '',
  additional_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Successor Vault contacts
CREATE TABLE public.successor_vault_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vault_id UUID NOT NULL REFERENCES public.successor_vault(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  relationship TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Successor Vault accounts (sensitive info)
CREATE TABLE public.successor_vault_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vault_id UUID NOT NULL REFERENCES public.successor_vault(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  account_name TEXT NOT NULL DEFAULT '',
  website_url TEXT DEFAULT '',
  username TEXT DEFAULT '',
  password TEXT DEFAULT '',
  pin TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.successor_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.successor_vault_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.successor_vault_accounts ENABLE ROW LEVEL SECURITY;

-- Users can manage their own vault
CREATE POLICY "Users manage own vault" ON public.successor_vault FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users manage own contacts" ON public.successor_vault_contacts FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users manage own accounts" ON public.successor_vault_accounts FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Admins can view all
CREATE POLICY "Admins view all vaults" ON public.successor_vault FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins view all contacts" ON public.successor_vault_contacts FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins view all accounts" ON public.successor_vault_accounts FOR SELECT USING (public.is_admin());

-- Updated_at trigger
CREATE TRIGGER update_successor_vault_updated_at BEFORE UPDATE ON public.successor_vault FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
