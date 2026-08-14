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
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    let event: Stripe.Event;

    if (webhookSecret && sig) {
      try {
        event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
      } catch (err) {
        console.error("Webhook signature verification failed:", err);
        return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
      }
    } else {
      // Fallback: parse without signature verification (dev mode)
      event = JSON.parse(body);
      console.warn("No webhook secret configured, skipping signature verification");
    }

    console.log(`[STRIPE-WEBHOOK] Event: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        
        // Handle payoff checkout
        if (session.metadata?.type === "payoff") {
          const userId = session.metadata.user_id;
          const subscriptionId = session.metadata.subscription_id;
          console.log(`[STRIPE-WEBHOOK] Payoff completed for user ${userId}, canceling sub ${subscriptionId}`);
          
          try {
            await stripe.subscriptions.cancel(subscriptionId);
          } catch (e) {
            console.error("[STRIPE-WEBHOOK] Error canceling subscription after payoff:", e);
          }
          
          await supabase
            .from("heirway_clients")
            .update({ plan_status: "paid_off" })
            .eq("user_id", userId);
          
          console.log(`[STRIPE-WEBHOOK] Plan marked as paid_off for user ${userId}`);
          break;
        }
        
        // Fall through to regular checkout handling
      }
      case "invoice.payment_succeeded": {
        const obj = event.data.object as any;
        const customerId = obj.customer;
        
        if (!customerId) break;
        
        // Get customer email
        const customer = await stripe.customers.retrieve(customerId as string) as Stripe.Customer;
        if (!customer || customer.deleted) break;

        const email = customer.email;
        if (!email) break;

        // Find the user by email
        const { data: users } = await supabase.auth.admin.listUsers();
        const user = users?.users?.find(u => u.email === email);
        if (!user) {
          console.log(`[STRIPE-WEBHOOK] No user found for email: ${email}`);
          break;
        }

        // Determine plan from subscription items or metadata
        let planId = obj.metadata?.plan_id;
        
        if (!planId && event.type === "invoice.payment_succeeded") {
          const subscriptionId = obj.subscription;
          if (subscriptionId) {
            const sub = await stripe.subscriptions.retrieve(subscriptionId as string);
            planId = sub.metadata?.plan_id;
            
            if (!planId && sub.items.data.length > 0) {
              const priceId = sub.items.data[0].price.id;
              planId = PRICE_TO_PLAN[priceId];
            }
          }
        }

        if (!planId) {
          console.log("[STRIPE-WEBHOOK] Could not determine plan ID");
          break;
        }

        console.log(`[STRIPE-WEBHOOK] Activating plan ${planId} for user ${user.id}`);

        // Update client record
        const { error } = await supabase
          .from("heirway_clients")
          .update({
            plan_status: "active",
            selected_plan: planId,
            plan_started_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);

        if (error) {
          console.error("[STRIPE-WEBHOOK] Error updating client:", error);
        } else {
          console.log(`[STRIPE-WEBHOOK] Successfully activated ${planId} for user ${user.id}`);
          // Send payment confirmation email
          try {
            const { data: clientData } = await supabase
              .from("heirway_clients")
              .select("full_name, phone")
              .eq("user_id", user.id)
              .maybeSingle();
            
            await supabase.functions.invoke("send-transactional-email", {
              body: {
                template: "payment_confirmation",
                to: email,
                props: {
                  fullName: clientData?.full_name || "",
                  planName: PLAN_LABELS[planId] || planId,
                },
              },
            });

            // Sync paid customer to Go High Level
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
            }).catch(err => console.error("[STRIPE-WEBHOOK] GHL sync error:", err));
          } catch (emailErr) {
            console.error("[STRIPE-WEBHOOK] Payment email error:", emailErr);
          }
        }
        break;
      }

      case "customer.subscription.deleted":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        if (!customer || customer.deleted || !customer.email) break;

        const { data: users } = await supabase.auth.admin.listUsers();
        const user = users?.users?.find(u => u.email === customer.email);
        if (!user) break;

        if (sub.status === "canceled" || sub.status === "unpaid") {
          console.log(`[STRIPE-WEBHOOK] Subscription ${sub.status} for user ${user.id}`);
          // Don't remove access immediately - just log for now
          // Admin can handle downgrades manually
        }
        break;
      }

      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const userId = pi.metadata?.user_id;
        const planId = pi.metadata?.plan_id;

        if (userId && planId) {
          console.log(`[STRIPE-WEBHOOK] PaymentIntent succeeded for user ${userId}, plan ${planId}`);
          await supabase
            .from("heirway_clients")
            .update({
              plan_status: "active",
              selected_plan: planId,
              plan_started_at: new Date().toISOString(),
            })
            .eq("user_id", userId);
        }
        break;
      }

      default:
        console.log(`[STRIPE-WEBHOOK] Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("[STRIPE-WEBHOOK] Error:", err);
    return new Response(JSON.stringify({ error: "Webhook handler failed" }), {
      status: 500,
    });
  }
});
