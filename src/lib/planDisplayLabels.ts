import type { HeirwayPlanCatalogRow } from '@/lib/planCatalogTypes';

/** Static fallback labels when catalog is unavailable — keys unchanged */
export const FALLBACK_PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  education: 'Essentials (Legacy)',
  foundation: 'Foundation (Legacy)',
  business: 'Business (Legacy)',
  wealth_builder: 'Wealth Builder',
  legacy: 'Legacy',
  essentials: 'Essentials',
  steward: 'Steward',
  gold: 'Gold',
};

/** Admin/client plan selector keys — authorization keys, not display names */
export const PLAN_OPTION_KEYS = [
  'free',
  'essentials',
  'steward',
  'gold',
  'education',
  'foundation',
  'business',
  'wealth_builder',
] as const;

export type PlanOptionKey = typeof PLAN_OPTION_KEYS[number];

/**
 * Presentation label for a selected_plan / internal_key value.
 * Never use display_name for authorization — keys only.
 */
export function getPlanDisplayName(
  planKey: string | null | undefined,
  catalog?: HeirwayPlanCatalogRow[] | null,
): string {
  if (!planKey) return FALLBACK_PLAN_LABELS.free;

  if (catalog?.length) {
    const byInternal = catalog.find((row) => row.internal_key === planKey);
    if (byInternal) return byInternal.display_name;

    const bySelected = catalog.find((row) => row.selected_plan_key === planKey);
    if (bySelected) return bySelected.display_name;

    const byCheckout = catalog.find((row) => row.stripe_checkout_key === planKey);
    if (byCheckout) return byCheckout.display_name;
  }

  return FALLBACK_PLAN_LABELS[planKey] ?? planKey.replace(/_/g, ' ');
}
