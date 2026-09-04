-- Phase 1 Step 6E-3C-2A / 6E-3C-2A.1: Plan catalog + verified Stripe price associations.
-- Local preparation only. Wrapped in a single transaction with preflight + post-seed validation.
-- Does NOT modify heirway_clients, access functions, or existing RLS on content tables.

BEGIN;

-- ─── Dependency preflight (fail-closed) ─────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'update_updated_at_column'
      AND p.pronargs = 0
  ) THEN
    RAISE EXCEPTION 'Preflight failed: required function public.update_updated_at_column() is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'is_admin'
      AND p.pronargs = 0
  ) THEN
    RAISE EXCEPTION 'Preflight failed: required function public.is_admin() is missing';
  END IF;
END $$;

-- ─── Catalog (13 columns) ───────────────────────────────────────────────────

CREATE TABLE public.heirway_plan_catalog (
  internal_key text PRIMARY KEY,
  display_name text NOT NULL,
  plan_category text NOT NULL,
  stripe_checkout_key text UNIQUE,
  selected_plan_key text NOT NULL,
  client_portal_tier text,
  content_access_keys text[] NOT NULL DEFAULT '{}'::text[],
  offered boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT heirway_plan_catalog_plan_category_check CHECK (
    plan_category IN ('free', 'subscription_tier', 'trust_package', 'legacy_subscription')
  ),
  CONSTRAINT heirway_plan_catalog_client_portal_tier_check CHECK (
    client_portal_tier IS NULL OR client_portal_tier IN ('free', 'education', 'trust')
  )
);

COMMENT ON TABLE public.heirway_plan_catalog IS
  'Application plan catalog: display names, checkout keys, selected_plan mapping, entitlement hints. Stripe billing amounts remain in Stripe.';

COMMENT ON COLUMN public.heirway_plan_catalog.internal_key IS
  'Stable catalog row identity (not necessarily equal to selected_plan_key).';

COMMENT ON COLUMN public.heirway_plan_catalog.plan_category IS
  'High-level classification only. foundation and business rows are legacy_subscription but also carry trust-package checkout keys; billing flow MUST be resolved via stripe_checkout_key, heirway_plan_prices.price_role, and Stripe metadata — not plan_category alone.';

COMMENT ON COLUMN public.heirway_plan_catalog.stripe_checkout_key IS
  'Metadata/API checkout identifier (package_id or subscription_id). NULL when checkout uses plan_id only.';

COMMENT ON COLUMN public.heirway_plan_catalog.selected_plan_key IS
  'Value written to heirway_clients.selected_plan when this plan is activated.';

COMMENT ON COLUMN public.heirway_plan_catalog.content_access_keys IS
  'Keys satisfied for allowed_plans matching; empty until product defines new-tier semantics.';

CREATE INDEX idx_heirway_plan_catalog_offered_sort
  ON public.heirway_plan_catalog (offered, sort_order)
  WHERE active = true;

CREATE INDEX idx_heirway_plan_catalog_stripe_checkout_key
  ON public.heirway_plan_catalog (stripe_checkout_key)
  WHERE stripe_checkout_key IS NOT NULL;

-- ─── Price associations (10 columns) ────────────────────────────────────────

CREATE TABLE public.heirway_plan_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_catalog_key text NOT NULL
    REFERENCES public.heirway_plan_catalog (internal_key) ON DELETE RESTRICT,
  stripe_price_id text NOT NULL UNIQUE,
  price_role text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  verified_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT heirway_plan_prices_price_role_check CHECK (
    price_role IN (
      'legacy_monthly',
      'one_time',
      'tier_monthly',
      'package_cash',
      'package_deposit',
      'package_6mo_monthly',
      'package_12mo_monthly'
    )
  )
);

COMMENT ON TABLE public.heirway_plan_prices IS
  'Links catalog plans to verified Stripe Price IDs. Amount/currency/interval authoritative in Stripe.';

CREATE INDEX idx_heirway_plan_prices_plan_catalog_key
  ON public.heirway_plan_prices (plan_catalog_key);

CREATE INDEX idx_heirway_plan_prices_active_role
  ON public.heirway_plan_prices (plan_catalog_key, price_role)
  WHERE active = true;

-- ─── updated_at triggers (reuse existing function) ─────────────────────────

CREATE TRIGGER update_heirway_plan_catalog_updated_at
  BEFORE UPDATE ON public.heirway_plan_catalog
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_heirway_plan_prices_updated_at
  BEFORE UPDATE ON public.heirway_plan_prices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ─── Seed catalog (9 identities — no destructive renames) ────────────────────

INSERT INTO public.heirway_plan_catalog (
  internal_key,
  display_name,
  plan_category,
  stripe_checkout_key,
  selected_plan_key,
  client_portal_tier,
  content_access_keys,
  offered,
  active,
  sort_order,
  metadata
) VALUES
  (
    'free',
    'Free',
    'free',
    NULL,
    'free',
    'free',
    ARRAY['free']::text[],
    true,
    true,
    0,
    '{"source":"6E-3C-2A","notes":"NULL selected_plan coalesces to free via current_user_plan()"}'::jsonb
  ),
  (
    'education',
    'Essentials (Legacy)',
    'legacy_subscription',
    NULL,
    'education',
    'education',
    ARRAY['education']::text[],
    false,
    true,
    90,
    '{"source":"6E-3C-2A","notes":"Grandfathered legacy subscription; not offered on new pricing page"}'::jsonb
  ),
  (
    'foundation',
    'Foundation',
    'legacy_subscription',
    'foundation_package',
    'foundation',
    'trust',
    ARRAY['foundation']::text[],
    true,
    true,
    50,
    '{"source":"6E-3C-2A","billing_flow_note":"plan_category legacy_subscription; trust package checkout via stripe_checkout_key foundation_package and package_* price_roles"}'::jsonb
  ),
  (
    'business',
    'Business',
    'legacy_subscription',
    'business_package',
    'business',
    'trust',
    ARRAY['business']::text[],
    true,
    true,
    60,
    '{"source":"6E-3C-2A","billing_flow_note":"plan_category legacy_subscription; trust package checkout via stripe_checkout_key business_package and package_* price_roles"}'::jsonb
  ),
  (
    'wealth_builder',
    'Wealth Builder',
    'legacy_subscription',
    NULL,
    'wealth_builder',
    'trust',
    ARRAY['wealth_builder']::text[],
    true,
    true,
    70,
    '{"source":"6E-3C-2A","notes":"Legacy one-time; consultation path on pricing"}'::jsonb
  ),
  (
    'legacy',
    'Legacy',
    'trust_package',
    'legacy',
    'legacy',
    NULL,
    ARRAY['legacy']::text[],
    true,
    true,
    40,
    '{"source":"6E-3C-2A","notes":"Trust package; premium eligibility per subscriptionAccess; no trust-tier nav in useClientProfile today"}'::jsonb
  ),
  (
    'essentials',
    'Essentials',
    'subscription_tier',
    'essentials',
    'essentials',
    NULL,
    '{}'::text[],
    true,
    true,
    10,
    '{"source":"6E-3C-2A","entitlement_status":"PRODUCT_DECISION_REQUIRED"}'::jsonb
  ),
  (
    'steward',
    'Steward',
    'subscription_tier',
    'steward',
    'steward',
    NULL,
    '{}'::text[],
    true,
    true,
    20,
    '{"source":"6E-3C-2A","entitlement_status":"PRODUCT_DECISION_REQUIRED"}'::jsonb
  ),
  (
    'gold',
    'Gold',
    'subscription_tier',
    'gold',
    'gold',
    NULL,
    '{}'::text[],
    true,
    true,
    30,
    '{"source":"6E-3C-2A","entitlement_status":"PRODUCT_DECISION_REQUIRED"}'::jsonb
  );

-- ─── Seed verified Stripe prices (19 — checklist 6E-3B-4E) ─────────────────

INSERT INTO public.heirway_plan_prices (
  plan_catalog_key,
  stripe_price_id,
  price_role,
  active,
  verified_at,
  metadata
) VALUES
  -- Legacy PRICE_TO_PLAN (4)
  (
    'foundation',
    'price_1TCkVSBc2rQGllPQ2MkMSPDs',
    'legacy_monthly',
    true,
    '2026-08-31T22:00:00+00'::timestamptz,
    '{"checklist":"PRICE_TO_PLAN","verified_step":"6E-3B-4E"}'::jsonb
  ),
  (
    'business',
    'price_1TCkXLBc2rQGllPQWdsCL3ZF',
    'legacy_monthly',
    true,
    '2026-08-31T22:00:00+00'::timestamptz,
    '{"checklist":"PRICE_TO_PLAN","verified_step":"6E-3B-4E"}'::jsonb
  ),
  (
    'wealth_builder',
    'price_1TCkXeBc2rQGllPQ51phA0P0',
    'one_time',
    true,
    '2026-08-31T22:00:00+00'::timestamptz,
    '{"checklist":"PRICE_TO_PLAN","verified_step":"6E-3B-4E"}'::jsonb
  ),
  (
    'education',
    'price_1TCkXxBc2rQGllPQgHfSTSWd',
    'legacy_monthly',
    true,
    '2026-08-31T22:00:00+00'::timestamptz,
    '{"checklist":"PRICE_TO_PLAN","verified_step":"6E-3B-4E"}'::jsonb
  ),
  -- New subscription tiers (3)
  (
    'essentials',
    'price_1TtXK8Bc2rQGllPQuEXthEfW',
    'tier_monthly',
    true,
    '2026-08-31T22:00:00+00'::timestamptz,
    '{"checklist":"G.1","verified_step":"6E-3B-4E"}'::jsonb
  ),
  (
    'steward',
    'price_1TtXKhBc2rQGllPQCLc9zQP2',
    'tier_monthly',
    true,
    '2026-08-31T22:00:00+00'::timestamptz,
    '{"checklist":"G.1","verified_step":"6E-3B-4E"}'::jsonb
  ),
  (
    'gold',
    'price_1TtXL5Bc2rQGllPQB9oORG63',
    'tier_monthly',
    true,
    '2026-08-31T22:00:00+00'::timestamptz,
    '{"checklist":"G.1","verified_step":"6E-3B-4E"}'::jsonb
  ),
  -- Trust package: legacy (4)
  (
    'legacy',
    'price_1TtXLUBc2rQGllPQuKIi9atL',
    'package_cash',
    true,
    '2026-08-31T22:00:00+00'::timestamptz,
    '{"checklist":"G.2.1","verified_step":"6E-3B-4E"}'::jsonb
  ),
  (
    'legacy',
    'price_1TtXUbBc2rQGllPQ75kT9XII',
    'package_deposit',
    true,
    '2026-08-31T22:00:00+00'::timestamptz,
    '{"checklist":"G.2.1","verified_step":"6E-3B-4E"}'::jsonb
  ),
  (
    'legacy',
    'price_1TtXLnBc2rQGllPQrUYPjhZz',
    'package_6mo_monthly',
    true,
    '2026-08-31T22:00:00+00'::timestamptz,
    '{"checklist":"G.2.1","verified_step":"6E-3B-4E"}'::jsonb
  ),
  (
    'legacy',
    'price_1TtXM4Bc2rQGllPQgyDvS633',
    'package_12mo_monthly',
    true,
    '2026-08-31T22:00:00+00'::timestamptz,
    '{"checklist":"G.2.1","verified_step":"6E-3B-4E"}'::jsonb
  ),
  -- Trust package: foundation (4) — catalog key foundation, checkout key foundation_package
  (
    'foundation',
    'price_1TtXQ7Bc2rQGllPQ1DmVKbM7',
    'package_cash',
    true,
    '2026-08-31T22:00:00+00'::timestamptz,
    '{"checklist":"G.2.2","stripe_checkout_key":"foundation_package","verified_step":"6E-3B-4E"}'::jsonb
  ),
  (
    'foundation',
    'price_1TtXUzBc2rQGllPQCJ0xjzEz',
    'package_deposit',
    true,
    '2026-08-31T22:00:00+00'::timestamptz,
    '{"checklist":"G.2.2","stripe_checkout_key":"foundation_package","verified_step":"6E-3B-4E"}'::jsonb
  ),
  (
    'foundation',
    'price_1TtXQuBc2rQGllPQOe3FQoZ6',
    'package_6mo_monthly',
    true,
    '2026-08-31T22:00:00+00'::timestamptz,
    '{"checklist":"G.2.2","stripe_checkout_key":"foundation_package","verified_step":"6E-3B-4E"}'::jsonb
  ),
  (
    'foundation',
    'price_1TtXRFBc2rQGllPQtlaultb9',
    'package_12mo_monthly',
    true,
    '2026-08-31T22:00:00+00'::timestamptz,
    '{"checklist":"G.2.2","stripe_checkout_key":"foundation_package","verified_step":"6E-3B-4E"}'::jsonb
  ),
  -- Trust package: business (4)
  (
    'business',
    'price_1TtXRtBc2rQGllPQn8OnnrZo',
    'package_cash',
    true,
    '2026-08-31T22:00:00+00'::timestamptz,
    '{"checklist":"G.2.3","stripe_checkout_key":"business_package","verified_step":"6E-3B-4E"}'::jsonb
  ),
  (
    'business',
    'price_1TtXWWBc2rQGllPQMJchhLYe',
    'package_deposit',
    true,
    '2026-08-31T22:00:00+00'::timestamptz,
    '{"checklist":"G.2.3","stripe_checkout_key":"business_package","verified_step":"6E-3B-4E"}'::jsonb
  ),
  (
    'business',
    'price_1TtXSBBc2rQGllPQakG1A7Tc',
    'package_6mo_monthly',
    true,
    '2026-08-31T22:00:00+00'::timestamptz,
    '{"checklist":"G.2.3","stripe_checkout_key":"business_package","verified_step":"6E-3B-4E"}'::jsonb
  ),
  (
    'business',
    'price_1TtXSmBc2rQGllPQDBFajt0g',
    'package_12mo_monthly',
    true,
    '2026-08-31T22:00:00+00'::timestamptz,
    '{"checklist":"G.2.3","stripe_checkout_key":"business_package","verified_step":"6E-3B-4E"}'::jsonb
  );

-- ─── RLS (does not alter existing content/client policies) ─────────────────

ALTER TABLE public.heirway_plan_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.heirway_plan_prices ENABLE ROW LEVEL SECURITY;

-- Catalog: all authenticated users may SELECT; only admins may mutate.
CREATE POLICY "Authenticated users can view plan catalog"
  ON public.heirway_plan_catalog
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage plan catalog"
  ON public.heirway_plan_catalog
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Prices: admin-only (SELECT/INSERT/UPDATE/DELETE). Edge Functions use service_role.
CREATE POLICY "Admins can manage plan prices"
  ON public.heirway_plan_prices
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─── Explicit privileges (RLS enforces row access; grants enable role operations) ─

REVOKE ALL ON TABLE public.heirway_plan_catalog FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.heirway_plan_prices FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.heirway_plan_catalog TO authenticated;
GRANT ALL ON TABLE public.heirway_plan_catalog TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.heirway_plan_prices TO authenticated;
GRANT ALL ON TABLE public.heirway_plan_prices TO service_role;

-- ─── Post-seed fail-closed validation ───────────────────────────────────────

DO $$
DECLARE
  catalog_count integer;
  price_count integer;
  distinct_price_count integer;
  orphan_price_count integer;
BEGIN
  SELECT COUNT(*) INTO catalog_count FROM public.heirway_plan_catalog;
  IF catalog_count <> 9 THEN
    RAISE EXCEPTION 'Post-seed validation failed: heirway_plan_catalog row count % (expected 9)', catalog_count;
  END IF;

  SELECT COUNT(*) INTO price_count FROM public.heirway_plan_prices;
  IF price_count <> 19 THEN
    RAISE EXCEPTION 'Post-seed validation failed: heirway_plan_prices row count % (expected 19)', price_count;
  END IF;

  SELECT COUNT(DISTINCT stripe_price_id) INTO distinct_price_count FROM public.heirway_plan_prices;
  IF distinct_price_count <> 19 THEN
    RAISE EXCEPTION 'Post-seed validation failed: distinct stripe_price_id count % (expected 19)', distinct_price_count;
  END IF;

  SELECT COUNT(*) INTO orphan_price_count
  FROM public.heirway_plan_prices p
  WHERE NOT EXISTS (
    SELECT 1 FROM public.heirway_plan_catalog c
    WHERE c.internal_key = p.plan_catalog_key
  );
  IF orphan_price_count <> 0 THEN
    RAISE EXCEPTION 'Post-seed validation failed: orphan plan_prices FK rows %', orphan_price_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.heirway_plan_catalog
    WHERE stripe_checkout_key = 'foundation_package'
      AND selected_plan_key = 'foundation'
  ) THEN
    RAISE EXCEPTION 'Post-seed validation failed: foundation_package must resolve to selected_plan_key foundation';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.heirway_plan_catalog
    WHERE stripe_checkout_key = 'business_package'
      AND selected_plan_key = 'business'
  ) THEN
    RAISE EXCEPTION 'Post-seed validation failed: business_package must resolve to selected_plan_key business';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.heirway_plan_catalog
    WHERE stripe_checkout_key = 'legacy'
      AND selected_plan_key = 'legacy'
  ) THEN
    RAISE EXCEPTION 'Post-seed validation failed: legacy checkout must resolve to selected_plan_key legacy';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.heirway_plan_catalog
    WHERE internal_key = 'essentials'
      AND client_portal_tier IS NULL
      AND content_access_keys = '{}'::text[]
  ) THEN
    RAISE EXCEPTION 'Post-seed validation failed: essentials must have NULL client_portal_tier and empty content_access_keys';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.heirway_plan_catalog
    WHERE internal_key = 'steward'
      AND client_portal_tier IS NULL
      AND content_access_keys = '{}'::text[]
  ) THEN
    RAISE EXCEPTION 'Post-seed validation failed: steward must have NULL client_portal_tier and empty content_access_keys';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.heirway_plan_catalog
    WHERE internal_key = 'gold'
      AND client_portal_tier IS NULL
      AND content_access_keys = '{}'::text[]
  ) THEN
    RAISE EXCEPTION 'Post-seed validation failed: gold must have NULL client_portal_tier and empty content_access_keys';
  END IF;
END $$;

COMMIT;
