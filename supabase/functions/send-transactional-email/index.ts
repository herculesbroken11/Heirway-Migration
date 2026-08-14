import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { WelcomeEmail } from '../_shared/email-templates/welcome.tsx'
import { PaymentConfirmationEmail } from '../_shared/email-templates/payment-confirmation.tsx'
import { IntakeCompleteEmail } from '../_shared/email-templates/intake-complete.tsx'
import { MeetingRequestConfirmationEmail } from '../_shared/email-templates/meeting-request-confirmation.tsx'
import { MessageResponseEmail } from '../_shared/email-templates/message-response.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const SITE_URL = 'https://myheirway.com'
const FROM_EMAIL = 'Heirway <noreply@notify.myheirway.com>'

const EMAIL_TEMPLATES: Record<string, { component: React.ComponentType<any>; subject: string }> = {
  welcome: { component: WelcomeEmail, subject: 'Welcome to Heirway!' },
  payment_confirmation: { component: PaymentConfirmationEmail, subject: 'Payment Confirmed — Your Plan is Active' },
  intake_complete: { component: IntakeCompleteEmail, subject: 'Intake Complete — Here\'s What Happens Next' },
  meeting_request_confirmation: { component: MeetingRequestConfirmationEmail, subject: 'Meeting Request Received' },
  message_response: { component: MessageResponseEmail, subject: 'Heirway has responded to your message' },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const resendApiKey = Deno.env.get('RESEND_API_KEY')

  if (!resendApiKey) {
    console.error('RESEND_API_KEY not configured')
    return new Response(JSON.stringify({ error: 'Server config error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await req.json()
    const { template, to, props } = body

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    if (!template || !to) {
      return new Response(JSON.stringify({ error: 'Missing template or to' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const templateConfig = EMAIL_TEMPLATES[template]
    if (!templateConfig) {
      return new Response(JSON.stringify({ error: `Unknown template: ${template}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Merge default props
    const templateProps = {
      siteUrl: SITE_URL,
      loginUrl: `${SITE_URL}/login?mode=login`,
      ...props,
    }

    // Render the email
    const html = await renderAsync(React.createElement(templateConfig.component, templateProps))
    const text = await renderAsync(React.createElement(templateConfig.component, templateProps), { plainText: true })

    const message_id = `${template}-${crypto.randomUUID()}`

    // Log as pending
    await supabase.from('email_send_log').insert({
      message_id,
      template_name: template,
      recipient_email: to,
      status: 'pending',
    })

    // Send directly via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject: templateConfig.subject,
        html,
        text,
      }),
    })

    const responseText = await res.text()

    if (!res.ok) {
      console.error(`Resend error ${res.status}: ${responseText}`)
      await supabase.from('email_send_log').insert({
        message_id,
        template_name: template,
        recipient_email: to,
        status: 'failed',
        error_message: `Resend error ${res.status}: ${responseText}`,
      })
      return new Response(JSON.stringify({ error: 'Email send failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Log success
    await supabase.from('email_send_log').insert({
      message_id,
      template_name: template,
      recipient_email: to,
      status: 'sent',
    })

    console.log(`[TRANSACTIONAL] Sent ${template} email to ${to} via Resend (${message_id})`)

    return new Response(JSON.stringify({ success: true, message_id }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Error:', err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
