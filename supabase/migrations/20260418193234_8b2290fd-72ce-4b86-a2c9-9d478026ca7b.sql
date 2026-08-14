-- Replace billing trigger logic: ignore invitee's own plan status
CREATE OR REPLACE FUNCTION public.compute_member_billable()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  trustee_count INTEGER;
  beneficiary_count INTEGER;
  free_trustees INTEGER := 10;
  free_beneficiaries INTEGER := 15;
BEGIN
  -- Billing is now based ONLY on seat count for the inviting client.
  -- Whether the invitee has their own paid Heirway plan is IRRELEVANT —
  -- they are accessing trust information outside their own plan's scope.
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
$function$;

-- Recompute existing rows so any previously-exempted seats now reflect the new rule
UPDATE public.trust_members SET updated_at = now();