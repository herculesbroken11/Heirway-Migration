import { supabase } from '@/integrations/supabase/client';

/** Trust package selected_plan values that unlock premium subscriptions. */
const TRUST_PACKAGE_PLANS = new Set([
  // New package IDs
  'legacy',
  'foundation_package',
  'business_package',
  // Wealth Builder (unchanged id)
  'wealth_builder',
  // Legacy/grandfathered subscription plans that were originally trust plans
  'foundation',
  'business',
]);

export interface PremiumEligibility {
  eligible: boolean;
  reason: 'trust_package' | 'admin_granted' | 'not_eligible' | 'not_authenticated';
}

/**
 * A user can subscribe to Steward or Gold ONLY if:
 *   - they have purchased a trust package, OR
 *   - an admin has granted them premium access.
 * Anyone else is limited to Free or Essentials.
 */
export async function checkPremiumEligibility(): Promise<PremiumEligibility> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { eligible: false, reason: 'not_authenticated' };

  const { data: client } = await supabase
    .from('heirway_clients')
    .select('selected_plan, premium_access_granted')
    .eq('user_id', user.id)
    .maybeSingle();

  if (client?.premium_access_granted) {
    return { eligible: true, reason: 'admin_granted' };
  }
  if (client?.selected_plan && TRUST_PACKAGE_PLANS.has(client.selected_plan)) {
    return { eligible: true, reason: 'trust_package' };
  }
  return { eligible: false, reason: 'not_eligible' };
}

/** Sync check when the client record is already loaded. */
export function isPremiumEligible(client: {
  selected_plan?: string | null;
  premium_access_granted?: boolean | null;
} | null): boolean {
  if (!client) return false;
  if (client.premium_access_granted) return true;
  if (client.selected_plan && TRUST_PACKAGE_PLANS.has(client.selected_plan)) return true;
  return false;
}

/** Subscription IDs that require premium eligibility. */
export const PREMIUM_SUBSCRIPTION_IDS = new Set(['steward', 'gold']);
