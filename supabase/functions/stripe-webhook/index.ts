import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } }
);

const PRICE_TO_PLAN: Record<string, string> = {
  "price_1TCkVSBc2rQGllPQ2MkMSPDs": "foundation",
  "price_1TCkXLBc2rQGllPQWdsCL3ZF": "business",
  "price_1TCkXeBc2rQGllPQ51phA0P0": "wealth_builder",
  "price_1TCkXxBc2rQGllPQgHfSTSWd": "education",
};

const PLAN_LABELS: Record<string, string> = {
  foundation: "Foundation",
  business: "Business",
  wealth_builder: "Wealth Builder",
  education: "Education",
  legacy: "Legacy",
  essentials: "Essentials",
  steward: "Steward",
  gold: "Gold",
};

/** Stripe package_id → heirway_clients.selected_plan (explicit allowlist only). */
const PACKAGE_ID_TO_SELECTED_PLAN: Record<string, string> = {
  foundation_package: "foundation",
  business_package: "business",
  legacy: "legacy",
};

const SUBSCRIPTION_TIER_IDS = new Set(["essentials", "steward", "gold"]);

function normalizePackageId(packageId: string): string | null {
  return PACKAGE_ID_TO_SELECTED_PLAN[packageId] ?? null;
}

function isSubscriptionTierFlow(metadata: Stripe.Metadata | null | undefined): boolean {
  if (!metadata) return false;
  if (metadata.flow === "subscription_tier") return true;
  const tierId = metadata.subscription_id;
  return tierId ? SUBSCRIPTION_TIER_IDS.has(tierId) : false;
}

/** subscription_id → selected_plan for essentials/steward/gold only (identity mapping). */
function resolveSubscriptionTierSelectedPlan(
  metadata: Stripe.Metadata | null | undefined,
): string | null {
  if (!isSubscriptionTierFlow(metadata)) return null;
  const id = metadata?.subscription_id?.trim();
  if (!id || !SUBSCRIPTION_TIER_IDS.has(id)) return null;
  return id;
}

function isInitialSubscriptionInvoice(billingReason: string | null | undefined): boolean {
  return billingReason === "subscription_create";
}

function expandStripeId(
  value: string | { id?: string } | null | undefined,
): string | null {
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

/** Clover/Basil: parent.subscription_details.subscription; legacy: invoice.subscription */
function extractInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const parent = (invoice as any).parent;
  if (parent?.type === "subscription_details" || parent?.subscription_details) {
    const fromParent = expandStripeId(parent?.subscription_details?.subscription);
    if (fromParent) return fromParent;
  }
  return expandStripeId((invoice as any).subscription);
}

/** Prefer immutable Clover snapshot: parent.subscription_details.metadata */
function extractInvoiceSubscriptionMetadata(
  invoice: Stripe.Invoice,
): Stripe.Metadata | null {
  const parentMeta = (invoice as any).parent?.subscription_details?.metadata;
  if (parentMeta && typeof parentMeta === "object") return parentMeta as Stripe.Metadata;
  return null;
}

/** Modern: pricing.price_details.price; legacy: price.id */
function extractPriceIdFromInvoiceLine(line: any): string | null {
  const modern = expandStripeId(line?.pricing?.price_details?.price);
  if (modern) return modern;
  return expandStripeId(line?.price);
}

function extractInvoiceLinePriceIds(invoice: Stripe.Invoice): string[] {
  const lines = invoice.lines?.data ?? [];
  const ids: string[] = [];
  for (const line of lines) {
    const id = extractPriceIdFromInvoiceLine(line);
    if (id) ids.push(id);
  }
  return ids;
}

function isHeirwaySubscriptionTierInvoice(invoice: Stripe.Invoice): boolean {
  if (isSubscriptionTierFlow(invoice.metadata)) return true;
  if (isSubscriptionTierFlow(extractInvoiceSubscriptionMetadata(invoice))) return true;
  return false;
}

/** Renewals: keep plan active without resetting plan_started_at or firing signup side effects. */
async function maintainSubscriptionTierPlan(userId: string, planId: string): Promise<void> {
  console.log("[STRIPE-WEBHOOK] Subscription renewal; preserving original plan_started_at");
  const { error } = await supabase
    .from("heirway_clients")
    .update({
      plan_status: "active",
      selected_plan: planId,
    })
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to maintain subscription tier plan: ${error.message}`);
  }
}

function planLabelForEmail(planId: string): string {
  return PLAN_LABELS[planId] ?? planId;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ClaimResult = "claimed" | "completed" | "in_progress";

async function claimStripeEvent(eventId: string, eventType: string): Promise<ClaimResult> {
  const { data, error } = await supabase.rpc("claim_stripe_webhook_event", {
    event_id: eventId,
    event_type: eventType,
  });
  if (error) throw error;
  return data as ClaimResult;
}

async function completeStripeEvent(eventId: string): Promise<void> {
  const { error } = await supabase.rpc("complete_stripe_webhook_event", {
    event_id: eventId,
  });
  if (error) throw error;
}

async function failStripeEvent(eventId: string, errorMessage: string): Promise<void> {
  const { error } = await supabase.rpc("fail_stripe_webhook_event", {
    event_id: eventId,
    error_message: errorMessage,
  });
  if (error) console.error("[STRIPE-WEBHOOK] Failed to record event failure:", error);
}

async function findUserByEmail(email: string) {
  const { data: users } = await supabase.auth.admin.listUsers();
  return users?.users?.find((u) => u.email === email);
}

async function activatePlanForUser(
  userId: string,
  email: string,
  planId: string,
  sendNotifications: boolean
): Promise<void> {
  console.log(`[STRIPE-WEBHOOK] Activating plan ${planId} for user ${userId}`);

  const { error } = await supabase
    .from("heirway_clients")
    .update({
      plan_status: "active",
      selected_plan: planId,
      plan_started_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to update client record: ${error.message}`);
  }

  console.log(`[STRIPE-WEBHOOK] Successfully activated ${planId} for user ${userId}`);

  if (!sendNotifications) return;

  try {
    const { data: clientData } = await supabase
      .from("heirway_clients")
      .select("full_name, phone")
      .eq("user_id", userId)
      .maybeSingle();

    await supabase.functions.invoke("send-transactional-email", {
      body: {
        template: "payment_confirmation",
        to: email,
        props: {
          fullName: clientData?.full_name || "",
          planName: planLabelForEmail(planId),
        },
      },
    });

    supabase.functions.invoke("ghl-sync", {
      body: {
        source: "paid_customer",
        record: {
          full_name: clientData?.full_name || "",
          email,
          phone: clientData?.phone || null,
          plan_id: planId,
          plan_started_at: new Date().toISOString(),
        },
      },
    }).catch((err) => console.error("[STRIPE-WEBHOOK] GHL sync error:", err));
  } catch (emailErr) {
    console.error("[STRIPE-WEBHOOK] Payment email error:", emailErr);
    throw emailErr instanceof Error ? emailErr : new Error("Payment notification failed");
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
  if (session.metadata?.type === "payoff") {
    const userId = session.metadata.user_id;
    const subscriptionId = session.metadata.subscription_id;
    console.log(`[STRIPE-WEBHOOK] Payoff completed for user ${userId}, canceling sub ${subscriptionId}`);

    try {
      await stripe.subscriptions.cancel(subscriptionId);
    } catch (e) {
      console.error("[STRIPE-WEBHOOK] Error canceling subscription after payoff:", e);
    }

    const { error } = await supabase
      .from("heirway_clients")
      .update({ plan_status: "paid_off" })
      .eq("user_id", userId);

    if (error) {
      throw new Error(`Failed to mark plan paid_off: ${error.message}`);
    }

    console.log(`[STRIPE-WEBHOOK] Plan marked as paid_off for user ${userId}`);
    return;
  }

  // Subscription Checkout: invoice.payment_succeeded is canonical for activation.
  if (session.mode === "subscription") {
    console.log("[STRIPE-WEBHOOK] Subscription checkout completed; awaiting invoice.payment_succeeded");
    return;
  }

  // Extra payments adjust balance only; do not re-activate the plan.
  if (session.metadata?.type === "extra_payment") {
    console.log("[STRIPE-WEBHOOK] Extra payment checkout completed; no plan activation");
    return;
  }

  // One-time Checkout (create-checkout wealth_builder): session metadata carries plan_id.
  // create-checkout does not set payment_intent_data.metadata, so payment_intent.succeeded
  // typically lacks plan_id and does not duplicate this path.
  if (session.mode === "payment" && session.metadata?.plan_id) {
    const customerId = session.customer as string | null;
    if (!customerId) {
      console.log("[STRIPE-WEBHOOK] Checkout session missing customer; skipping activation");
      return;
    }

    const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
    if (!customer || customer.deleted || !customer.email) {
      console.log("[STRIPE-WEBHOOK] Checkout customer not found or missing email");
      return;
    }

    const user = await findUserByEmail(customer.email);
    if (!user) {
      console.log("[STRIPE-WEBHOOK] No user found for checkout customer email");
      return;
    }

    await activatePlanForUser(user.id, customer.email, session.metadata.plan_id, true);
    return;
  }

  console.log("[STRIPE-WEBHOOK] Checkout session completed with no actionable activation path");
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string | null;
  if (!customerId) {
    if (isHeirwaySubscriptionTierInvoice(invoice)) {
      throw new Error("Heirway subscription_tier invoice missing customer");
    }
    return;
  }

  const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
  if (!customer || customer.deleted || !customer.email) {
    if (isHeirwaySubscriptionTierInvoice(invoice)) {
      throw new Error("Heirway subscription_tier invoice customer missing email");
    }
    return;
  }

  const email = customer.email;
  const parentType = (invoice as any).parent?.type as string | undefined;
  if (parentType) {
    console.log(`[STRIPE-WEBHOOK] Invoice parent type: ${parentType}`);
  }

  const parentMeta = extractInvoiceSubscriptionMetadata(invoice);
  const subscriptionRef = extractInvoiceSubscriptionId(invoice);

  // Prefer metadata.user_id from Clover parent snapshot / invoice when present.
  const metadataUserId =
    parentMeta?.user_id?.trim() ||
    invoice.metadata?.user_id?.trim() ||
    null;

  let userId: string | null = metadataUserId;
  if (!userId) {
    const user = await findUserByEmail(email);
    userId = user?.id ?? null;
  }

  if (!userId) {
    if (isHeirwaySubscriptionTierInvoice(invoice) || isSubscriptionTierFlow(parentMeta)) {
      throw new Error("No user found for Heirway subscription_tier invoice");
    }
    console.log("[STRIPE-WEBHOOK] No user found for invoice customer email");
    return;
  }

  let planId = invoice.metadata?.plan_id;
  let subscriptionTierPlan: string | null = null;

  if (!planId && invoice.metadata?.package_id) {
    planId = normalizePackageId(invoice.metadata.package_id) ?? undefined;
    if (!planId) {
      if (isHeirwaySubscriptionTierInvoice(invoice)) {
        throw new Error("Unresolved package_id on Heirway subscription_tier invoice");
      }
      console.log("[STRIPE-WEBHOOK] Unresolved package_id mapping");
      return;
    }
  }

  // 1) Prefer immutable Clover parent.subscription_details.metadata
  if (!planId && isSubscriptionTierFlow(parentMeta)) {
    subscriptionTierPlan = resolveSubscriptionTierSelectedPlan(parentMeta);
    if (!subscriptionTierPlan) {
      throw new Error(
        "Subscription tier flow with unresolved subscription_id (parent metadata)",
      );
    }
    console.log(`[STRIPE-WEBHOOK] Subscription tier resolved: ${subscriptionTierPlan}`);
    planId = subscriptionTierPlan;
  }

  // 2) Retrieve Subscription when we have an ID and still need identity
  if (!planId && subscriptionRef) {
    console.log(`[STRIPE-WEBHOOK] Subscription resolved: ${subscriptionRef}`);
    const sub = await stripe.subscriptions.retrieve(subscriptionRef);

    if (isSubscriptionTierFlow(sub.metadata)) {
      subscriptionTierPlan = resolveSubscriptionTierSelectedPlan(sub.metadata);
      if (!subscriptionTierPlan) {
        throw new Error(
          "Subscription tier flow with unresolved subscription_id (subscription metadata)",
        );
      }
      console.log(`[STRIPE-WEBHOOK] Subscription tier resolved: ${subscriptionTierPlan}`);
      planId = subscriptionTierPlan;
    } else {
      planId = sub.metadata?.plan_id;

      if (!planId && sub.metadata?.package_id) {
        planId = normalizePackageId(sub.metadata.package_id) ?? undefined;
        if (!planId) {
          console.log("[STRIPE-WEBHOOK] Unresolved package_id mapping");
          return;
        }
      }

      if (!planId && sub.items?.data?.length) {
        for (const item of sub.items.data) {
          const priceId = expandStripeId((item as any).price) ??
            expandStripeId((item as any).pricing?.price_details?.price);
          if (priceId && PRICE_TO_PLAN[priceId]) {
            planId = PRICE_TO_PLAN[priceId];
            break;
          }
        }
      }
    }
  }

  // 3) Legacy PRICE_TO_PLAN via invoice line price IDs (Clover + legacy shapes)
  if (!planId) {
    for (const priceId of extractInvoiceLinePriceIds(invoice)) {
      if (PRICE_TO_PLAN[priceId]) {
        planId = PRICE_TO_PLAN[priceId];
        break;
      }
    }
  }

  if (!planId) {
    if (isHeirwaySubscriptionTierInvoice(invoice) || isSubscriptionTierFlow(parentMeta)) {
      throw new Error("Could not resolve plan for Heirway subscription_tier invoice");
    }
    console.log("[STRIPE-WEBHOOK] Could not determine plan ID from invoice");
    return;
  }

  // Subscription-tier: invoice.payment_succeeded is canonical.
  // Initial create → full activation + email/GHL; renewals preserve plan_started_at.
  if (subscriptionTierPlan) {
    if (isInitialSubscriptionInvoice(invoice.billing_reason)) {
      console.log(
        `[STRIPE-WEBHOOK] Initial subscription payment; activating tier ${subscriptionTierPlan}`,
      );
      await activatePlanForUser(userId, email, subscriptionTierPlan, true);
    } else {
      await maintainSubscriptionTierPlan(userId, subscriptionTierPlan);
    }
    return;
  }

  await activatePlanForUser(userId, email, planId, true);
}

async function handlePaymentIntentSucceeded(pi: Stripe.PaymentIntent): Promise<void> {
  // Subscription-tier purchases activate via invoice.payment_succeeded only.
  if (isSubscriptionTierFlow(pi.metadata)) {
    console.log(
      "[STRIPE-WEBHOOK] PaymentIntent is subscription_tier; deferring to invoice.payment_succeeded",
    );
    return;
  }

  const userId = pi.metadata?.user_id;
  if (!userId) {
    console.log("[STRIPE-WEBHOOK] PaymentIntent missing user_id; skipping");
    return;
  }

  let planId = pi.metadata?.plan_id;

  if (!planId && pi.metadata?.package_id) {
    planId = normalizePackageId(pi.metadata.package_id) ?? undefined;
    if (!planId) {
      console.log("[STRIPE-WEBHOOK] Unresolved package_id mapping");
      return;
    }
  }

  if (!planId) {
    console.log("[STRIPE-WEBHOOK] PaymentIntent missing activation metadata; skipping");
    return;
  }

  console.log(`[STRIPE-WEBHOOK] PaymentIntent succeeded for user ${userId}, plan ${planId}`);

  const { error } = await supabase
    .from("heirway_clients")
    .update({
      plan_status: "active",
      selected_plan: planId,
      plan_started_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to update client from PaymentIntent: ${error.message}`);
  }
}

async function processStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
      break;

    case "invoice.payment_succeeded":
      await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;

    case "customer.subscription.deleted":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;

      const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
      if (!customer || customer.deleted || !customer.email) break;

      const user = await findUserByEmail(customer.email);
      if (!user) break;

      if (sub.status === "canceled" || sub.status === "unpaid") {
        console.log(`[STRIPE-WEBHOOK] Subscription ${sub.status} for user ${user.id}`);
      }
      break;
    }

    case "payment_intent.succeeded":
      await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
      break;

    default:
      console.log(`[STRIPE-WEBHOOK] Unhandled event type: ${event.type}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let claimedEventId: string | null = null;

  try {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!webhookSecret) {
      console.error("[STRIPE-WEBHOOK] Webhook secret not configured");
      return new Response(JSON.stringify({ error: "Service unavailable" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!sig) {
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`[STRIPE-WEBHOOK] Event: ${event.type}`);

    const claimStatus = await claimStripeEvent(event.id, event.type);

    if (claimStatus === "completed") {
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (claimStatus === "in_progress") {
      return new Response(JSON.stringify({ error: "Event processing in progress" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }

    claimedEventId = event.id;

    await processStripeEvent(event);
    await completeStripeEvent(event.id);

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("[STRIPE-WEBHOOK] Error:", err);

    if (claimedEventId) {
      const failMessage = err instanceof Error ? err.message : "Webhook handler failed";
      await failStripeEvent(claimedEventId, failMessage);
    }

    return new Response(JSON.stringify({ error: "Webhook handler failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
