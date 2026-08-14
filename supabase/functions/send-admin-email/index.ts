import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SITE_NAME = "Heirway";
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
      <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">${SITE_NAME} Admin</h1>
    </div>
    <div style="padding:28px 32px;">
      <h2 style="margin:0 0 8px;color:#1a1a1a;font-size:18px;">${title}</h2>
      <p style="margin:0 0 20px;color:#555;font-size:14px;line-height:1.6;">${body}</p>
      ${detailRows ? `
        <table style="width:100%;border-collapse:collapse;background:#fafafa;border-radius:8px;overflow:hidden;">
          ${detailRows}
        </table>
      ` : ''}
    </div>
    <div style="padding:16px 32px;background:#fafafa;border-top:1px solid #eee;">
      <p style="margin:0;font-size:11px;color:#999;">This is an automated notification from Heirway Estate Portal.</p>
    </div>
  </div>
</body>
</html>`;
}

async function sendViaResend(to: string[], subject: string, html: string): Promise<{ success: boolean; error?: string }> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    }),
  });

  const responseText = await res.text();
  if (!res.ok) {
    return { success: false, error: `Resend error ${res.status}: ${responseText}` };
  }
  return { success: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { event_type, event_data } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Get super admin emails
    const { data: superAdminRoles } = await adminClient
      .from("user_roles")
      .select("user_id")
      .in("role", ["super_admin", "admin"]);

    if (!superAdminRoles || superAdminRoles.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No admins to notify" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch each admin user directly by ID (avoids pagination issues with listUsers)
    const adminIds = superAdminRoles.map(r => r.user_id);
    const adminEmailResults = await Promise.all(
      adminIds.map(async (id) => {
        const { data, error } = await adminClient.auth.admin.getUserById(id);
        if (error) {
          console.error(`Failed to fetch admin user ${id}:`, error.message);
          return null;
        }
        return data?.user?.email || null;
      })
    );
    const adminEmails = adminEmailResults.filter(Boolean) as string[];

    console.log(`Found ${adminEmails.length} admin emails for event ${event_type}: ${adminEmails.join(", ")}`);

    if (adminEmails.length === 0) {
      console.error("No admin emails resolved. Admin role rows:", superAdminRoles);
      return new Response(JSON.stringify({ success: true, message: "No admin emails found" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build email based on event type
    let subject = "";
    let title = "";
    let emailBody = "";
    let details: Record<string, string> = {};

    switch (event_type) {
      case "new_account":
        subject = "New Account Created";
        title = "🆕 New Account Registration";
        emailBody = "A new user has created an account on Heirway.";
        details = {
          "Name": event_data.name || "Not provided",
          "Email": event_data.email || "Unknown",
          "Date": new Date().toLocaleString("en-US", { timeZone: "America/New_York" }),
        };
        break;

      case "admin_request":
        subject = `New Request: ${(event_data.request_type || "").replace(/_/g, " ")}`;
        title = "📋 New Client Request";
        emailBody = "A client has submitted a new request.";
        details = {
          "Client": event_data.client_name || "Unknown",
          "Email": event_data.client_email || "Unknown",
          "Type": (event_data.request_type || "").replace(/_/g, " "),
          "Description": event_data.description || "No description",
          "Date": new Date().toLocaleString("en-US", { timeZone: "America/New_York" }),
        };
        break;

      case "intake_completed":
        subject = "Intake Form Completed";
        title = "📝 Intake Form Submitted";
        emailBody = "A client has completed their intake form.";
        details = {
          "Client": event_data.client_name || "Unknown",
          "Email": event_data.client_email || "Unknown",
          "Date": new Date().toLocaleString("en-US", { timeZone: "America/New_York" }),
        };
        break;

      case "referral_submitted":
        subject = "New Referral Submitted";
        title = "🎁 New Referral";
        emailBody = "A client has submitted a new referral.";
        details = {
          "Referred By": event_data.referrer_name || "Unknown",
          "Referrer Email": event_data.referrer_email || "Unknown",
          "Referee Name": `${event_data.referee_first_name || ""} ${event_data.referee_last_name || ""}`.trim(),
          "Referee Email": event_data.referee_email || "Unknown",
          "Referee Phone": event_data.referee_phone || "Unknown",
          "Date": new Date().toLocaleString("en-US", { timeZone: "America/New_York" }),
        };
        break;

      case "diagnostic_completed":
        subject = "Diagnostic Assessment Completed";
        title = "🔍 Diagnostic Form Submitted";
        emailBody = "A prospect has completed the Trust Structural Readiness & Risk Review.";
        details = {
          "Name": event_data.name || "Unknown",
          "Email": event_data.email || "Unknown",
          "Phone": event_data.phone || "Unknown",
          "Company": event_data.company || "N/A",
          "Primary Profile": event_data.primary_profile || "N/A",
          "Secondary Profile": event_data.secondary_profile || "N/A",
          "Date": new Date().toLocaleString("en-US", { timeZone: "America/New_York" }),
        };
        break;

      case "contact_inquiry":
        subject = "New Contact Inquiry";
        title = "💬 New Contact Message";
        emailBody = "A visitor has submitted a contact inquiry.";
        details = {
          "Name": event_data.name || "Not provided",
          "Email": event_data.email || "Unknown",
          "Message": event_data.message || "No message",
          "Date": new Date().toLocaleString("en-US", { timeZone: "America/New_York" }),
        };
        break;

      default:
        subject = "Heirway Notification";
        title = "📌 Notification";
        emailBody = event_data.message || "You have a new notification.";
        details = event_data.details || {};
    }

    // Create in-app notification record with specific type for filtering
    const notificationType = event_type === 'new_account' ? 'new_account'
      : event_type === 'admin_request' ? 'request'
      : event_type === 'intake_completed' ? 'intake_completed'
      : event_type === 'referral_submitted' ? 'referral'
      : event_type === 'diagnostic_completed' ? 'diagnostic'
      : event_type === 'contact_inquiry' ? 'contact_inquiry'
      : 'system';

    const firstAdmin = superAdminRoles[0];
    await adminClient.from("heirway_admin_notifications").insert({
      title: title.replace(/[🆕📋📝🎁🔍📌]\s?/g, ""),
      message: `${emailBody} ${Object.entries(details).map(([k, v]) => `${k}: ${v}`).join(", ")}`,
      notification_type: notificationType,
      created_by: firstAdmin.user_id,
      is_active: true,
    });

    // Send email via Resend
    const html = buildEmailHtml(title, emailBody, details);
    const result = await sendViaResend(adminEmails, subject, html);

    if (!result.success) {
      console.error("Resend send failed:", result.error);
    } else {
      console.log(`Email sent to ${adminEmails.join(", ")} via Resend`);
    }

    return new Response(JSON.stringify({ success: true, notified: adminEmails.length, emailSent: result.success }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
