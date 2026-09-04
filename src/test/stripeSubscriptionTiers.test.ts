import { describe, it, expect } from 'vitest';
import {
  extractInvoiceLinePriceIds,
  extractInvoiceSubscriptionId,
  extractInvoiceSubscriptionMetadata,
  extractPriceIdFromInvoiceLine,
  getInvoiceParentType,
  isHeirwaySubscriptionTierInvoice,
  isInitialSubscriptionInvoice,
  resolveInvoicePlanIdentity,
  resolveSubscriptionTierSelectedPlan,
  shouldDeferPaymentIntentToInvoice,
} from '@/lib/stripeSubscriptionTiers';

const PRICE_TO_PLAN = {
  price_1TCkVSBc2rQGllPQ2MkMSPDs: 'foundation',
  price_1TCkXxBc2rQGllPQgHfSTSWd: 'education',
};

const normalizePackageId = (id: string) =>
  ({ foundation_package: 'foundation', business_package: 'business', legacy: 'legacy' }[id] ??
  null);

describe('Clover invoice subscription ID / metadata', () => {
  it('A. Clover parent metadata resolves essentials', () => {
    const invoice = {
      billing_reason: 'subscription_create',
      parent: {
        type: 'subscription_details',
        subscription_details: {
          subscription: 'sub_ABC123',
          metadata: {
            flow: 'subscription_tier',
            subscription_id: 'essentials',
            user_id: 'cbcd78b1-c415-4236-a4e1-c60ab2e20a8c',
          },
        },
      },
    };

    expect(getInvoiceParentType(invoice)).toBe('subscription_details');
    expect(extractInvoiceSubscriptionId(invoice)).toBe('sub_ABC123');
    expect(extractInvoiceSubscriptionMetadata(invoice)).toEqual({
      flow: 'subscription_tier',
      subscription_id: 'essentials',
      user_id: 'cbcd78b1-c415-4236-a4e1-c60ab2e20a8c',
    });

    const resolved = resolveInvoicePlanIdentity({ invoice, priceToPlan: PRICE_TO_PLAN });
    expect(resolved).toEqual({
      kind: 'subscription_tier',
      planId: 'essentials',
      source: 'parent_metadata',
    });
  });

  it('B. incomplete parent metadata + subscription retrieve metadata', () => {
    const invoice = {
      parent: {
        type: 'subscription_details',
        subscription_details: {
          subscription: 'sub_DEF',
          metadata: {},
        },
      },
    };

    expect(extractInvoiceSubscriptionId(invoice)).toBe('sub_DEF');
    expect(resolveInvoicePlanIdentity({ invoice, priceToPlan: PRICE_TO_PLAN }).kind).toBe(
      'unrelated',
    );

    const resolved = resolveInvoicePlanIdentity({
      invoice,
      subscriptionMetadata: {
        flow: 'subscription_tier',
        subscription_id: 'steward',
        user_id: 'user-1',
      },
      priceToPlan: PRICE_TO_PLAN,
    });
    expect(resolved).toEqual({
      kind: 'subscription_tier',
      planId: 'steward',
      source: 'subscription_metadata',
    });
  });

  it('C. Clover line pricing.price_details.price resolves', () => {
    const line = {
      pricing: {
        type: 'price_details',
        price_details: { price: 'price_1TCkXxBc2rQGllPQgHfSTSWd' },
      },
    };
    expect(extractPriceIdFromInvoiceLine(line)).toBe('price_1TCkXxBc2rQGllPQgHfSTSWd');

    const invoice = {
      lines: { data: [line] },
    };
    expect(extractInvoiceLinePriceIds(invoice)).toEqual(['price_1TCkXxBc2rQGllPQgHfSTSWd']);

    const resolved = resolveInvoicePlanIdentity({
      invoice,
      priceToPlan: PRICE_TO_PLAN,
    });
    expect(resolved).toEqual({ kind: 'legacy_or_package', planId: 'education' });
  });

  it('D. Legacy invoice.subscription shape remains supported', () => {
    const invoice = {
      subscription: 'sub_LEGACY',
      metadata: {},
    };
    expect(extractInvoiceSubscriptionId(invoice)).toBe('sub_LEGACY');

    const resolved = resolveInvoicePlanIdentity({
      invoice,
      subscriptionMetadata: {
        flow: 'subscription_tier',
        subscription_id: 'gold',
      },
      priceToPlan: PRICE_TO_PLAN,
    });
    expect(resolved).toEqual({
      kind: 'subscription_tier',
      planId: 'gold',
      source: 'subscription_metadata',
    });
  });
});

describe('subscription_tier validation / renewal / PI', () => {
  it('E. Unknown subscription_id does not invent a plan', () => {
    expect(
      resolveSubscriptionTierSelectedPlan({
        flow: 'subscription_tier',
        subscription_id: 'platinum',
      }),
    ).toBeNull();

    const resolved = resolveInvoicePlanIdentity({
      invoice: {
        parent: {
          type: 'subscription_details',
          subscription_details: {
            subscription: 'sub_X',
            metadata: { flow: 'subscription_tier', subscription_id: 'platinum' },
          },
        },
      },
      priceToPlan: PRICE_TO_PLAN,
    });
    expect(resolved.kind).toBe('tier_resolution_failed');
  });

  it('F. Renewal billing reason is not initial', () => {
    expect(isInitialSubscriptionInvoice('subscription_create')).toBe(true);
    expect(isInitialSubscriptionInvoice('subscription_cycle')).toBe(false);
  });

  it('G. subscription_tier PaymentIntent remains deferred', () => {
    expect(
      shouldDeferPaymentIntentToInvoice({
        flow: 'subscription_tier',
        subscription_id: 'essentials',
      }),
    ).toBe(true);
  });

  it('H. Known subscription_tier resolution failure is not silent success', () => {
    const invoice = {
      parent: {
        type: 'subscription_details',
        subscription_details: {
          subscription: 'sub_fail',
          metadata: { flow: 'subscription_tier', subscription_id: 'essentials' },
        },
      },
    };
    expect(isHeirwaySubscriptionTierInvoice(invoice)).toBe(true);

    // Simulate missing/broken allowlist by forcing empty subscription_id after flow detect
    const failed = resolveInvoicePlanIdentity({
      invoice: {
        parent: {
          type: 'subscription_details',
          subscription_details: {
            subscription: 'sub_fail',
            metadata: { flow: 'subscription_tier', subscription_id: '' },
          },
        },
      },
      priceToPlan: PRICE_TO_PLAN,
    });
    expect(failed.kind).toBe('tier_resolution_failed');
  });

  it('I. Unrelated Stripe invoice is intentional acknowledge/skip', () => {
    const resolved = resolveInvoicePlanIdentity({
      invoice: {
        metadata: {},
        lines: {
          data: [
            {
              pricing: {
                price_details: { price: 'price_unrelated_xyz' },
              },
            },
          ],
        },
      },
      priceToPlan: PRICE_TO_PLAN,
    });
    expect(resolved).toEqual({ kind: 'unrelated' });
  });

  it('G. package / one-time metadata still maps via package_id', () => {
    const resolved = resolveInvoicePlanIdentity({
      invoice: { metadata: { package_id: 'foundation_package' } },
      priceToPlan: PRICE_TO_PLAN,
      normalizePackageId,
    });
    expect(resolved).toEqual({ kind: 'legacy_or_package', planId: 'foundation' });
  });

  it('does not infer plan from dollar amounts', () => {
    const resolved = resolveInvoicePlanIdentity({
      invoice: {
        // @ts-expect-error amount must never drive resolution
        amount_paid: 1900,
        lines: { data: [{ amount: 1900 }] },
      },
      priceToPlan: PRICE_TO_PLAN,
    });
    expect(resolved.kind).toBe('unrelated');
  });
});
