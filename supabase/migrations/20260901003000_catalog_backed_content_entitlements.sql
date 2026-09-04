-- Phase 1 Step 6E-3C-3B: Catalog-backed can_access_plan_content() with legacy parity.
-- LOCAL PREPARATION ONLY — DO NOT APPLY until controlled migration step.
-- Preserves current_user_plan(). No heirway_clients or content row changes.

BEGIN;

-- ─── Preflight ───────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'heirway_plan_catalog'
  ) THEN
    RAISE EXCEPTION 'Preflight failed: public.heirway_plan_catalog is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'current_user_plan'
  ) THEN
    RAISE EXCEPTION 'Preflight failed: public.current_user_plan() is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_admin'
  ) THEN
    RAISE EXCEPTION 'Preflight failed: public.is_admin() is missing';
  END IF;

  IF (SELECT count(*)::int FROM public.heirway_plan_catalog) <> 9 THEN
    RAISE EXCEPTION 'Preflight failed: expected 9 catalog rows, got %',
      (SELECT count(*)::int FROM public.heirway_plan_catalog);
  END IF;

  -- Legacy parity prerequisites: proven plan keys must map to matching content_access_keys
  IF NOT EXISTS (
    SELECT 1 FROM public.heirway_plan_catalog
    WHERE internal_key = 'free'
      AND selected_plan_key = 'free'
      AND content_access_keys = ARRAY['free']::text[]
  ) THEN
    RAISE EXCEPTION 'Preflight failed: free catalog content_access_keys parity mismatch';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.heirway_plan_catalog
    WHERE internal_key = 'education'
      AND selected_plan_key = 'education'
      AND content_access_keys = ARRAY['education']::text[]
  ) THEN
    RAISE EXCEPTION 'Preflight failed: education catalog content_access_keys parity mismatch';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.heirway_plan_catalog
    WHERE internal_key = 'foundation'
      AND selected_plan_key = 'foundation'
      AND content_access_keys = ARRAY['foundation']::text[]
  ) THEN
    RAISE EXCEPTION 'Preflight failed: foundation catalog content_access_keys parity mismatch';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.heirway_plan_catalog
    WHERE internal_key = 'business'
      AND selected_plan_key = 'business'
      AND content_access_keys = ARRAY['business']::text[]
  ) THEN
    RAISE EXCEPTION 'Preflight failed: business catalog content_access_keys parity mismatch';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.heirway_plan_catalog
    WHERE internal_key = 'wealth_builder'
      AND selected_plan_key = 'wealth_builder'
      AND content_access_keys = ARRAY['wealth_builder']::text[]
  ) THEN
    RAISE EXCEPTION 'Preflight failed: wealth_builder catalog content_access_keys parity mismatch';
  END IF;

  -- Unresolved tiers must remain empty (no invented entitlements)
  IF EXISTS (
    SELECT 1 FROM public.heirway_plan_catalog
    WHERE internal_key IN ('essentials', 'steward', 'gold')
      AND cardinality(content_access_keys) > 0
  ) THEN
    RAISE EXCEPTION 'Preflight failed: essentials/steward/gold must have empty content_access_keys';
  END IF;
END $$;

-- ─── Catalog-backed authorization (current_user_plan unchanged) ──────────────

CREATE OR REPLACE FUNCTION public.can_access_plan_content(_allowed_plans text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN _allowed_plans IS NULL OR array_length(_allowed_plans, 1) IS NULL THEN true
      WHEN 'free' = ANY(_allowed_plans) THEN true
      WHEN auth.uid() IS NULL THEN false
      WHEN public.is_admin() THEN true
      WHEN EXISTS (
        SELECT 1
        FROM public.heirway_plan_catalog cat
        WHERE cat.active = true
          AND (
            cat.selected_plan_key = public.current_user_plan()
            OR cat.internal_key = public.current_user_plan()
          )
          AND cat.content_access_keys && _allowed_plans
      ) THEN true
      WHEN EXISTS (
        SELECT 1 FROM public.heirway_clients c
        WHERE c.user_id = auth.uid() AND c.premium_access_granted = true
      ) THEN true
      ELSE false
    END
$$;

COMMENT ON FUNCTION public.can_access_plan_content(text[]) IS
  'Content access gate: bypasses (null/empty allowed_plans, free-tagged content, admin, premium_access_granted) then catalog content_access_keys overlap. Empty catalog keys grant no plan-specific access.';

-- ─── Function privileges (match 20260814213952 hardening) ───────────────────

REVOKE EXECUTE ON FUNCTION public.can_access_plan_content(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_plan_content(text[]) TO authenticated, service_role;

-- current_user_plan() intentionally NOT modified

-- ─── Post-migration parity assertions (synthetic, no user data) ──────────────

DO $$
DECLARE
  user_plan text;
  allowed text[];
  legacy_direct boolean;
  catalog_overlap boolean;
  user_plans text[] := ARRAY[
    'free', 'education', 'foundation', 'business', 'wealth_builder',
    'legacy', 'essentials', 'steward', 'gold', 'unknown_plan'
  ];
  content_keys text[] := ARRAY['free', 'education', 'foundation', 'business', 'wealth_builder'];
  pk text;
  ck text;
BEGIN
  FOREACH pk IN ARRAY user_plans LOOP
    FOREACH ck IN ARRAY content_keys LOOP
      allowed := ARRAY[ck];
      legacy_direct := (pk = ck);
      SELECT EXISTS (
        SELECT 1
        FROM public.heirway_plan_catalog cat
        WHERE cat.active = true
          AND (cat.selected_plan_key = pk OR cat.internal_key = pk)
          AND cat.content_access_keys && allowed
      ) INTO catalog_overlap;

      IF legacy_direct IS DISTINCT FROM catalog_overlap THEN
        RAISE EXCEPTION
          'Parity assertion failed: user_plan=% content_key=% legacy_direct=% catalog_overlap=%',
          pk, ck, legacy_direct, catalog_overlap;
      END IF;
    END LOOP;
  END LOOP;

  -- NULL/empty selected_plan coalesces to free via current_user_plan(); catalog free row covers it
  IF NOT EXISTS (
    SELECT 1 FROM public.heirway_plan_catalog
    WHERE internal_key = 'free' AND content_access_keys && ARRAY['free']::text[]
  ) THEN
    RAISE EXCEPTION 'Post-check failed: free catalog row cannot overlap free content';
  END IF;

  -- Unresolved tiers must not overlap legacy content vocabulary
  IF EXISTS (
    SELECT 1
    FROM public.heirway_plan_catalog cat
    WHERE cat.internal_key IN ('essentials', 'steward', 'gold')
      AND cat.content_access_keys && ARRAY['education', 'foundation', 'business', 'wealth_builder']::text[]
  ) THEN
    RAISE EXCEPTION 'Post-check failed: unresolved tier has invented content overlap';
  END IF;
END $$;

COMMIT;
