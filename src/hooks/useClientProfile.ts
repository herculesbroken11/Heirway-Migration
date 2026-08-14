import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ClientTier = 'free' | 'education' | 'trust';

export interface ClientProfile {
  tier: ClientTier;
  client: any;
  user: any;
  clientId: string | null;
  planName: string | null;
  loading: boolean;
  /** For Wealth Builder clients: whether all trusts are marked complete */
  wealthBuilderTrustsComplete: boolean;
  /** For Wealth Builder clients: whether within 24-month education window */
  wealthBuilderEducationActive: boolean;
}

/**
 * Determines client access tier:
 * - 'free': no plan or free → free modules only + asset tracker
 * - 'education': education plan → free + paid modules + asset tracker
 * - 'trust': foundation/business/wealth_builder → full access
 *
 * Wealth Builder special rules:
 * - One-time payment, no ongoing subscription
 * - Gets Education-level access for 24 months from plan start
 * - After 24 months (trusts not complete) → drops to free-tier
 * - Once all trusts are complete → lifetime premium access (above education)
 */
export function useClientProfile(): ClientProfile {
  const [profile, setProfile] = useState<ClientProfile>({
    tier: 'free',
    client: null,
    user: null,
    clientId: null,
    planName: null,
    loading: true, // Start as true to prevent flash
    wealthBuilderTrustsComplete: false,
    wealthBuilderEducationActive: false,
  });

  useEffect(() => {
    loadProfile();

    // Listen for admin preview changes
    const handlePreviewChange = () => loadProfile();
    window.addEventListener('admin-preview-change', handlePreviewChange);
    return () => window.removeEventListener('admin-preview-change', handlePreviewChange);
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setProfile(p => ({ ...p, loading: false }));
      return;
    }

    const { data: client } = await supabase
      .from('heirway_clients')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    const selectedPlan = client?.selected_plan || null;
    let tier: ClientTier = 'free';
    let wealthBuilderTrustsComplete = false;
    let wealthBuilderEducationActive = false;

    if (selectedPlan === 'education') {
      tier = 'education';
    } else if (selectedPlan === 'foundation' || selectedPlan === 'business') {
      tier = 'trust';
    } else if (selectedPlan === 'wealth_builder') {
      // Wealth Builder always gets trust-tier access (they paid for it)
      tier = 'trust';

      // Check if all trusts are complete
      const { data: trusts } = await supabase
        .from('heirway_trust_progress')
        .select('id, stage')
        .eq('client_id', client?.id);

      const allTrustsComplete = trusts && trusts.length > 0 &&
        trusts.every(t => t.stage === 'trusts_complete');
      wealthBuilderTrustsComplete = !!allTrustsComplete;

      // Check 24-month education window (for education content access)
      const planStarted = client?.plan_started_at || client?.created_at;
      if (planStarted) {
        const startDate = new Date(planStarted);
        const now = new Date();
        const monthsDiff = (now.getFullYear() - startDate.getFullYear()) * 12 +
          (now.getMonth() - startDate.getMonth());
        if (monthsDiff < 24) {
          wealthBuilderEducationActive = true;
        }
        // After 24 months with incomplete trusts, they keep trust tier
        // but lose education content access (wealthBuilderEducationActive stays false)
      } else {
        wealthBuilderEducationActive = true;
      }
    }

    // Check for admin preview override
    const previewPlan = sessionStorage.getItem('admin_preview_plan');
    if (previewPlan) {
      let previewTier: ClientTier = 'free';
      if (previewPlan === 'education') previewTier = 'education';
      else if (previewPlan === 'foundation' || previewPlan === 'business' || previewPlan === 'wealth_builder') previewTier = 'trust';

      setProfile({
        tier: previewTier,
        client: client ? { ...client, selected_plan: previewPlan } : client,
        user,
        clientId: client?.id || null,
        planName: previewPlan,
        loading: false,
        wealthBuilderTrustsComplete: previewPlan === 'wealth_builder',
        wealthBuilderEducationActive: false,
      });
      return;
    }

    setProfile({
      tier,
      client,
      user,
      clientId: client?.id || null,
      planName: selectedPlan,
      loading: false,
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
