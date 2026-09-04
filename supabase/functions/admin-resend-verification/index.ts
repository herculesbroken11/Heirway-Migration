import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function reply(payload: Record<string, unknown>, ok = true) {
  return new Response(JSON.stringify({ ok, ...payload }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return reply({ error: "Missing authorization" }, false);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: isAdmin, error: roleError } = await callerClient.rpc("is_admin");
    if (roleError || !isAdmin) return reply({ error: "Unauthorized: admin only" }, false);

    const { email } = await req.json();
    if (!email) return reply({ error: "Email is required" }, false);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const siteUrlRaw = Deno.env.get("SITE_URL")?.trim();
    if (!siteUrlRaw) return reply({ error: "SITE_URL is not configured" }, false);
    if (/localhost|127\.0\.0\.1/i.test(siteUrlRaw)) {
      return reply({ error: "SITE_URL must not be a localhost URL in this environment" }, false);
    }
    const siteUrl = siteUrlRaw.replace(/\/+$/, "");

    // Find user
    const { data: listData, error: listError } = await adminClient.auth.admin.listUsers();
    if (listError) return reply({ error: listError.message }, false);
    const user = listData.users.find((u: any) => (u.email || "").toLowerCase() === email.toLowerCase());

    if (!user) {
      // No auth user yet — send invite
      const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${siteUrl}/set-password`,
      });
      if (inviteError) return reply({ error: inviteError.message }, false);
      return reply({ success: true, action: "invited" });
    }

    if (user.email_confirmed_at) {
      // Already verified — send recovery so they can (re)set password
      const { error } = await adminClient.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo: `${siteUrl}/set-password` },
      });
      if (error) return reply({ error: error.message }, false);
      return reply({ success: true, action: "recovery_sent", note: "User already verified; sent password reset link instead." });
    }

    // Unverified — resend signup verification
    const { error: resendError } = await adminClient.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${siteUrl}/set-password` },
    });
    if (resendError) {
      // Fallback: invite again
      const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${siteUrl}/set-password`,
      });
      if (inviteError) return reply({ error: inviteError.message }, false);
      return reply({ success: true, action: "invited" });
    }
    return reply({ success: true, action: "verification_resent" });
  } catch (err) {
    return reply({ error: (err as Error).message || "Unknown error" }, false);
  }
});
