import { describe, it, expect } from 'vitest';
import type { HeirwayPlanCatalogRow } from '@/lib/planCatalogTypes';
import {
  canViewCatalogContent,
  contentAccessKeysFromCatalogRow,
  portalTierFromCatalogRow,
  resolveCatalogRowForSelectedPlan,
  resolvePlanEntitlements,
  arraysOverlap,
} from '@/lib/planEntitlementAccess';

function catalogFixture(): HeirwayPlanCatalogRow[] {
  const base = {
    stripe_checkout_key: null,
    offered: true,
    active: true,
    sort_order: 0,
    metadata: {},
    created_at: '',
    updated_at: '',
    plan_category: 'legacy_subscription',
  };
  return [
    {
      ...base,
      internal_key: 'free',
      display_name: 'Free',
      selected_plan_key: 'free',
      client_portal_tier: 'free',
      content_access_keys: ['free'],
      sort_order: 0,
    },
    {
      ...base,
      internal_key: 'education',
      display_name: 'Education',
      selected_plan_key: 'education',
      client_portal_tier: 'education',
      content_access_keys: ['education'],
      sort_order: 10,
    },
    {
      ...base,
      internal_key: 'foundation',
      display_name: 'Foundation',
      selected_plan_key: 'foundation',
      client_portal_tier: 'trust',
      content_access_keys: ['foundation'],
      sort_order: 20,
    },
    {
      ...base,
      internal_key: 'business',
      display_name: 'Business',
      selected_plan_key: 'business',
      client_portal_tier: 'trust',
      content_access_keys: ['business'],
      sort_order: 30,
    },
    {
      ...base,
      internal_key: 'wealth_builder',
      display_name: 'Wealth Builder',
      selected_plan_key: 'wealth_builder',
      client_portal_tier: 'trust',
      content_access_keys: ['wealth_builder'],
      sort_order: 40,
    },
    {
      ...base,
      internal_key: 'legacy',
      display_name: 'Legacy',
      selected_plan_key: 'legacy',
      client_portal_tier: null,
      content_access_keys: ['legacy'],
      plan_category: 'trust_package',
      sort_order: 50,
    },
    {
      ...base,
      internal_key: 'essentials',
      display_name: 'Essentials',
      selected_plan_key: 'essentials',
      client_portal_tier: null,
      content_access_keys: [],
      plan_category: 'subscription_tier',
      sort_order: 60,
    },
    {
      ...base,
      internal_key: 'steward',
      display_name: 'Steward',
      selected_plan_key: 'steward',
      client_portal_tier: null,
      content_access_keys: [],
      plan_category: 'subscription_tier',
      sort_order: 70,
    },
    {
      ...base,
      internal_key: 'gold',
      display_name: 'Gold',
      selected_plan_key: 'gold',
      client_portal_tier: null,
      content_access_keys: [],
      plan_category: 'subscription_tier',
      sort_order: 80,
    },
  ] as HeirwayPlanCatalogRow[];
}

describe('resolvePlanEntitlements portal tier', () => {
  const catalog = catalogFixture();

  it('free', () => {
    const r = resolvePlanEntitlements(catalog, 'free');
    expect(r.portalTier).toBe('free');
    expect(r.contentAccessKeys).toEqual(['free']);
  });

  it('education', () => {
    const r = resolvePlanEntitlements(catalog, 'education');
    expect(r.portalTier).toBe('education');
    expect(r.contentAccessKeys).toEqual(['education']);
  });

  it('foundation trust', () => {
    const r = resolvePlanEntitlements(catalog, 'foundation');
    expect(r.portalTier).toBe('trust');
    expect(r.contentAccessKeys).toEqual(['foundation']);
  });

  it('business trust', () => {
    const r = resolvePlanEntitlements(catalog, 'business');
    expect(r.portalTier).toBe('trust');
    expect(r.contentAccessKeys).toEqual(['business']);
  });

  it('wealth_builder trust', () => {
    const r = resolvePlanEntitlements(catalog, 'wealth_builder');
    expect(r.portalTier).toBe('trust');
    expect(r.contentAccessKeys).toEqual(['wealth_builder']);
  });

  it('legacy NULL portal fail-closed to free', () => {
    const r = resolvePlanEntitlements(catalog, 'legacy');
    expect(r.portalTier).toBe('free');
    expect(r.contentAccessKeys).toEqual(['legacy']);
  });

  it('essentials empty keys NULL portal', () => {
    const r = resolvePlanEntitlements(catalog, 'essentials');
    expect(r.portalTier).toBe('free');
    expect(r.contentAccessKeys).toEqual([]);
  });

  it('steward empty keys', () => {
    const r = resolvePlanEntitlements(catalog, 'steward');
    expect(r.portalTier).toBe('free');
    expect(r.contentAccessKeys).toEqual([]);
  });

  it('gold empty keys', () => {
    const r = resolvePlanEntitlements(catalog, 'gold');
    expect(r.portalTier).toBe('free');
    expect(r.contentAccessKeys).toEqual([]);
  });

  it('unknown_plan fail closed', () => {
    const r = resolvePlanEntitlements(catalog, 'unknown_plan');
    expect(r.catalogRow).toBeUndefined();
    expect(r.portalTier).toBe('free');
    expect(r.contentAccessKeys).toEqual([]);
  });

  it('null selected_plan coalesces to free', () => {
    const r = resolvePlanEntitlements(catalog, null);
    expect(r.portalTier).toBe('free');
    expect(r.contentAccessKeys).toEqual(['free']);
  });
});

describe('canViewCatalogContent', () => {
  it('overlap foundation allows foundation content', () => {
    expect(
      canViewCatalogContent({
        allowedPlans: ['foundation'],
        contentAccessKeys: ['foundation'],
      }),
    ).toBe(true);
  });

  it('foundation user denied business-only content', () => {
    expect(
      canViewCatalogContent({
        allowedPlans: ['business'],
        contentAccessKeys: ['foundation'],
      }),
    ).toBe(false);
  });

  it('empty keys deny education content', () => {
    expect(
      canViewCatalogContent({
        allowedPlans: ['education'],
        contentAccessKeys: [],
      }),
    ).toBe(false);
  });

  it('free in allowed_plans bypass', () => {
    expect(
      canViewCatalogContent({
        allowedPlans: ['free'],
        contentAccessKeys: [],
      }),
    ).toBe(true);
  });

  it('empty allowed_plans bypass', () => {
    expect(
      canViewCatalogContent({
        allowedPlans: [],
        contentAccessKeys: [],
      }),
    ).toBe(true);
  });

  it('premium bypass', () => {
    expect(
      canViewCatalogContent({
        allowedPlans: ['education'],
        contentAccessKeys: [],
        premiumAccessGranted: true,
      }),
    ).toBe(true);
  });

  it('admin bypass', () => {
    expect(
      canViewCatalogContent({
        allowedPlans: ['foundation'],
        contentAccessKeys: [],
        isAdmin: true,
      }),
    ).toBe(true);
  });
});

describe('arraysOverlap', () => {
  it('detects overlap', () => {
    expect(arraysOverlap(['foundation'], ['foundation', 'free'])).toBe(true);
    expect(arraysOverlap(['foundation'], ['business'])).toBe(false);
  });
});

describe('resolveCatalogRowForSelectedPlan', () => {
  const catalog = catalogFixture();

  it('matches selected_plan_key before internal_key', () => {
    const row = resolveCatalogRowForSelectedPlan(catalog, 'foundation');
    expect(row?.internal_key).toBe('foundation');
  });
});
