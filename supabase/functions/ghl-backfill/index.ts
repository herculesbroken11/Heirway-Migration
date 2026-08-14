// One-shot backfill of existing prospects, contact_messages, and paid clients to GHL.
// Admin-only. Invoke via supabase.functions.invoke('ghl-backfill').

import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function callSync(payload: unknown) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/ghl-sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVICE_ROLE}`,
    },
    body: JSON.stringify(payload),
  });
  return res.ok;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Verify caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .in("role", ["admin", "super_admin"])
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = { prospects: 0, contact_messages: 0, paid_customers: 0, failed: 0 };

    // 1. Prospects
    const { data: prospects } = await admin.from("prospects").select("*");
    for (const p of prospects || []) {
      const ok = await callSync({ source: "prospect", record: p });
      ok ? results.prospects++ : results.failed++;
      await new Promise((r) => setTimeout(r, 150));
    }

    // 2. Contact messages
    const { data: messages } = await admin.from("contact_messages").select("*");
    for (const m of messages || []) {
      const ok = await callSync({ source: "contact_message", record: m });
      ok ? results.contact_messages++ : results.failed++;
      await new Promise((r) => setTimeout(r, 150));
    }

    // 3. Paid clients (active or paid_off)
    const { data: clients } = await admin
      .from("heirway_clients")
      .select("user_id, full_name, email, phone, selected_plan, plan_started_at, plan_status")
      .in("plan_status", ["active", "paid_off"]);

    for (const c of clients || []) {
      let email = c.email;
      if (!email && c.user_id) {
        const { data: u } = await admin.auth.admin.getUserById(c.user_id);
        email = u?.user?.email || null;
      }
      if (!email) {
        results.failed++;
        continue;
      }
      const ok = await callSync({
        source: "paid_customer",
        record: {
          full_name: c.full_name || "",
          email,
          phone: c.phone || null,
          plan_id: c.selected_plan || "unknown",
          plan_started_at: c.plan_started_at || new Date().toISOString(),
        },
      });
      ok ? results.paid_customers++ : results.failed++;
      await new Promise((r) => setTimeout(r, 150));
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ghl-backfill error", err);
    return new Response(JSON.stringify({ error: String((err as Error).message || err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
