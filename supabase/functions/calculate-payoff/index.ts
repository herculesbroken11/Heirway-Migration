import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Payoff tiers by plan */
const PAYOFF_CONFIG: Record<string, {
  earlyMonths: number;
  tiers?: { upsellCount: number; earlyPayoff: number; standardPayoff: number }[];
  earlyPayoff?: number;
  standardPayoff?: number;
}> = {
  foundation: {
    earlyMonths: 12,
    tiers: [
      { upsellCount: 0, earlyPayoff: 10000, standardPayoff: 11940 },
      { upsellCount: 1, earlyPayoff: 15000, standardPayoff: 17880 },
      { upsellCount: 2, earlyPayoff: 20000, standardPayoff: 23820 },
    ],
  },
  business: {
    earlyMonths: 12,
    earlyPayoff: 20000,
    standardPayoff: 23940,
  },
};

const UPSELL_PRICE_IDS = new Set([
  "price_1TCkYUBc2rQGllPQTcZ8aGkv",
  "price_1TCkYrBc2rQGllPQmbP18YKu",
]);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("Not authenticated");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Find Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      return new Response(JSON.stringify({ error: "No Stripe customer found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }
    const customerId = customers.data[0].id;

    // Find active subscription
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 5,
    });

    if (subs.data.length === 0) {
      return new Response(JSON.stringify({ error: "No active subscription found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    const subscription = subs.data[0];
    const planId = subscription.metadata?.plan_id;

    if (!planId || !PAYOFF_CONFIG[planId]) {
      return new Response(JSON.stringify({ error: "Plan does not support payoff", planId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const config = PAYOFF_CONFIG[planId];

    // Count upsells on subscription
    const upsellCount = subscription.items.data.filter(
      (item) => UPSELL_PRICE_IDS.has(item.price.id)
    ).length;

    // Calculate months since start
    const startDate = new Date(subscription.start_date * 1000);
    const now = new Date();
    const monthsElapsed = Math.floor(
      (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
    );
    const isEarly = monthsElapsed < config.earlyMonths;

    // Determine payoff amount
    let totalPayoff: number;
    if (config.tiers) {
      const tier = config.tiers.find((t) => t.upsellCount >= upsellCount) 
        || config.tiers[config.tiers.length - 1];
      totalPayoff = isEarly ? tier.earlyPayoff : tier.standardPayoff;
    } else {
      totalPayoff = isEarly ? config.earlyPayoff! : config.standardPayoff!;
    }

    // Calculate total already paid via successful invoices
    const invoices = await stripe.invoices.list({
      subscription: subscription.id,
      status: "paid",
      limit: 100,
    });

    let totalPaidFromInvoices = 0;
    for (const inv of invoices.data) {
      totalPaidFromInvoices += inv.amount_paid; // in cents
    }

    // Also query extra payments (checkout sessions with type: extra_payment)
    const checkoutSessions = await stripe.checkout.sessions.list({
      customer: customerId,
      status: "complete",
      limit: 100,
    });

    let totalExtraPayments = 0;
    const extraPaymentsList: { date: string; amount: number }[] = [];
    for (const session of checkoutSessions.data) {
      if (session.metadata?.type === "extra_payment" && session.metadata?.subscription_id === subscription.id) {
        const amt = session.amount_total || 0;
        totalExtraPayments += amt;
        extraPaymentsList.push({
          date: new Date(session.created * 1000).toISOString(),
          amount: amt / 100,
        });
      }
    }

    const totalPaidDollars = (totalPaidFromInvoices + totalExtraPayments) / 100;

    // Remaining balance
    const remainingBalance = Math.max(0, totalPayoff - totalPaidDollars);

    return new Response(
      JSON.stringify({
        planId,
        subscriptionId: subscription.id,
        startDate: startDate.toISOString(),
        monthsElapsed,
        isEarly,
        earlyDeadline: config.earlyMonths,
        upsellCount,
        totalPayoff,
        totalPaid: totalPaidDollars,
        totalFromSubscription: totalPaidFromInvoices / 100,
        totalExtraPayments: totalExtraPayments / 100,
        extraPayments: extraPaymentsList,
        remainingBalance,
        monthlyPayment: subscription.items.data.reduce(
          (sum, item) => sum + (item.price.unit_amount || 0), 0
        ) / 100,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("calculate-payoff error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
