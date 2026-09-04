import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is super_admin
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: isSuperAdmin, error: roleError } = await callerClient.rpc("is_super_admin");
    
    // Fallback: also allow regular admins for listing
    const { data: isAdmin } = await callerClient.rpc("is_admin");
    
    const body = await req.json();
    const { action } = body;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // LIST: available to all admins
    if (action === "list") {
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get all user_roles
      const { data: roles, error: rolesError } = await adminClient
        .from("user_roles")
        .select("*")
        .order("created_at", { ascending: true });
      
      if (rolesError) {
        return new Response(JSON.stringify({ error: rolesError.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get user details for each role
      const { data: listData, error: listError } = await adminClient.auth.admin.listUsers();
      if (listError) {
        return new Response(JSON.stringify({ error: listError.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userMap = new Map(listData.users.map((u: any) => [u.id, u]));
      const adminUsers = (roles || []).map((r: any) => {
        const user = userMap.get(r.user_id);
        return {
          id: r.id,
          user_id: r.user_id,
          role: r.role,
          email: user?.email || "Unknown",
          full_name: user?.user_metadata?.full_name || null,
          created_at: r.created_at,
          last_sign_in: user?.last_sign_in_at || null,
        };
      });

      return new Response(JSON.stringify({ users: adminUsers }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // All other actions require super_admin
    if (!isSuperAdmin) {
      return new Response(JSON.stringify({ error: "Unauthorized: super_admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "set_role") {
      const { user_id, role } = body;
      if (!user_id || !role) {
        return new Response(JSON.stringify({ error: "user_id and role required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Upsert role
      const { error: deleteError } = await adminClient
        .from("user_roles")
        .delete()
        .eq("user_id", user_id);
      
      const { error: insertError } = await adminClient
        .from("user_roles")
        .insert({ user_id, role });

      if (insertError) {
        return new Response(JSON.stringify({ error: insertError.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "remove_user") {
      const { user_id } = body;
      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Remove role
      await adminClient.from("user_roles").delete().eq("user_id", user_id);

      // Delete auth user
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(user_id);
      if (deleteError) {
        return new Response(JSON.stringify({ error: deleteError.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "add_admin") {
      const { email, role, full_name } = body;
      if (!email || !role) {
        return new Response(JSON.stringify({ error: "email and role required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const normalizedFullName = typeof full_name === "string" ? full_name.trim() : "";

      // Try to invite by email first
      let userId: string;
      let existingUser = false;
      let emailSent = false;

      const origin = req.headers.get("origin") || "https://myheirway.com";
      const { data: authData, error: authError } = await adminClient.auth.admin.inviteUserByEmail(normalizedEmail, {
        data: { full_name: normalizedFullName || null },
        redirectTo: `${origin}/reset-password`,
      });

      if (authError) {
        // If user already exists, look them up and assign role + resend recovery email
        if (authError.message?.includes("already been registered")) {
          existingUser = true;
          const { data: listData } = await adminClient.auth.admin.listUsers();
          const foundUser = listData?.users?.find((u: any) => String(u.email || "").toLowerCase() === normalizedEmail);
          if (!foundUser) {
            return new Response(JSON.stringify({ error: "User exists but could not be found" }), {
              status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          userId = foundUser.id;

          // Ensure name metadata is updated (prevents stale names like "kdogg")
          const mergedMetadata = {
            ...(foundUser.user_metadata || {}),
            full_name: normalizedFullName || foundUser.user_metadata?.full_name || null,
          };
          await adminClient.auth.admin.updateUserById(userId, {
            user_metadata: mergedMetadata,
          });

          // Re-send an auth email so existing users still receive a message
          const origin = req.headers.get("origin") || "https://myheirway.com";
          const { error: resetError } = await adminClient.auth.resetPasswordForEmail(normalizedEmail, {
            redirectTo: `${origin}/reset-password`,
          });
          emailSent = !resetError;
        } else {
          return new Response(JSON.stringify({ error: authError.message }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        userId = authData.user.id;
        emailSent = true;

        // Double-ensure metadata is set correctly
        if (normalizedFullName) {
          await adminClient.auth.admin.updateUserById(userId, {
            user_metadata: { ...(authData.user.user_metadata || {}), full_name: normalizedFullName },
          });
        }
      }

      // Assign role (upsert: delete old then insert)
      await adminClient.from("user_roles").delete().eq("user_id", userId);
      const { error: roleInsertError } = await adminClient
        .from("user_roles")
        .insert({ user_id: userId, role });

      if (roleInsertError) {
        return new Response(JSON.stringify({ error: roleInsertError.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        user_id: userId,
        existing_user: existingUser,
        email_sent: emailSent,
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
