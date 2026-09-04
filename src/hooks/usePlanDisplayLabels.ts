import { useMemo } from 'react';
import { getPlanDisplayName, PLAN_OPTION_KEYS, FALLBACK_PLAN_LABELS } from '@/lib/planDisplayLabels';
import { usePlanCatalog } from '@/hooks/usePlanCatalog';
import { getSelectedPlanAssignmentOptions } from '@/lib/planEntitlementAccess';

/** Ensure a stored selected_plan appears in assignment dropdown (preserve legacy client values) */
export function withCurrentPlanOption(
  options: Array<{ value: string; label: string }>,
  currentPlan: string | null | undefined,
  catalog?: { internal_key: string; selected_plan_key: string; display_name: string }[],
): Array<{ value: string; label: string }> {
  const key = currentPlan?.trim();
  if (!key || options.some((o) => o.value === key)) return options;
  return [...options, { value: key, label: getPlanDisplayName(key, catalog) }];
}

/** Catalog-backed presentation labels with static-key fallback */
export function usePlanDisplayLabels() {
  const { plans, loading, fromCatalog, error } = usePlanCatalog();

  const planLabel = useMemo(
    () => (planKey: string | null | undefined) => getPlanDisplayName(planKey, plans),
    [plans],
  );

  const assignmentOptions = useMemo(() => {
    if (fromCatalog && plans.length > 0) {
      return getSelectedPlanAssignmentOptions(plans);
    }
    return PLAN_OPTION_KEYS.map((key) => ({
      value: key,
      label: FALLBACK_PLAN_LABELS[key] ?? key,
    }));
  }, [plans, fromCatalog]);

  return {
    planLabel,
    /** @deprecated use assignmentOptions — kept for callers not yet migrated */
    planOptions: PLAN_OPTION_KEYS,
    assignmentOptions,
    catalog: plans,
    loading,
    fromCatalog,
    error,
  };
}
