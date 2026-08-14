import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    if (!user?.email) throw new Error("User not authenticated or email not available");

    const { planId, addedUpsells = [], payAnnually = false } = await req.json();

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Price mapping
    const PLAN_PRICES: Record<string, string> = {
      foundation: "price_1TCkVSBc2rQGllPQ2MkMSPDs",
      business: "price_1TCkXLBc2rQGllPQWdsCL3ZF",
      wealth_builder: "price_1TCkXeBc2rQGllPQ51phA0P0",
      education: "price_1TCkXxBc2rQGllPQgHfSTSWd",
    };

    const UPSELL_PRICES: Record<string, string> = {
      legacy_insurance: "price_1TCkYUBc2rQGllPQTcZ8aGkv",
      special_care: "price_1TCkYrBc2rQGllPQmbP18YKu",
    };

    const priceId = PLAN_PRICES[planId];
    if (!priceId) throw new Error(`Unknown plan: ${planId}`);

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Build line items
    const isOneTime = planId === "wealth_builder";
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      { price: priceId, quantity: 1 },
    ];

    // Add upsell line items (only for subscription plans)
    if (!isOneTime) {
      for (const upsellId of addedUpsells) {
        const upsellPrice = UPSELL_PRICES[upsellId];
        if (upsellPrice) {
          line_items.push({ price: upsellPrice, quantity: 1 });
        }
      }
    }

    // Store plan metadata on the subscription
    const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData | undefined =
      !isOneTime
        ? {
            metadata: {
              plan_id: planId,
              upsells: JSON.stringify(addedUpsells),
              pay_annually: String(payAnnually),
              term_months: "60",
            },
          }
        : undefined;

    const origin = req.headers.get("origin") || "https://trustreadiness.lovable.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items,
      mode: isOneTime ? "payment" : "subscription",
      allow_promotion_codes: true,
      success_url: `${origin}/heirway/dashboard?checkout=success`,
      cancel_url: `${origin}/heirway/checkout?canceled=true`,
      subscription_data: subscriptionData,
      metadata: {
        user_id: user.id,
        plan_id: planId,
        upsells: JSON.stringify(addedUpsells),
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("create-checkout error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
