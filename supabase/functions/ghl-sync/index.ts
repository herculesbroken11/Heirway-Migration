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

async function upsertContact(body: Record<string, any>) {
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
  if (!res.ok) {
    console.error('GHL upsert failed', res.status, text);
    throw new Error(`GHL ${res.status}: ${text}`);
  }
  return JSON.parse(text);
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
      return new Response(JSON.stringify({ error: 'Unknown source' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('ghl-sync error', err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
