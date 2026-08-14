import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the requesting user
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Delete related data in order (foreign key safe)
    const userId = user.id;

    // Get client id
    const { data: clientData } = await adminClient
      .from("heirway_clients")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (clientData) {
      const clientId = clientData.id;
      // Delete client-related records
      await adminClient.from("heirway_admin_requests").delete().eq("client_id", clientId);
      await adminClient.from("heirway_assets").delete().eq("client_id", clientId);
      await adminClient.from("heirway_documents").delete().eq("client_id", clientId);
      await adminClient.from("heirway_intake").delete().eq("client_id", clientId);
      await adminClient.from("heirway_intake_questions").delete().eq("client_id", clientId);
      await adminClient.from("heirway_meeting_minutes").delete().eq("client_id", clientId);
      await adminClient.from("heirway_referrals").delete().eq("referrer_client_id", clientId);
      
      // Trust-related cleanup
      const { data: trusts } = await adminClient
        .from("heirway_trust_progress")
        .select("id")
        .eq("client_id", clientId);
      
      if (trusts && trusts.length > 0) {
        const trustIds = trusts.map((t) => t.id);
        await adminClient.from("trust_members").delete().in("trust_id", trustIds);
        await adminClient.from("heirway_generated_documents").delete().eq("client_id", clientId);
        await adminClient.from("heirway_trust_progress").delete().eq("client_id", clientId);
      }

      await adminClient.from("heirway_clients").delete().eq("id", clientId);
    }

    // Delete user-level records
    await adminClient.from("heirway_learning_progress").delete().eq("user_id", userId);
    await adminClient.from("heirway_notification_reads").delete().eq("user_id", userId);
    await adminClient.from("user_roles").delete().eq("user_id", userId);
    await adminClient.from("profiles").delete().eq("user_id", userId);

    // Finally delete the auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("Error deleting auth user:", deleteError);
      return new Response(JSON.stringify({ error: "Failed to delete account" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Delete account error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
