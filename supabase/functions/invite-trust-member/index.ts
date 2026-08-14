import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AssignmentInput {
  trust_id: string;
  power_level?: 'full' | 'limited' | 'none';
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authError } = await callerClient.auth.getUser();
    if (authError || !caller) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const {
      client_id,
      email,
      name,
      member_type,
      assignments, // [{ trust_id, power_level }]
    } = body as {
      client_id: string;
      email: string;
      name?: string;
      member_type: 'trustee_manager' | 'trustee' | 'beneficiary';
      assignments: AssignmentInput[];
    };

    if (!client_id || !email || !member_type || !Array.isArray(assignments) || assignments.length === 0) {
      return json({ error: "Missing required fields: client_id, email, member_type, assignments[]" }, 400);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller owns this client record or is admin
    const { data: callerRole } = await callerClient.rpc("is_admin");
    const { data: clientRecord } = await adminClient
      .from("heirway_clients")
      .select("id, user_id")
      .eq("id", client_id)
      .single();

    if (!clientRecord) return json({ error: "Client not found" }, 404);

    if (clientRecord.user_id !== caller.id && !callerRole) {
      return json({ error: "Only the client owner or admin can invite members" }, 403);
    }

    // Check for existing member by email under this client
    const { data: existing } = await adminClient
      .from("trust_members")
      .select("id, invite_status, expires_at, user_id")
      .eq("client_id", client_id)
      .eq("invite_email", email)
      .maybeSingle();

    let memberId: string;

    if (existing) {
      const isExpired = existing.expires_at && new Date(existing.expires_at) < new Date();
      if (existing.invite_status === 'pending' && isExpired) {
        await adminClient.from("trust_members").delete().eq("id", existing.id);
      } else {
        // Member already exists — just update assignments below
        memberId = existing.id;
        await syncAssignments(adminClient, memberId, member_type, client_id, assignments);
        return json({ success: true, member_id: memberId, updated: true });
      }
    }

    // Use first assignment's trust_id as legacy trust_id (back-compat)
    const inviteToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data: member, error: insertError } = await adminClient
      .from("trust_members")
      .insert({
        trust_id: assignments[0].trust_id, // legacy
        client_id,
        invite_email: email,
        member_type,
        power_level: member_type === 'beneficiary' ? 'none' : (assignments[0].power_level || 'limited'),
        invite_status: "pending",
        invite_token: inviteToken,
        invited_by: caller.id,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (insertError || !member) return json({ error: insertError?.message || "Insert failed" }, 400);
    memberId = member.id;

    // Create / update assignments rows
    await syncAssignments(adminClient, memberId, member_type, client_id, assignments);

    // Create auth user if needed
    let tempPassword: string | null = null;
    const pass = crypto.randomUUID().slice(0, 12) + "Aa1!";

    const { data: authData, error: createUserError } = await adminClient.auth.admin.createUser({
      email,
      password: pass,
      email_confirm: true,
      user_metadata: { full_name: name || email, invited_role: member_type },
    });

    if (createUserError) {
      if (createUserError.message.includes("already been registered")) {
        const { data: listData } = await adminClient.auth.admin.listUsers();
        const existingUser = listData?.users?.find((u: any) => u.email === email);
        if (existingUser) {
          await adminClient.from("trust_members").update({ user_id: existingUser.id }).eq("id", memberId);
        }
      } else {
        console.error("Error creating user:", createUserError.message);
      }
    } else if (authData?.user) {
      tempPassword = pass;
      await adminClient.from("trust_members").update({ user_id: authData.user.id }).eq("id", memberId);
    }

    // Re-fetch member to get computed is_billable
    const { data: finalMember } = await adminClient
      .from("trust_members")
      .select("*")
      .eq("id", memberId)
      .single();

    return json({
      success: true,
      member: finalMember,
      temp_password: tempPassword,
      invite_token: inviteToken,
    });

  } catch (err: any) {
    return json({ error: err.message || String(err) }, 500);
  }
});

async function syncAssignments(
  adminClient: any,
  memberId: string,
  memberType: string,
  clientId: string,
  assignments: AssignmentInput[],
) {
  let finalAssignments = assignments;

  // Beneficiaries: always assigned to ALL trusts of the client
  if (memberType === 'beneficiary') {
    const { data: trusts } = await adminClient
      .from('heirway_trust_progress')
      .select('id')
      .eq('client_id', clientId);
    finalAssignments = (trusts || []).map((t: any) => ({ trust_id: t.id, power_level: 'none' }));
  }

  // Replace existing assignments
  await adminClient.from('trust_member_assignments').delete().eq('member_id', memberId);

  if (finalAssignments.length > 0) {
    const rows = finalAssignments.map(a => ({
      member_id: memberId,
      trust_id: a.trust_id,
      power_level: memberType === 'beneficiary' ? 'none' : (a.power_level || 'limited'),
    }));
    await adminClient.from('trust_member_assignments').insert(rows);
  }
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
