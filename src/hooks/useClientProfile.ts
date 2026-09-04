import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fetchPlanCatalog } from '@/lib/planCatalog';
import type { ClientTier } from '@/lib/planCatalogTypes';
import type { HeirwayPlanCatalogRow } from '@/lib/planCatalogTypes';
import { resolvePlanEntitlements } from '@/lib/planEntitlementAccess';

export type { ClientTier };

export interface ClientProfile {
  tier: ClientTier;
  client: any;
  user: any;
  clientId: string | null;
  planName: string | null;
  loading: boolean;
  /** Catalog-backed content entitlement keys for UX filtering */
  contentAccessKeys: string[];
  premiumAccessGranted: boolean;
  /** True after catalog fetch completes (success or fail-closed fallback) */
  entitlementResolved: boolean;
  catalogRow: HeirwayPlanCatalogRow | undefined;
  /** For Wealth Builder clients: whether all trusts are marked complete */
  wealthBuilderTrustsComplete: boolean;
  /** For Wealth Builder clients: whether within 24-month education window */
  wealthBuilderEducationActive: boolean;
}

/**
 * Portal tier from heirway_plan_catalog.client_portal_tier.
 * NULL portal tier → 'free' (fail-closed for navigation).
 * Content access uses contentAccessKeys separately.
 */
export function useClientProfile(): ClientProfile {
  const [profile, setProfile] = useState<ClientProfile>({
    tier: 'free',
    client: null,
    user: null,
    clientId: null,
    planName: null,
    loading: true,
    contentAccessKeys: [],
    premiumAccessGranted: false,
    entitlementResolved: false,
    catalogRow: undefined,
    wealthBuilderTrustsComplete: false,
    wealthBuilderEducationActive: false,
  });

  useEffect(() => {
    loadProfile();

    const handlePreviewChange = () => loadProfile();
    window.addEventListener('admin-preview-change', handlePreviewChange);
    return () => window.removeEventListener('admin-preview-change', handlePreviewChange);
  }, []);

  const loadProfile = async () => {
    const { data: catalogResult } = await fetchPlanCatalog();
    const catalog = catalogResult ?? [];

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setProfile((p) => ({
        ...p,
        loading: false,
        entitlementResolved: true,
        contentAccessKeys: [],
        tier: 'free',
      }));
      return;
    }

    const { data: client } = await supabase
      .from('heirway_clients')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    const selectedPlan = client?.selected_plan || null;
    const premiumAccessGranted = Boolean(client?.premium_access_granted);

    let wealthBuilderTrustsComplete = false;
    let wealthBuilderEducationActive = false;

    if (selectedPlan === 'wealth_builder' && client?.id) {
      const { data: trusts } = await supabase
        .from('heirway_trust_progress')
        .select('id, stage')
        .eq('client_id', client.id);

      const allTrustsComplete =
        trusts && trusts.length > 0 && trusts.every((t) => t.stage === 'trusts_complete');
      wealthBuilderTrustsComplete = !!allTrustsComplete;

      const planStarted = client?.plan_started_at || client?.created_at;
      if (planStarted) {
        const startDate = new Date(planStarted);
        const now = new Date();
        const monthsDiff =
          (now.getFullYear() - startDate.getFullYear()) * 12 +
          (now.getMonth() - startDate.getMonth());
        wealthBuilderEducationActive = monthsDiff < 24;
      } else {
        wealthBuilderEducationActive = true;
      }
    }

    const previewPlan = sessionStorage.getItem('admin_preview_plan');
    const effectiveSelectedPlan = previewPlan || selectedPlan;
    const resolved = resolvePlanEntitlements(catalog, effectiveSelectedPlan);

    if (previewPlan) {
      setProfile({
        tier: resolved.portalTier,
        client: client ? { ...client, selected_plan: previewPlan } : client,
        user,
        clientId: client?.id || null,
        planName: previewPlan,
        loading: false,
        contentAccessKeys: resolved.contentAccessKeys,
        premiumAccessGranted,
        entitlementResolved: true,
        catalogRow: resolved.catalogRow,
        wealthBuilderTrustsComplete: previewPlan === 'wealth_builder',
        wealthBuilderEducationActive: false,
      });
      return;
    }

    setProfile({
      tier: resolved.portalTier,
      client,
      user,
      clientId: client?.id || null,
      planName: selectedPlan,
      loading: false,
      contentAccessKeys: resolved.contentAccessKeys,
      premiumAccessGranted,
      entitlementResolved: true,
      catalogRow: resolved.catalogRow,
      wealthBuilderTrustsComplete,
      wealthBuilderEducationActive,
    });
  };

  return profile;
}

/** Helper to set/clear admin preview mode */
export function setAdminPreviewPlan(plan: string | null) {
  if (plan) {
    sessionStorage.setItem('admin_preview_plan', plan);
  } else {
    sessionStorage.removeItem('admin_preview_plan');
  }
  window.dispatchEvent(new Event('admin-preview-change'));
}

export function getAdminPreviewPlan(): string | null {
  return sessionStorage.getItem('admin_preview_plan');
}
