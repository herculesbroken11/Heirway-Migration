import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FROM_EMAIL = "Heirway <noreply@notify.myheirway.com>";

function buildEmailHtml(title: string, body: string, details: Record<string, string> = {}): string {
  const detailRows = Object.entries(details)
    .map(([key, val]) => `
      <tr>
        <td style="padding:6px 12px;font-size:13px;color:#666;border-bottom:1px solid #f0f0f0;font-weight:600;white-space:nowrap;">${key}</td>
        <td style="padding:6px 12px;font-size:13px;color:#333;border-bottom:1px solid #f0f0f0;">${val}</td>
      </tr>
    `).join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:'DM Sans',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#D4920A,#b87a08);padding:24px 32px;">
      <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">Heirway Admin</h1>
    </div>
    <div style="padding:28px 32px;">
      <h2 style="margin:0 0 8px;color:#1a1a1a;font-size:18px;">${title}</h2>
      <p style="margin:0 0 20px;color:#555;font-size:14px;line-height:1.6;">${body}</p>
      ${detailRows ? `<table style="width:100%;border-collapse:collapse;background:#fafafa;border-radius:8px;overflow:hidden;">${detailRows}</table>` : ''}
    </div>
    <div style="padding:16px 32px;background:#fafafa;border-top:1px solid #eee;">
      <p style="margin:0;font-size:11px;color:#999;">This is an automated notification from Heirway Estate Portal.</p>
    </div>
  </div>
</body>
</html>`;
}

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

    // Get the requesting user
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await callerClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { request_type, description, meeting_type } = body;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Get all super_admin user IDs
    const { data: superAdminRoles } = await adminClient
      .from("user_roles")
      .select("user_id")
      .eq("role", "super_admin");

    if (!superAdminRoles || superAdminRoles.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No super admins to notify" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get super admin emails
    const { data: authUsers } = await adminClient.auth.admin.listUsers();
    const superAdminIds = new Set(superAdminRoles.map(r => r.user_id));
    const superAdminEmails = (authUsers?.users || [])
      .filter(u => superAdminIds.has(u.id))
      .map(u => u.email)
      .filter(Boolean) as string[];

    if (superAdminEmails.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No super admin emails found" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get client info
    const { data: clientData } = await adminClient
      .from("heirway_clients")
      .select("full_name, email, selected_plan")
      .eq("user_id", user.id)
      .maybeSingle();

    const clientName = clientData?.full_name || user.email || "Unknown";
    const clientEmail = clientData?.email || user.email || "Unknown";
    const typeLabel = request_type?.replace(/_/g, " ") || "Unknown";
    const meetingLabel = meeting_type ? ` (${meeting_type.replace(/_/g, " ")})` : "";

    // Create in-app notification
    await adminClient.from("heirway_admin_notifications").insert({
      title: `New Request: ${typeLabel}`,
      message: `${clientName} (${clientEmail}) submitted a ${typeLabel} request: ${description || "No description"}`,
      notification_type: "request",
      created_by: user.id,
      is_active: true,
    });

    // Send email via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    let emailSent = false;

    if (resendApiKey) {
      const subject = `New Request: ${typeLabel}${meetingLabel}`;
      const html = buildEmailHtml(
        `📋 New Client Request${meetingLabel}`,
        "A client has submitted a new request.",
        {
          "Client": clientName,
          "Email": clientEmail,
          "Type": typeLabel,
          "Description": description || "No description",
          "Date": new Date().toLocaleString("en-US", { timeZone: "America/New_York" }),
        }
      );

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: superAdminEmails,
          subject,
          html,
        }),
      });

      const responseText = await res.text();
      if (res.ok) {
        emailSent = true;
        console.log(`Email sent to ${superAdminEmails.join(", ")} via Resend`);
      } else {
        console.error(`Resend error ${res.status}: ${responseText}`);
      }
    } else {
      console.warn("RESEND_API_KEY not set - email skipped");
    }

    return new Response(JSON.stringify({ success: true, notified: superAdminEmails.length, emailSent }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
