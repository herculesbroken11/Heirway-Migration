
-- Create referrals table
CREATE TABLE public.heirway_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL,
  referrer_client_id UUID NOT NULL REFERENCES public.heirway_clients(id) ON DELETE CASCADE,
  referee_first_name TEXT NOT NULL,
  referee_last_name TEXT NOT NULL,
  referee_email TEXT NOT NULL,
  referee_phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  credit_applied BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.heirway_referrals ENABLE ROW LEVEL SECURITY;

-- Users can insert their own referrals
CREATE POLICY "Users can insert own referrals"
ON public.heirway_referrals FOR INSERT
TO authenticated
WITH CHECK (referrer_user_id = auth.uid());

-- Users can view their own referrals
CREATE POLICY "Users can view own referrals"
ON public.heirway_referrals FOR SELECT
TO authenticated
USING (referrer_user_id = auth.uid());

-- Admins can manage all referrals
CREATE POLICY "Admins can manage all referrals"
ON public.heirway_referrals FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
