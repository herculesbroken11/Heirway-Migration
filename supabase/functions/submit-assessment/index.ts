import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Rate limiting: simple in-memory store (resets on cold start, good enough for basic protection)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

// Valid option values per question (server-side validation)
const VALID_OPTIONS: Record<string, string[]> = {
  q1_situation: [
    "operating_business", "farmer_landowner", "real_estate_investor",
    "private_investor", "ma_professional", "investment_firm_family_office",
    "high_w2", "inheriting_assets", "liquidity_event",
  ],
  q2_annual_income: ["under_250k", "250k_500k", "500k_1m", "1m_5m", "5m_plus"],
  q3_net_worth: ["under_1m", "1m_5m", "5m_15m", "15m_50m", "50m_plus"],
  q4_income_source: ["operating_business", "real_estate", "capital_gains", "salary_bonuses", "mixed"],
  q5_tax_burden: ["under_50k", "50k_150k", "150k_500k", "500k_plus", "unknown"],
  q6_avoided_strategies: ["yes_too_complex", "yes_too_aggressive", "no_open", "never_heard"],
  q7_mindset: ["reduce_legally", "reduce_aggressively", "pay_fair_share", "confused"],
  q8_decision_style: ["fast_confident", "research_then_decide", "need_validation", "avoid_decide"],
  q9_regret_pattern: ["regret_inaction", "regret_action", "rarely_regret", "regret_both"],
  q10_change_concern: ["very_concerned", "somewhat_concerned", "not_concerned", "depends"],
  q11_exit_comfort: ["must_have_exit", "prefer_exit", "ok_without", "never_considered"],
  q12_veto_power: ["spouse_partner", "attorney", "cpa", "business_partner", "financial_advisor", "none"],
  q13_blame_allocation: ["blame_advisor", "blame_self", "shared_blame", "no_blame"],
  q14_audit_perception: ["terrified", "concerned", "neutral", "confident"],
  q15_aggressiveness_concern: ["very_concerned", "somewhat_concerned", "not_concerned", "unsure"],
  q16_control_importance: ["full_control", "significant_control", "delegate_oversight", "fully_delegate"],
  q17_trustee_acceptance: ["very_comfortable", "somewhat_comfortable", "uncomfortable", "need_info"],
  q18_holding_period: ["under_5", "5_to_10", "10_to_20", "20_plus"],
  q19_existing_trusts: ["yes_active", "yes_inactive", "no_interested", "no_unsure"],
  q20_intent: ["immediate", "within_year", "exploring", "just_learning"],
  q21_fee_preference: ["flat_fee", "percentage", "hybrid", "unsure"],
  q22_savings_share: ["keep_all", "share_small", "share_fair", "depends"],
  q23_pricing_priority: ["lowest_cost", "best_value", "premium_service", "roi_focused"],
};

const MULTI_SELECT_QUESTIONS = new Set(["q1_situation", "q12_veto_power"]);

function validateString(val: unknown, maxLen: number): val is string {
  return typeof val === "string" && val.trim().length > 0 && val.length <= maxLen;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && email.length <= 255;
}

function validatePhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10;
}

function validateResponses(responses: Record<string, unknown>): string | null {
  for (const [qId, validValues] of Object.entries(VALID_OPTIONS)) {
    const val = responses[qId];
    if (MULTI_SELECT_QUESTIONS.has(qId)) {
      if (!Array.isArray(val) || val.length === 0) return `Missing or empty: ${qId}`;
      for (const v of val) {
        if (typeof v !== "string" || !validValues.includes(v)) return `Invalid value in ${qId}: ${v}`;
      }
    } else {
      if (typeof val !== "string" || !validValues.includes(val)) return `Invalid value for ${qId}: ${val}`;
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Rate limiting by IP
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimited(ip)) {
      return new Response(
        JSON.stringify({ error: "Too many submissions. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();

    // Honeypot check - if filled, silently succeed (bot thinks it worked)
    if (body.website || body.honeypot) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Timing check - reject if submitted too fast (< 10 seconds)
    if (typeof body.startedAt === "number") {
      const elapsed = Date.now() - body.startedAt;
      if (elapsed < 10_000) {
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { prospectInfo, responses, scores, profile } = body;

    // Validate prospect info
    if (!prospectInfo || typeof prospectInfo !== "object") {
      return new Response(JSON.stringify({ error: "Missing prospect information" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!validateString(prospectInfo.name, 200)) {
      return new Response(JSON.stringify({ error: "Invalid name" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!validateString(prospectInfo.email, 255) || !validateEmail(prospectInfo.email)) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!validateString(prospectInfo.phone, 20) || !validatePhone(prospectInfo.phone)) {
      return new Response(JSON.stringify({ error: "Invalid phone number" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (prospectInfo.company && typeof prospectInfo.company === "string" && prospectInfo.company.length > 200) {
      return new Response(JSON.stringify({ error: "Company name too long" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate responses
    if (!responses || typeof responses !== "object") {
      return new Response(JSON.stringify({ error: "Missing assessment responses" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const responseError = validateResponses(responses);
    if (responseError) {
      return new Response(JSON.stringify({ error: "Invalid assessment data" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate scores
    if (!scores || typeof scores !== "object") {
      return new Response(JSON.stringify({ error: "Missing scores" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const scoreFields = ["scs", "lai", "isi", "adi", "aeti", "csi", "pfi"];
    for (const f of scoreFields) {
      if (typeof scores[f] !== "number" || scores[f] < 0 || scores[f] > 100) {
        return new Response(JSON.stringify({ error: "Invalid scores" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Insert using service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const prospectId = crypto.randomUUID();

    const { error: prospectError } = await supabase.from("prospects").insert({
      id: prospectId,
      name: prospectInfo.name.trim().slice(0, 200),
      email: prospectInfo.email.trim().slice(0, 255) || null,
      phone: prospectInfo.phone.trim().slice(0, 20) || null,
      company: prospectInfo.company?.trim().slice(0, 200) || null,
      status: "new",
    });

    if (prospectError) {
      console.error("Prospect insert error:", prospectError);
      return new Response(JSON.stringify({ error: "Submission failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: assessmentError } = await supabase.from("assessments").insert({
      prospect_id: prospectId,
      q1_situation: responses.q1_situation || [],
      q2_annual_income: responses.q2_annual_income,
      q3_net_worth: responses.q3_net_worth,
      q4_income_source: responses.q4_income_source,
      q5_tax_burden: responses.q5_tax_burden,
      q6_avoided_strategies: responses.q6_avoided_strategies,
      q7_mindset: responses.q7_mindset,
      q8_decision_style: responses.q8_decision_style,
      q9_regret_pattern: responses.q9_regret_pattern,
      q10_change_concern: responses.q10_change_concern,
      q11_exit_comfort: responses.q11_exit_comfort,
      q12_veto_power: responses.q12_veto_power || [],
      q13_blame_allocation: responses.q13_blame_allocation,
      q14_audit_perception: responses.q14_audit_perception,
      q15_aggressiveness_concern: responses.q15_aggressiveness_concern,
      q16_control_importance: responses.q16_control_importance,
      q17_trustee_acceptance: responses.q17_trustee_acceptance,
      q18_holding_period: responses.q18_holding_period,
      q19_existing_trusts: responses.q19_existing_trusts,
      q20_intent: responses.q20_intent,
      q21_fee_preference: responses.q21_fee_preference,
      q22_savings_share: responses.q22_savings_share,
      q23_pricing_priority: responses.q23_pricing_priority,
      scs_score: scores.scs,
      lai_score: scores.lai,
      isi_score: scores.isi,
      adi_score: scores.adi,
      aeti_score: scores.aeti,
      csi_score: scores.csi,
      pfi_score: scores.pfi,
      primary_profile: profile?.primary || null,
      secondary_profile: profile?.secondary || null,
    });

    if (assessmentError) {
      console.error("Assessment insert error:", assessmentError);
      return new Response(JSON.stringify({ error: "Submission failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Notify admin about diagnostic completion
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      await fetch(`${supabaseUrl}/functions/v1/send-admin-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          event_type: "diagnostic_completed",
          event_data: {
            name: prospectInfo.name.trim(),
            email: prospectInfo.email.trim(),
            phone: prospectInfo.phone.trim(),
            company: prospectInfo.company?.trim() || null,
            primary_profile: profile?.primary || null,
            secondary_profile: profile?.secondary || null,
          },
        }),
      });
    } catch (notifyErr) {
      console.error("Failed to send admin notification:", notifyErr);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Submission failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
