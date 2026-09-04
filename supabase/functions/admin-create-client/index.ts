import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Always return HTTP 200 so the client can read the body and surface
// a useful error to the user (otherwise supabase-js swallows the body).
function reply(payload: Record<string, unknown>, ok = true) {
  return new Response(JSON.stringify({ ok, ...payload }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return reply({ error: "Missing authorization" }, false);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: roleData, error: roleError } = await callerClient.rpc("is_admin");
    if (roleError || !roleData) {
      return reply({ error: "Unauthorized: admin only" }, false);
    }

    const body = await req.json();
    const { email, full_name, phone, state, selected_plan, is_married, has_children, owns_real_estate, over_1m_assets, business_ownership, employment_type, password, address_street, address_city, address_state, address_zip } = body;

    if (!email || !state) {
      return reply({ error: "Email and state are required" }, false);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    let userId: string;
    let isNewUser = false;

    // Determine the app URL for redirects (Fresh production: set SITE_URL=https://heirway.vercel.app)
    const siteUrlRaw = Deno.env.get("SITE_URL")?.trim();
    if (!siteUrlRaw) {
      return reply({ error: "SITE_URL is not configured" }, false);
    }
    if (/localhost|127\.0\.0\.1/i.test(siteUrlRaw)) {
      return reply({ error: "SITE_URL must not be a localhost URL in this environment" }, false);
    }
    const siteUrl = siteUrlRaw.replace(/\/+$/, "");

    // Try to invite user by email — this sends them a setup email automatically
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { full_name },
      redirectTo: `${siteUrl}/set-password`,
    });

    if (inviteError) {
      const msg = inviteError.message || "";
      if (msg.includes("already been registered")) {
        // Find existing user
        const { data: listData, error: listError } = await adminClient.auth.admin.listUsers();
        if (listError) {
          return reply({ error: listError.message }, false);
        }
        const existingUser = listData.users.find((u: any) => u.email === email);
        if (!existingUser) {
          return reply({ error: "User exists but could not be found" }, false);
        }
        userId = existingUser.id;

        // Check if client record already exists
        const { data: existingClient } = await adminClient
          .from("heirway_clients")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        if (existingClient) {
          return reply({ error: "A client record already exists for this email" }, false);
        }

        // Send password recovery email so existing user gets notified
        await adminClient.auth.admin.generateLink({
          type: "recovery",
          email,
          options: {
            redirectTo: `${siteUrl}/set-password`,
          },
        });
      } else if (msg.toLowerCase().includes("rate limit")) {
        return reply({
          error: "Email rate limit reached. Please wait a few minutes before adding another client, or have the user sign up directly.",
        }, false);
      } else {
        return reply({ error: msg }, false);
      }
    } else {
      userId = inviteData.user.id;
      isNewUser = true;
    }

    // Determine recommended plan
    let recommended = "education";
    if (over_1m_assets || business_ownership !== "none") {
      recommended = "wealth_builder";
    } else if (owns_real_estate || has_children) {
      recommended = "foundation";
    }

    // Create heirway_clients record
    const { data: clientData, error: clientError } = await adminClient
      .from("heirway_clients")
      .insert({
        user_id: userId,
        full_name: full_name || null,
        email,
        phone: phone || null,
        state,
        selected_plan: selected_plan === "free" ? null : (selected_plan || null),
        plan_status: selected_plan && selected_plan !== "free" ? "active" : "recommended",
        recommended_plan: recommended,
        is_married: is_married || false,
        has_children: has_children || false,
        owns_real_estate: owns_real_estate || false,
        over_1m_assets: over_1m_assets || false,
        business_ownership: business_ownership || "none",
        employment_type: employment_type || "w2",
        address_street: address_street || null,
        address_city: address_city || null,
        address_state: address_state || null,
        address_zip: address_zip || null,
      })
      .select()
      .single();

    if (clientError) {
      return reply({ error: clientError.message }, false);
    }

    // Send welcome email via transactional email
    try {
      await adminClient.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'welcome',
          recipientEmail: email,
          idempotencyKey: `admin-welcome-${userId}`,
          templateData: { fullName: full_name || '' },
        },
      });
    } catch (e) {
      console.error('Welcome email failed (non-blocking):', e);
    }

    return reply({
      success: true,
      client: clientData,
      user_id: userId,
      invitation_sent: isNewUser,
      recovery_sent: !isNewUser,
    });
  } catch (err) {
    return reply({ error: (err as Error).message || "Unknown error" }, false);
  }
});
