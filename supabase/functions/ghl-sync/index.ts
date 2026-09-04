// Syncs new leads from Lovable to Go High Level (GHL).
// Triggered by Postgres triggers on `prospects` and `contact_messages`.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GHL_API_TOKEN = Deno.env.get('GHL_API_TOKEN');
const GHL_LOCATION_ID = Deno.env.get('GHL_LOCATION_ID');
const GHL_BASE = 'https://services.leadconnectorhq.com';

type IncomingPayload = {
  source: 'prospect' | 'contact_message' | 'paid_customer' | 'registered_user';
  record: Record<string, any>;
};

function splitName(full?: string): { first: string; last: string } {
  if (!full) return { first: '', last: '' };
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

function maskEmail(email?: string | null): string {
  if (!email || typeof email !== 'string') return '(none)';
  const [local, domain] = email.split('@');
  if (!domain) return '(invalid)';
  const safeLocal = local.length <= 2 ? `${local[0] ?? '*'}*` : `${local.slice(0, 2)}***`;
  return `${safeLocal}@${domain}`;
}

async function upsertContact(body: Record<string, any>) {
  console.log('[GHL-SYNC] GHL contacts/upsert request', {
    hasEmail: Boolean(body.email),
    hasPhone: Boolean(body.phone),
    tagCount: Array.isArray(body.tags) ? body.tags.length : 0,
    customFieldCount: Array.isArray(body.customFields) ? body.customFields.length : 0,
    sourceLabel: body.source || null,
  });

  const res = await fetch(`${GHL_BASE}/contacts/upsert`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GHL_API_TOKEN}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  console.log('[GHL-SYNC] GHL contacts/upsert response', { status: res.status, ok: res.ok });
  if (!res.ok) {
    console.error('[GHL-SYNC] GHL upsert failed', res.status, text);
    throw new Error(`GHL ${res.status}: ${text}`);
  }
  const parsed = JSON.parse(text);
  const contactId = parsed?.contact?.id || parsed?.id || null;
  console.log('[GHL-SYNC] GHL contact upserted', { contactId: contactId ? String(contactId) : null });
  return parsed;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!GHL_API_TOKEN || !GHL_LOCATION_ID) {
      throw new Error('Missing GHL_API_TOKEN or GHL_LOCATION_ID');
    }

    const payload: IncomingPayload = await req.json();
    const { source, record } = payload;

    console.log('[GHL-SYNC] Request received', {
      source: source || '(missing)',
      hasRecord: Boolean(record),
      email: maskEmail(record?.email),
      hasFullName: Boolean(record?.full_name || record?.name),
      planId: record?.plan_id || record?.selected_plan || null,
    });

    if (source === 'prospect') {
      const { first, last } = splitName(record.name);
      const tags = ['source:lovable', `source:${(record.status || 'new')}-prospect`];
      const quizAnswers = record.quiz_answers || {};
      // Tag opt-in if quiz captured it
      if (quizAnswers.opt_in === true || quizAnswers.optIn === true) {
        tags.push('consent:opted-in');
      } else {
        tags.push('consent:no-explicit-consent');
      }

      console.log('[GHL-SYNC] Upserting prospect contact', { tags });
      await upsertContact({
        locationId: GHL_LOCATION_ID,
        firstName: first,
        lastName: last,
        name: record.name || undefined,
        email: record.email || undefined,
        phone: record.phone || undefined,
        source: 'Lovable - Prospect',
        tags,
        customFields: Object.entries(quizAnswers).map(([key, value]) => ({
          key: `quiz_${key}`,
          field_value: String(value ?? ''),
        })),
      });
    } else if (source === 'contact_message') {
      const { first, last } = splitName(record.full_name);
      const tags = [
        'source:lovable',
        'source:contact-form',
        record.opt_in ? 'consent:opted-in' : 'consent:no-explicit-consent',
      ];

      console.log('[GHL-SYNC] Upserting contact_message contact', { tags });
      await upsertContact({
        locationId: GHL_LOCATION_ID,
        firstName: first,
        lastName: last,
        name: record.full_name || undefined,
        email: record.email || undefined,
        source: 'Lovable - Contact Form',
        tags,
        customFields: [
          { key: 'contact_message', field_value: String(record.message ?? '') },
          { key: 'contact_subject', field_value: String(record.subject ?? '') },
        ],
      });
    } else if (source === 'paid_customer') {
      const { first, last } = splitName(record.full_name);
      const planId = record.plan_id || 'unknown';
      const tags = [
        'source:lovable',
        'customer:paid',
        `plan:${planId}`,
      ];

      console.log('[GHL-SYNC] Upserting paid_customer contact', { planId, tags });
      await upsertContact({
        locationId: GHL_LOCATION_ID,
        firstName: first,
        lastName: last,
        name: record.full_name || undefined,
        email: record.email || undefined,
        phone: record.phone || undefined,
        source: 'Lovable - Paid Customer',
        tags,
        customFields: [
          { key: 'plan_id', field_value: String(planId) },
          { key: 'plan_started_at', field_value: String(record.plan_started_at ?? new Date().toISOString()) },
        ],
      });
    } else if (source === 'registered_user') {
      const { first, last } = splitName(record.full_name);
      const tags = [
        'source:lovable',
        'customer:registered',
        'consent:email-verified',
      ];
      if (record.selected_plan) tags.push(`plan:${record.selected_plan}`);
      if (record.recommended_plan) tags.push(`recommended:${record.recommended_plan}`);

      console.log('[GHL-SYNC] Upserting registered_user contact', { tags });
      await upsertContact({
        locationId: GHL_LOCATION_ID,
        firstName: first,
        lastName: last,
        name: record.full_name || undefined,
        email: record.email || undefined,
        phone: record.phone || undefined,
        address1: record.address_street || undefined,
        city: record.address_city || undefined,
        state: record.address_state || record.state || undefined,
        postalCode: record.address_zip || undefined,
        source: 'Lovable - Registered User',
        tags,
        customFields: [
          { key: 'registered_at', field_value: String(record.registered_at ?? new Date().toISOString()) },
          { key: 'selected_plan', field_value: String(record.selected_plan ?? '') },
          { key: 'recommended_plan', field_value: String(record.recommended_plan ?? '') },
        ],
      });
    } else {
      console.warn('[GHL-SYNC] Unknown source; rejecting', { source });
      return new Response(JSON.stringify({ error: 'Unknown source' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[GHL-SYNC] Success', { source });
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[GHL-SYNC] Error', { message });
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
