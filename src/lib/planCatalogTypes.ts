import type { Database } from '@/integrations/supabase/types';

export type HeirwayPlanCatalogRow =
  Database['public']['Tables']['heirway_plan_catalog']['Row'];

export type HeirwayPlanCatalogUpdate =
  Database['public']['Tables']['heirway_plan_catalog']['Update'];

export type HeirwayPlanPriceRow =
  Database['public']['Tables']['heirway_plan_prices']['Row'];

/** Portal navigation tier derived from catalog.client_portal_tier */
export type ClientTier = 'free' | 'education' | 'trust';

export type PlanCategory =
  | 'free'
  | 'subscription_tier'
  | 'trust_package'
  | 'legacy_subscription';

export type PriceRole =
  | 'legacy_monthly'
  | 'one_time'
  | 'tier_monthly'
  | 'package_cash'
  | 'package_deposit'
  | 'package_6mo_monthly'
  | 'package_12mo_monthly';

/** Safe admin-editable catalog fields for presentation/config (Step 6E-3C-3A) */
export type PlanCatalogEditableFields = Pick<
  HeirwayPlanCatalogUpdate,
  'display_name' | 'offered' | 'active' | 'sort_order' | 'stripe_checkout_key' | 'metadata'
>;

/** Admin-editable entitlement fields (Step 6E-3C-3D) — does not include identifiers or checkout keys */
export type PlanEntitlementFields = Pick<
  HeirwayPlanCatalogUpdate,
  'client_portal_tier' | 'content_access_keys'
>;

/** DB CHECK: client_portal_tier IS NULL OR IN ('free', 'education', 'trust') */
export type ClientPortalTier = 'free' | 'education' | 'trust';

export const CLIENT_PORTAL_TIER_OPTIONS: Array<{
  value: ClientPortalTier | null;
  label: string;
}> = [
  { value: null, label: 'None' },
  { value: 'free', label: 'Free portal tier' },
  { value: 'education', label: 'Education portal tier' },
  { value: 'trust', label: 'Trust portal tier' },
];
