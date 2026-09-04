import type { ClientTier } from '@/lib/planCatalogTypes';
import type { HeirwayPlanCatalogRow } from '@/lib/planCatalogTypes';
import {
  lookupByInternalKey,
  lookupBySelectedPlanKey,
} from '@/lib/planCatalog';

/** Conservative fallback when catalog fetch fails — legacy content vocabulary only */
export const FALLBACK_CONTENT_PLAN_OPTIONS: Array<{ key: string; displayName: string }> = [
  { key: 'free', displayName: 'Free' },
  { key: 'education', displayName: 'Education' },
  { key: 'foundation', displayName: 'Foundation' },
  { key: 'business', displayName: 'Business' },
  { key: 'wealth_builder', displayName: 'Wealth Builder' },
];

/**
 * Resolve catalog row for heirway_clients.selected_plan.
 * Order: selected_plan_key match → internal_key fallback.
 * NULL/empty selected_plan coalesces to free catalog row when present.
 */
export function resolveCatalogRowForSelectedPlan(
  catalog: HeirwayPlanCatalogRow[],
  selectedPlan: string | null | undefined,
): HeirwayPlanCatalogRow | undefined {
  const normalized = selectedPlan?.trim() || null;
  if (!normalized) {
    return lookupBySelectedPlanKey(catalog, 'free') ?? lookupByInternalKey(catalog, 'free');
  }
  const bySelected = lookupBySelectedPlanKey(catalog, normalized);
  if (bySelected) return bySelected;
  return lookupByInternalKey(catalog, normalized);
}

/**
 * Portal navigation tier from catalog.client_portal_tier.
 * NULL or unknown → 'free' (fail-closed — does not grant trust navigation).
 */
export function portalTierFromCatalogRow(
  row: HeirwayPlanCatalogRow | undefined,
): ClientTier {
  if (!row?.client_portal_tier) return 'free';
  const tier = row.client_portal_tier;
  if (tier === 'education' || tier === 'trust' || tier === 'free') return tier;
  return 'free';
}

/** Explicit content entitlement keys — empty when unmapped or unresolved */
export function contentAccessKeysFromCatalogRow(
  row: HeirwayPlanCatalogRow | undefined,
): string[] {
  if (!row) return [];
  return [...row.content_access_keys];
}

export function arraysOverlap(a: string[], b: string[]): boolean {
  if (!a.length || !b.length) return false;
  const setB = new Set(b);
  return a.some((key) => setB.has(key));
}

/**
 * Client-side UX mirror of public.can_access_plan_content() bypass + overlap semantics.
 * RLS remains authoritative; this does not weaken server authorization.
 */
export function canViewCatalogContent(params: {
  allowedPlans: string[] | null | undefined;
  contentAccessKeys: string[];
  isAdmin?: boolean;
  premiumAccessGranted?: boolean;
}): boolean {
  const { allowedPlans, contentAccessKeys, isAdmin, premiumAccessGranted } = params;
  const plans = allowedPlans ?? [];

  if (plans.length === 0) return true;
  if (plans.includes('free')) return true;
  if (isAdmin) return true;
  if (premiumAccessGranted) return true;
  if (!contentAccessKeys.length) return false;
  return arraysOverlap(contentAccessKeys, plans);
}

export interface ResolvedPlanEntitlements {
  catalogRow: HeirwayPlanCatalogRow | undefined;
  portalTier: ClientTier;
  contentAccessKeys: string[];
  selectedPlanKey: string | null;
}

/**
 * Full entitlement resolution for a stored selected_plan value.
 */
export function resolvePlanEntitlements(
  catalog: HeirwayPlanCatalogRow[],
  selectedPlan: string | null | undefined,
): ResolvedPlanEntitlements {
  const catalogRow = resolveCatalogRowForSelectedPlan(catalog, selectedPlan);
  return {
    catalogRow,
    portalTier: portalTierFromCatalogRow(catalogRow),
    contentAccessKeys: contentAccessKeysFromCatalogRow(catalogRow),
    selectedPlanKey: selectedPlan?.trim() || null,
  };
}

/** Admin selected_plan assignment options — value is selected_plan_key */
export function getSelectedPlanAssignmentOptions(
  catalog: HeirwayPlanCatalogRow[],
): Array<{ value: string; label: string }> {
  const seen = new Set<string>();
  const options: Array<{ value: string; label: string }> = [];

  for (const row of [...catalog].sort((a, b) => a.sort_order - b.sort_order)) {
    if (!row.active || seen.has(row.selected_plan_key)) continue;
    seen.add(row.selected_plan_key);
    options.push({ value: row.selected_plan_key, label: row.display_name });
  }

  if (!seen.has('free')) {
    options.unshift({ value: 'free', label: 'Free' });
  }

  return options;
}
