-- 1. Make trust_members.trust_id nullable (legacy column)
ALTER TABLE public.trust_members ALTER COLUMN trust_id DROP NOT NULL;

-- 2. Create assignments table for per-trust access + power level
CREATE TABLE IF NOT EXISTS public.trust_member_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.trust_members(id) ON DELETE CASCADE,
  trust_id UUID NOT NULL REFERENCES public.heirway_trust_progress(id) ON DELETE CASCADE,
  power_level TEXT NOT NULL DEFAULT 'limited' CHECK (power_level IN ('full','limited','none')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(member_id, trust_id)
);

CREATE INDEX IF NOT EXISTS idx_trust_member_assignments_member ON public.trust_member_assignments(member_id);
CREATE INDEX IF NOT EXISTS idx_trust_member_assignments_trust ON public.trust_member_assignments(trust_id);

ALTER TABLE public.trust_member_assignments ENABLE ROW LEVEL SECURITY;

-- Admins manage all
CREATE POLICY "Admins manage all assignments"
ON public.trust_member_assignments FOR ALL
USING (is_admin()) WITH CHECK (is_admin());

-- Members can view their own assignments
CREATE POLICY "Members view own assignments"
ON public.trust_member_assignments FOR SELECT
USING (
  member_id IN (SELECT id FROM public.trust_members WHERE user_id = auth.uid())
);

-- Client owner (trustee manager) can view assignments for their client
CREATE POLICY "Client owner views assignments"
ON public.trust_member_assignments FOR SELECT
USING (
  member_id IN (
    SELECT tm.id FROM public.trust_members tm
    JOIN public.heirway_clients c ON c.id = tm.client_id
    WHERE c.user_id = auth.uid()
  )
);

-- Client owner can manage assignments for members of their client
CREATE POLICY "Client owner manages assignments"
ON public.trust_member_assignments FOR ALL
USING (
  member_id IN (
    SELECT tm.id FROM public.trust_members tm
    JOIN public.heirway_clients c ON c.id = tm.client_id
    WHERE c.user_id = auth.uid()
  )
)
WITH CHECK (
  member_id IN (
    SELECT tm.id FROM public.trust_members tm
    JOIN public.heirway_clients c ON c.id = tm.client_id
    WHERE c.user_id = auth.uid()
  )
);

-- 3. Auto-migrate existing trust_members into assignments
INSERT INTO public.trust_member_assignments (member_id, trust_id, power_level)
SELECT id, trust_id, COALESCE(power_level, 'limited')
FROM public.trust_members
WHERE trust_id IS NOT NULL
ON CONFLICT (member_id, trust_id) DO NOTHING;

-- 4. Function to compute is_billable on insert/update
-- Returns true ONLY if seat exceeds free limit AND invitee does not already
-- own a paid Heirway plan (foundation/business/wealth_builder).
CREATE OR REPLACE FUNCTION public.compute_member_billable()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trustee_count INTEGER;
  beneficiary_count INTEGER;
  free_trustees INTEGER := 10;
  free_beneficiaries INTEGER := 15;
  invitee_has_paid_plan BOOLEAN := false;
BEGIN
  -- Check if invitee already owns a paid plan (by user_id OR email match)
  IF NEW.user_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.heirway_clients
      WHERE user_id = NEW.user_id
        AND selected_plan IN ('foundation','business','wealth_builder')
        AND plan_status IN ('paid','active','intake_complete','onboarding','active_subscription')
    ) INTO invitee_has_paid_plan;
  END IF;

  IF NOT invitee_has_paid_plan AND NEW.invite_email IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.heirway_clients
      WHERE LOWER(email) = LOWER(NEW.invite_email)
        AND selected_plan IN ('foundation','business','wealth_builder')
        AND plan_status IN ('paid','active','intake_complete','onboarding','active_subscription')
    ) INTO invitee_has_paid_plan;
  END IF;

  -- If invitee already pays for their own plan, never bill
  IF invitee_has_paid_plan THEN
    NEW.is_billable := false;
    RETURN NEW;
  END IF;

  -- Otherwise count current seats for this client
  IF NEW.member_type IN ('trustee_manager','trustee') THEN
    SELECT COUNT(*) INTO trustee_count
    FROM public.trust_members
    WHERE client_id = NEW.client_id
      AND member_type IN ('trustee_manager','trustee')
      AND id IS DISTINCT FROM NEW.id;
    NEW.is_billable := trustee_count >= free_trustees;
  ELSIF NEW.member_type = 'beneficiary' THEN
    SELECT COUNT(*) INTO beneficiary_count
    FROM public.trust_members
    WHERE client_id = NEW.client_id
      AND member_type = 'beneficiary'
      AND id IS DISTINCT FROM NEW.id;
    NEW.is_billable := beneficiary_count >= free_beneficiaries;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_compute_member_billable ON public.trust_members;
CREATE TRIGGER trg_compute_member_billable
BEFORE INSERT OR UPDATE OF user_id, invite_email, member_type ON public.trust_members
FOR EACH ROW
EXECUTE FUNCTION public.compute_member_billable();

-- 5. Backfill is_billable for existing rows
UPDATE public.trust_members SET updated_at = now() WHERE id IN (SELECT id FROM public.trust_members);
