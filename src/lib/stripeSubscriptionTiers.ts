/**
 * Pure helpers for Stripe subscription_tier + Clover/Basil invoice parsing.
 * Mirrors decision logic in supabase/functions/stripe-webhook/index.ts.
 * Keep in sync with the Edge Function — do not invent additional mappings.
 */

export const SUBSCRIPTION_TIER_IDS = new Set(["essentials", "steward", "gold"]);

export type SubscriptionTierId = "essentials" | "steward" | "gold";

export type StripeMetadataLike = {
  flow?: string | null;
  subscription_id?: string | null;
  user_id?: string | null;
  plan_id?: string | null;
  package_id?: string | null;
  [key: string]: string | null | undefined;
} | null | undefined;

/** Minimal invoice shape covering legacy + Clover/Basil fields we read. */
export type InvoiceLike = {
  subscription?: string | { id?: string } | null;
  metadata?: StripeMetadataLike;
  billing_reason?: string | null;
  parent?: {
    type?: string | null;
    subscription_details?: {
      subscription?: string | { id?: string } | null;
      metadata?: StripeMetadataLike;
    } | null;
  } | null;
  lines?: {
    data?: InvoiceLineLike[] | null;
  } | null;
};

export type InvoiceLineLike = {
  price?: { id?: string | null } | string | null;
  pricing?: {
    type?: string | null;
    price_details?: {
      price?: string | { id?: string | null } | null;
    } | null;
  } | null;
};

export function isSubscriptionTierFlow(metadata: StripeMetadataLike): boolean {
  if (!metadata) return false;
  if (metadata.flow === "subscription_tier") return true;
  const tierId = metadata.subscription_id;
  return tierId ? SUBSCRIPTION_TIER_IDS.has(tierId) : false;
}

/**
 * Resolve Stripe subscription_tier metadata → heirway_clients.selected_plan.
 * selected_plan equals subscription_id for the allowlisted three tiers only.
 */
export function resolveSubscriptionTierSelectedPlan(
  metadata: StripeMetadataLike,
): SubscriptionTierId | null {
  if (!isSubscriptionTierFlow(metadata)) return null;
  const id = metadata?.subscription_id?.trim();
  if (!id || !SUBSCRIPTION_TIER_IDS.has(id)) return null;
  return id as SubscriptionTierId;
}

/** Stripe invoice.billing_reason for the first subscription invoice. */
export function isInitialSubscriptionInvoice(
  billingReason: string | null | undefined,
): boolean {
  return billingReason === "subscription_create";
}

/** payment_intent.succeeded must not activate subscription_tier purchases. */
export function shouldDeferPaymentIntentToInvoice(
  metadata: StripeMetadataLike,
): boolean {
  return isSubscriptionTierFlow(metadata);
}

function expandId(value: string | { id?: string } | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (typeof value === "object" && typeof value.id === "string") {
    const trimmed = value.id.trim();
    return trimmed || null;
  }
  return null;
}

export function getInvoiceParentType(invoice: InvoiceLike): string | null {
  const type = invoice.parent?.type;
  return typeof type === "string" && type.trim() ? type.trim() : null;
}

/**
 * Clover/Basil first: parent.subscription_details.subscription
 * Legacy fallback: invoice.subscription
 */
export function extractInvoiceSubscriptionId(invoice: InvoiceLike): string | null {
  const parentType = invoice.parent?.type;
  if (parentType === "subscription_details" || invoice.parent?.subscription_details) {
    const fromParent = expandId(invoice.parent?.subscription_details?.subscription ?? null);
    if (fromParent) return fromParent;
  }
  return expandId(invoice.subscription ?? null);
}

/**
 * Prefer immutable snapshot on Clover invoices:
 * parent.subscription_details.metadata
 */
export function extractInvoiceSubscriptionMetadata(
  invoice: InvoiceLike,
): StripeMetadataLike {
  const parentMeta = invoice.parent?.subscription_details?.metadata;
  if (parentMeta && typeof parentMeta === "object") return parentMeta;
  return null;
}

/**
 * Modern: line.pricing.price_details.price
 * Legacy: line.price.id
 */
export function extractPriceIdFromInvoiceLine(line: InvoiceLineLike): string | null {
  const modern = expandId(line.pricing?.price_details?.price ?? null);
  if (modern) return modern;
  return expandId(line.price ?? null);
}

export function extractInvoiceLinePriceIds(invoice: InvoiceLike): string[] {
  const lines = invoice.lines?.data ?? [];
  const ids: string[] = [];
  for (const line of lines) {
    const id = extractPriceIdFromInvoiceLine(line);
    if (id) ids.push(id);
  }
  return ids;
}

/**
 * Whether this invoice is clearly a Heirway subscription_tier event
 * (should fail processing if plan cannot be resolved — not silent complete).
 */
export function isHeirwaySubscriptionTierInvoice(invoice: InvoiceLike): boolean {
  if (isSubscriptionTierFlow(invoice.metadata)) return true;
  if (isSubscriptionTierFlow(extractInvoiceSubscriptionMetadata(invoice))) return true;
  return false;
}

export type InvoicePlanResolution =
  | { kind: "subscription_tier"; planId: SubscriptionTierId; source: "parent_metadata" | "subscription_metadata" }
  | { kind: "legacy_or_package"; planId: string }
  | { kind: "unrelated" }
  | { kind: "tier_resolution_failed"; reason: string };

/**
 * Pure plan resolution given invoice fields + optional retrieved subscription metadata/price ids.
 * Does not invent mappings; amount is never used.
 */
export function resolveInvoicePlanIdentity(params: {
  invoice: InvoiceLike;
  subscriptionMetadata?: StripeMetadataLike;
  subscriptionPriceIds?: string[];
  priceToPlan?: Record<string, string>;
  normalizePackageId?: (packageId: string) => string | null;
}): InvoicePlanResolution {
  const {
    invoice,
    subscriptionMetadata,
    subscriptionPriceIds = [],
    priceToPlan = {},
    normalizePackageId,
  } = params;

  const invoiceMeta = invoice.metadata;
  if (invoiceMeta?.plan_id?.trim()) {
    return { kind: "legacy_or_package", planId: invoiceMeta.plan_id.trim() };
  }
  if (invoiceMeta?.package_id?.trim() && normalizePackageId) {
    const mapped = normalizePackageId(invoiceMeta.package_id.trim());
    if (!mapped) {
      if (isHeirwaySubscriptionTierInvoice(invoice)) {
        return { kind: "tier_resolution_failed", reason: "Unresolved package_id on subscription_tier invoice" };
      }
      return { kind: "unrelated" };
    }
    return { kind: "legacy_or_package", planId: mapped };
  }

  const parentMeta = extractInvoiceSubscriptionMetadata(invoice);
  if (isSubscriptionTierFlow(parentMeta)) {
    const tier = resolveSubscriptionTierSelectedPlan(parentMeta);
    if (!tier) {
      return {
        kind: "tier_resolution_failed",
        reason: "Subscription tier flow with unresolved subscription_id (parent metadata)",
      };
    }
    return { kind: "subscription_tier", planId: tier, source: "parent_metadata" };
  }

  if (isSubscriptionTierFlow(subscriptionMetadata)) {
    const tier = resolveSubscriptionTierSelectedPlan(subscriptionMetadata);
    if (!tier) {
      return {
        kind: "tier_resolution_failed",
        reason: "Subscription tier flow with unresolved subscription_id (subscription metadata)",
      };
    }
    return { kind: "subscription_tier", planId: tier, source: "subscription_metadata" };
  }

  if (subscriptionMetadata?.plan_id?.trim()) {
    return { kind: "legacy_or_package", planId: subscriptionMetadata.plan_id.trim() };
  }
  if (subscriptionMetadata?.package_id?.trim() && normalizePackageId) {
    const mapped = normalizePackageId(subscriptionMetadata.package_id.trim());
    if (!mapped) return { kind: "unrelated" };
    return { kind: "legacy_or_package", planId: mapped };
  }

  for (const priceId of subscriptionPriceIds) {
    const mapped = priceToPlan[priceId];
    if (mapped) return { kind: "legacy_or_package", planId: mapped };
  }

  for (const priceId of extractInvoiceLinePriceIds(invoice)) {
    const mapped = priceToPlan[priceId];
    if (mapped) return { kind: "legacy_or_package", planId: mapped };
  }

  if (isHeirwaySubscriptionTierInvoice(invoice) || isSubscriptionTierFlow(subscriptionMetadata)) {
    return {
      kind: "tier_resolution_failed",
      reason: "Could not resolve plan for Heirway subscription_tier invoice",
    };
  }

  return { kind: "unrelated" };
}
