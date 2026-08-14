import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Price catalog ────────────────────────────────────────────
// LEGACY plans (grandfathered clients only)
const LEGACY_PLAN_PRICES: Record<string, string> = {
  foundation: "price_1TCkVSBc2rQGllPQ2MkMSPDs",
  business: "price_1TCkXLBc2rQGllPQWdsCL3ZF",
  wealth_builder: "price_1TCkXeBc2rQGllPQ51phA0P0",
  education: "price_1TCkXxBc2rQGllPQgHfSTSWd",
};
const LEGACY_UPSELL_PRICES: Record<string, string> = {
  legacy_insurance: "price_1TCkYUBc2rQGllPQTcZ8aGkv",
  special_care: "price_1TCkYrBc2rQGllPQmbP18YKu",
};

// NEW subscription tiers
const SUBSCRIPTION_PRICES: Record<string, string> = {
  essentials: "price_1TtXK8Bc2rQGllPQuEXthEfW",
  steward: "price_1TtXKhBc2rQGllPQCLc9zQP2",
  gold: "price_1TtXL5Bc2rQGllPQB9oORG63",
};

// NEW trust packages
type PackagePrices = {
  cash: string;
  deposit: string;
  sixMonth: string;
  twelveMonth: string;
};
const PACKAGE_PRICES: Record<string, PackagePrices> = {
  legacy: {
    cash: "price_1TtXLUBc2rQGllPQuKIi9atL",
    deposit: "price_1TtXUbBc2rQGllPQ75kT9XII",
    sixMonth: "price_1TtXLnBc2rQGllPQrUYPjhZz",
    twelveMonth: "price_1TtXM4Bc2rQGllPQgyDvS633",
  },
  foundation_package: {
    cash: "price_1TtXQ7Bc2rQGllPQ1DmVKbM7",
    deposit: "price_1TtXUzBc2rQGllPQCJ0xjzEz",
    sixMonth: "price_1TtXQuBc2rQGllPQOe3FQoZ6",
    twelveMonth: "price_1TtXRFBc2rQGllPQtlaultb9",
  },
  business_package: {
    cash: "price_1TtXRtBc2rQGllPQn8OnnrZo",
    deposit: "price_1TtXWWBc2rQGllPQMJchhLYe",
    sixMonth: "price_1TtXSBBc2rQGllPQakG1A7Tc",
    twelveMonth: "price_1TtXSmBc2rQGllPQDBFajt0g",
  },
};

// NEW checkout add-ons (one-time)
const ADDON_PRICES = {
  additional_trust: "price_1TtXTcBc2rQGllPQ65jc3t7f",
  creator_matching: "price_1TtXU9Bc2rQGllPQVliq99RN",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    const body = await req.json();
    const {
      // NEW payload shape
      subscriptionId,
      packageId,
      paymentPlan, // 'cash' | 'sixMonth' | 'twelveMonth'
      additionalTrusts = 0,
      creatorMatchingTrusts = 0,
      // LEGACY payload shape (still accepted)
      planId,
      addedUpsells = [],
      // Shared
      promoCode,
    } = body ?? {};

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // ─── Customer ─────────────────────────────────────────────
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
    }

    // ─── Promo code ───────────────────────────────────────────
    let couponId: string | undefined;
    if (promoCode) {
      try {
        const promoCodes = await stripe.promotionCodes.list({
          code: promoCode,
          active: true,
          limit: 1,
        });
        if (promoCodes.data.length > 0) {
          couponId = promoCodes.data[0].coupon.id;
        } else {
          return new Response(
            JSON.stringify({ error: "Invalid or expired promo code" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
          );
        }
      } catch (e) {
        console.error("Promo code validation error:", e);
      }
    }

    // Cancel any leftover incomplete subscriptions
    const cleanupIncompletes = async () => {
      const existingSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: "incomplete",
        limit: 10,
      });
      for (const sub of existingSubs.data) {
        try { await stripe.subscriptions.cancel(sub.id); } catch {}
      }
    };

    // ─── FLOW 1: New subscription tier (Essentials/Steward/Gold) ────
    if (subscriptionId && SUBSCRIPTION_PRICES[subscriptionId]) {
      await cleanupIncompletes();

      const subParams: any = {
        customer: customerId,
        items: [{ price: SUBSCRIPTION_PRICES[subscriptionId] }],
        payment_behavior: "default_incomplete",
        payment_settings: { save_default_payment_method: "on_subscription" },
        billing_mode: { type: "flexible" },
        expand: ["latest_invoice.confirmation_secret"],
        metadata: {
          user_id: user.id,
          subscription_id: subscriptionId,
          flow: "subscription_tier",
        },
      };
      if (couponId) subParams.coupon = couponId;

      const subscription = await stripe.subscriptions.create(subParams);
      const clientSecret = await extractClientSecret(stripe, subscription);
      if (!clientSecret) throw new Error("Could not obtain client_secret for subscription");

      return jsonResponse({
        clientSecret,
        subscriptionId: subscription.id,
        type: "subscription",
      });
    }

    // ─── FLOW 2: Trust package purchase ────────────────────────
    if (packageId && PACKAGE_PRICES[packageId]) {
      const prices = PACKAGE_PRICES[packageId];
      const addonInvoiceItems = buildAddonInvoiceItems(additionalTrusts, creatorMatchingTrusts);

      // ── 2a: Cash — one-time PaymentIntent
      if (paymentPlan === "cash") {
        // Use invoice-based flow so we can attach package + add-on line items cleanly
        const invoice = await stripe.invoices.create({
          customer: customerId,
          collection_method: "send_invoice",
          days_until_due: 1,
          auto_advance: false,
          metadata: {
            user_id: user.id,
            package_id: packageId,
            payment_plan: "cash",
            additional_trusts: String(additionalTrusts),
            creator_matching: String(creatorMatchingTrusts),
          },
        });

        // Add package cash line
        await stripe.invoiceItems.create({
          customer: customerId,
          invoice: invoice.id,
          price: prices.cash,
        });
        // Add add-ons
        for (const item of addonInvoiceItems) {
          await stripe.invoiceItems.create({
            customer: customerId,
            invoice: invoice.id,
            ...item,
          });
        }

        // Instead of the invoice flow (which emails), fall back to PaymentIntent for the total
        const finalized = await stripe.invoices.retrieve(invoice.id!);
        const amount = finalized.amount_due;

        // Void the invoice — we only used it to compute totals; charge via PaymentIntent
        await stripe.invoices.voidInvoice(invoice.id!);

        const paymentIntent = await stripe.paymentIntents.create({
          amount,
          currency: "usd",
          customer: customerId,
          automatic_payment_methods: { enabled: true },
          metadata: {
            user_id: user.id,
            package_id: packageId,
            payment_plan: "cash",
            additional_trusts: String(additionalTrusts),
            creator_matching: String(creatorMatchingTrusts),
          },
        });

        return jsonResponse({
          clientSecret: paymentIntent.client_secret,
          type: "payment",
        });
      }

      // ── 2b/2c: Installment plans (6mo or 12mo)
      if (paymentPlan === "sixMonth" || paymentPlan === "twelveMonth") {
        await cleanupIncompletes();

        const monthlyPrice = paymentPlan === "sixMonth" ? prices.sixMonth : prices.twelveMonth;
        const totalCycles = paymentPlan === "sixMonth" ? 6 : 12;
        // Subscription bills the monthly amount now (cycle 1 = today's due) then N-1 more months.
        // Add deposit + add-ons as one-time invoice items applied to the first invoice.
        const addInvoiceItems: any[] = [
          { price: prices.deposit },
          ...addonInvoiceItems,
        ];

        // We want to first invoice = deposit + addons + first monthly.
        // With flexible billing mode, monthly price on subscription is charged on cycle boundary;
        // add_invoice_items attaches the one-time deposit + addons to the first invoice.
        const cancelAt = Math.floor(Date.now() / 1000) + secondsPerMonth() * totalCycles;

        const subParams: any = {
          customer: customerId,
          items: [{ price: monthlyPrice }],
          add_invoice_items: addInvoiceItems,
          cancel_at: cancelAt,
          payment_behavior: "default_incomplete",
          payment_settings: { save_default_payment_method: "on_subscription" },
          billing_mode: { type: "flexible" },
          expand: ["latest_invoice.confirmation_secret"],
          metadata: {
            user_id: user.id,
            package_id: packageId,
            payment_plan: paymentPlan,
            additional_trusts: String(additionalTrusts),
            creator_matching: String(creatorMatchingTrusts),
            term_months: String(totalCycles),
          },
        };
        if (couponId) subParams.coupon = couponId;

        const subscription = await stripe.subscriptions.create(subParams);
        const clientSecret = await extractClientSecret(stripe, subscription);
        if (!clientSecret) {
          throw new Error("Could not obtain client_secret for installment plan");
        }

        return jsonResponse({
          clientSecret,
          subscriptionId: subscription.id,
          type: "subscription",
        });
      }

      return jsonResponse({ error: `Unknown payment plan: ${paymentPlan}` }, 400);
    }

    // ─── FLOW 3: LEGACY (grandfathered) planId flow ───────────
    if (planId) {
      const priceId = LEGACY_PLAN_PRICES[planId];
      if (!priceId) throw new Error(`Unknown plan: ${planId}`);
      const isOneTime = planId === "wealth_builder";

      if (isOneTime) {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: 249900,
          currency: "usd",
          customer: customerId,
          metadata: { user_id: user.id, plan_id: planId },
          automatic_payment_methods: { enabled: true },
        });
        return jsonResponse({ clientSecret: paymentIntent.client_secret, type: "payment" });
      }

      await cleanupIncompletes();

      const items: any[] = [{ price: priceId }];
      for (const upsellId of addedUpsells) {
        const upsellPrice = LEGACY_UPSELL_PRICES[upsellId];
        if (upsellPrice) items.push({ price: upsellPrice });
      }

      const subParams: any = {
        customer: customerId,
        items,
        payment_behavior: "default_incomplete",
        payment_settings: { save_default_payment_method: "on_subscription" },
        billing_mode: { type: "flexible" },
        expand: ["latest_invoice.confirmation_secret"],
        metadata: {
          user_id: user.id,
          plan_id: planId,
          upsells: JSON.stringify(addedUpsells),
          term_months: "60",
        },
      };
      if (couponId) subParams.coupon = couponId;

      const subscription = await stripe.subscriptions.create(subParams);
      const clientSecret = await extractClientSecret(stripe, subscription);
      if (!clientSecret) throw new Error("Could not obtain client_secret for legacy plan");

      return jsonResponse({
        clientSecret,
        subscriptionId: subscription.id,
        type: "subscription",
      });
    }

    return jsonResponse({ error: "Missing subscriptionId, packageId, or planId" }, 400);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("create-subscription error:", msg);
    return jsonResponse({ error: msg }, 500);
  }
});

// ─── Helpers ───────────────────────────────────────────────────
function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

function secondsPerMonth() {
  // Approximate; Stripe schedules monthly cycles from creation date regardless.
  return 60 * 60 * 24 * 30;
}

function buildAddonInvoiceItems(additionalTrusts: number, creatorMatching: number) {
  const items: any[] = [];
  if (additionalTrusts > 0) {
    items.push({ price: ADDON_PRICES.additional_trust, quantity: additionalTrusts });
  }
  if (creatorMatching > 0) {
    items.push({ price: ADDON_PRICES.creator_matching, quantity: creatorMatching });
  }
  return items;
}

async function extractClientSecret(stripe: Stripe, subscription: Stripe.Subscription): Promise<string | null> {
  const latestInvoice = subscription.latest_invoice as any;
  if (!latestInvoice) return null;

  if (latestInvoice.confirmation_secret?.client_secret) {
    return latestInvoice.confirmation_secret.client_secret;
  }
  if (latestInvoice.payment_intent) {
    const pi = latestInvoice.payment_intent;
    if (typeof pi === "object" && pi.client_secret) return pi.client_secret;
    if (typeof pi === "string") {
      const fetchedPi = await stripe.paymentIntents.retrieve(pi);
      return fetchedPi.client_secret;
    }
  }
  const invoiceId = typeof latestInvoice === "string" ? latestInvoice : latestInvoice.id;
  if (invoiceId) {
    const fetchedInvoice = (await stripe.invoices.retrieve(invoiceId, {
      expand: ["payment_intent", "confirmation_secret"],
    })) as any;
    if (fetchedInvoice.confirmation_secret?.client_secret) {
      return fetchedInvoice.confirmation_secret.client_secret;
    }
    if (fetchedInvoice.payment_intent?.client_secret) {
      return fetchedInvoice.payment_intent.client_secret;
    }
  }
  const setupIntent = subscription.pending_setup_intent as any;
  if (setupIntent) {
    if (typeof setupIntent === "object" && setupIntent.client_secret) return setupIntent.client_secret;
    if (typeof setupIntent === "string") {
      const fetchedSi = await stripe.setupIntents.retrieve(setupIntent);
      return fetchedSi.client_secret;
    }
  }
  return null;
}
