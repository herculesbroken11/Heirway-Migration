import { useCallback, useEffect, useMemo, useState } from 'react';
import type { HeirwayPlanCatalogRow } from '@/lib/planCatalogTypes';
import {
  fetchPlanCatalog,
  lookupByInternalKey,
  lookupByStripeCheckoutKey,
  lookupBySelectedPlanKey,
} from '@/lib/planCatalog';

export function usePlanCatalog() {
  const [plans, setPlans] = useState<HeirwayPlanCatalogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromCatalog, setFromCatalog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await fetchPlanCatalog();
    if (fetchError) {
      setPlans([]);
      setFromCatalog(false);
      setError(fetchError);
    } else {
      setPlans(data);
      setFromCatalog(true);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activePlans = useMemo(
    () => plans.filter((row) => row.active).sort((a, b) => a.sort_order - b.sort_order),
    [plans],
  );

  const offeredPlans = useMemo(
    () => activePlans.filter((row) => row.offered),
    [activePlans],
  );

  return {
    plans,
    activePlans,
    offeredPlans,
    loading,
    fromCatalog,
    error,
    refresh: load,
    lookupByInternalKey: (key: string) => lookupByInternalKey(plans, key),
    lookupByStripeCheckoutKey: (key: string) => lookupByStripeCheckoutKey(plans, key),
    lookupBySelectedPlanKey: (key: string) => lookupBySelectedPlanKey(plans, key),
  };
}
