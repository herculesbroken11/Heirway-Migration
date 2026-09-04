import { useMemo } from 'react';
import { usePlanCatalog } from '@/hooks/usePlanCatalog';
import { getContentAccessKeyOptions } from '@/lib/planCatalog';
import { FALLBACK_CONTENT_PLAN_OPTIONS } from '@/lib/planEntitlementAccess';

/** Catalog-driven content entitlement key options for admin content tagging */
export function useContentPlanOptions() {
  const { plans, loading, fromCatalog, error } = usePlanCatalog();

  const options = useMemo(() => {
    if (fromCatalog && plans.length > 0) {
      return getContentAccessKeyOptions(plans);
    }
    return FALLBACK_CONTENT_PLAN_OPTIONS;
  }, [plans, fromCatalog]);

  return {
    options,
    loading,
    fromCatalog,
    error,
  };
}
