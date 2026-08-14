// Orientation Question Matrix - For Meeting 1 (Profile Confirmation)
// Purpose: Confirm safety, authority dynamics, decision readiness, and sequencing before analysis
// Usage Rules: Ask 2-3 Universal + 2-4 Profile-Specific questions only

export interface OrientationCheckItem {
  id: string;
  label: string;
  scoreAdjustments: Partial<Record<IndexKey, number>>;
  insight?: string;
  lockHigh?: IndexKey[]; // Indices to lock at high if checked
}

export interface OrientationQuestion {
  id: string;
  question: string;
  whatYouAreTesting: string;
  listenFor: string[];
  whatItTellsYou: string;
  checkItems: OrientationCheckItem[];
  profile?: string; // If profile-specific
  note?: string; // Additional guidance
}

export type IndexKey = 'scs' | 'lai' | 'isi' | 'adi' | 'aeti' | 'csi' | 'pfi';

// Universal Orientation Questions (Ask 2-3 with everyone)
export const UNIVERSAL_QUESTIONS: OrientationQuestion[] = [
  {
    id: 'universal_authority',
    question: 'When a decision like this is made well, who needs to feel comfortable?',
    whatYouAreTesting: 'Actual authority vs nominal authority',
    listenFor: ['Immediate CPA / attorney naming', '"Ultimately I decide, but…"', 'Board / partner references'],
    whatItTellsYou: 'Any non-self checked → ADI +2. Multiple parties → ADI locked high',
    checkItems: [
      { id: 'u_auth_self', label: 'Self-only', scoreAdjustments: {}, insight: 'Autonomous decision maker' },
      { id: 'u_auth_cpa', label: 'CPA', scoreAdjustments: { adi: 2 }, insight: 'CPA authority present' },
      { id: 'u_auth_attorney', label: 'Attorney', scoreAdjustments: { adi: 2 }, insight: 'Legal authority present' },
      { id: 'u_auth_board', label: 'Board / partner', scoreAdjustments: { adi: 2 }, insight: 'Governance authority present' },
      { id: 'u_auth_multiple', label: 'Multiple parties', scoreAdjustments: { adi: 2 }, lockHigh: ['adi'], insight: 'Complex authority structure - ADI locked high' },
    ],
  },
  {
    id: 'universal_veto',
    question: 'If someone pushed back later, whose reaction would matter most?',
    whatYouAreTesting: 'Veto hierarchy (emotional weight)',
    listenFor: ['Emotional emphasis on one party', 'Fear of blame vs confidence'],
    whatItTellsYou: 'Different person → ADI +1 (hidden veto detected)',
    checkItems: [
      { id: 'u_veto_same', label: 'Same as above', scoreAdjustments: {}, insight: 'Consistent authority' },
      { id: 'u_veto_different', label: 'Different person', scoreAdjustments: { adi: 1 }, insight: 'Hidden veto detected' },
    ],
    note: 'This prevents false closes and mis-sequenced pitches.',
  },
  {
    id: 'universal_involvement',
    question: 'So just to confirm — if we were to move forward later, would it make sense to involve them earlier rather than later?',
    whatYouAreTesting: 'Authority sequencing acceptance',
    listenFor: ['Immediate yes', 'Hesitation', 'Defensive no'],
    whatItTellsYou: 'Hesitation or No → ADI locked high. Also increases LAI +1 (fear of blame)',
    checkItems: [
      { id: 'u_involve_yes', label: 'Yes', scoreAdjustments: {}, insight: 'Open to authority involvement' },
      { id: 'u_involve_hesitation', label: 'Hesitation', scoreAdjustments: { lai: 1 }, lockHigh: ['adi'], insight: 'Authority resistance - ADI locked high' },
      { id: 'u_involve_no', label: 'No', scoreAdjustments: { lai: 1 }, lockHigh: ['adi'], insight: 'Strong authority resistance - ADI locked high' },
    ],
  },
  {
    id: 'universal_discomfort',
    question: 'If something feels unclear or uncomfortable at any point, what\'s the best way to handle that?',
    whatYouAreTesting: 'Discomfort handling preference',
    listenFor: ['Pause / revisit', 'Bring in advisor', 'Push through'],
    whatItTellsYou: 'Pause → LAI +1, ISI +1. Bring in advisor → ADI +1. Push through → AETI +1 (risk of post-decision regret)',
    checkItems: [
      { id: 'u_discomfort_pause', label: 'Pause and revisit', scoreAdjustments: { lai: 1, isi: 1 }, insight: 'Needs processing time' },
      { id: 'u_discomfort_advisor', label: 'Bring in advisor', scoreAdjustments: { adi: 1 }, insight: 'Advisor-dependent' },
      { id: 'u_discomfort_push', label: 'Push through', scoreAdjustments: { aeti: 1 }, insight: 'Risk of post-decision regret' },
    ],
  },
  {
    id: 'universal_timing',
    question: 'What made now feel like the right time to explore this?',
    whatYouAreTesting: 'Source of urgency (internal vs external)',
    listenFor: ['CPA pressure', 'Transaction timing', 'Family pressure', 'Personal clarity or curiosity'],
    whatItTellsYou: 'External pressure → readiness is fragile → slow pacing required',
    checkItems: [
      { id: 'u_timing_external', label: 'External pressure mentioned', scoreAdjustments: { lai: 1 }, insight: 'Readiness is fragile → slow pacing required' },
      { id: 'u_timing_internal', label: 'Internal clarity / self-initiated', scoreAdjustments: {}, insight: 'Strong internal motivation' },
    ],
  },
  {
    id: 'universal_success',
    question: 'What would make this process feel successful even if you didn\'t move forward?',
    whatYouAreTesting: 'How they define success',
    listenFor: ['Clarity / confidence / understanding', 'Outcome fixation (savings, result, structure)'],
    whatItTellsYou: 'Outcome focus early → future fear likely → reinforce safety framing',
    checkItems: [
      { id: 'u_success_clarity', label: 'Wants clarity / confidence', scoreAdjustments: {}, insight: 'Process-oriented' },
      { id: 'u_success_understanding', label: 'Wants understanding', scoreAdjustments: {}, insight: 'Education receptive' },
      { id: 'u_success_outcome', label: 'Outcome-focused early', scoreAdjustments: { lai: 1 }, insight: 'Future fear likely → reinforce safety framing' },
    ],
  },
  {
    id: 'universal_uncomfortable',
    question: 'What would make you uncomfortable as we go through this?',
    whatYouAreTesting: 'Latent psychological risk',
    listenFor: ['"Locked in"', 'Audit fear', 'Embarrassment / judgment', 'Advisor reaction'],
    whatItTellsYou: 'Locked-in → ISI ↑, Audit / embarrassment → LAI ↑ / AETI ↑, Advisor reaction → ADI ↑',
    checkItems: [
      { id: 'u_uncomfortable_locked', label: 'Permanence / locked-in language', scoreAdjustments: { isi: 1 }, insight: 'ISI elevated' },
      { id: 'u_uncomfortable_audit', label: 'Audit concern', scoreAdjustments: { lai: 1, aeti: 1 }, insight: 'LAI/AETI elevated' },
      { id: 'u_uncomfortable_embarrassment', label: 'Embarrassment / reputation', scoreAdjustments: { lai: 1, aeti: 1 }, insight: 'Social fear present' },
      { id: 'u_uncomfortable_advisor', label: 'Advisor reaction concern', scoreAdjustments: { adi: 1 }, insight: 'ADI elevated' },
    ],
  },
  {
    id: 'universal_regret',
    question: 'Have you had something look good on paper but not feel right later?',
    whatYouAreTesting: 'Lived regret vs abstract caution',
    listenFor: ['Personal example', 'Hypothetical or vague answer'],
    whatItTellsYou: 'Personal regret → loss aversion confirmed',
    checkItems: [
      { id: 'u_regret_personal', label: 'Personal regret story', scoreAdjustments: { lai: 2 }, insight: 'Loss aversion confirmed' },
      { id: 'u_regret_abstract', label: 'Abstract / no example', scoreAdjustments: {}, insight: 'Theoretical concern only' },
    ],
  },
];

// Profile A — Loss Averse Overpayer (High LAI · High ISI · High AETI)
export const PROFILE_A_QUESTIONS: OrientationQuestion[] = [
  {
    id: 'a_stress',
    question: 'What part of big financial decisions causes the most stress?',
    whatYouAreTesting: 'Where fear actually lives',
    listenFor: ['Permanence', 'Scrutiny', 'Embarrassment', 'Pure cost concern'],
    whatItTellsYou: 'Stress ≠ money → emotional framing required. Permanence → ISI dominant',
    profile: 'Loss Averse Overpayer',
    checkItems: [
      { id: 'a_stress_permanence', label: 'Permanence', scoreAdjustments: { isi: 1 }, insight: 'ISI dominant' },
      { id: 'a_stress_scrutiny', label: 'Scrutiny', scoreAdjustments: { aeti: 1 }, insight: 'Audit sensitivity' },
      { id: 'a_stress_embarrassment', label: 'Embarrassment', scoreAdjustments: { lai: 1 }, insight: 'Social fear present' },
      { id: 'a_stress_money', label: 'Money only', scoreAdjustments: {}, insight: 'Stress ≠ emotional → rational framing OK' },
    ],
  },
  {
    id: 'a_secondguess',
    question: 'What would make you second-guess a decision six months later?',
    whatYouAreTesting: 'Regret trigger',
    listenFor: ['Advisor disagreement', 'New information', 'Audit', 'Public perception'],
    whatItTellsYou: 'Any checked → exit ramps mandatory',
    profile: 'Loss Averse Overpayer',
    note: 'Any checked → exit ramps mandatory',
    checkItems: [
      { id: 'a_secondguess_advisor', label: 'Advisor pushback', scoreAdjustments: { adi: 1 }, insight: 'Exit ramps mandatory' },
      { id: 'a_secondguess_newinfo', label: 'New info', scoreAdjustments: { isi: 1 }, insight: 'Exit ramps mandatory' },
      { id: 'a_secondguess_audit', label: 'Audit', scoreAdjustments: { aeti: 1 }, insight: 'Exit ramps mandatory' },
      { id: 'a_secondguess_reputation', label: 'Reputation', scoreAdjustments: { lai: 1 }, insight: 'Exit ramps mandatory' },
    ],
  },
  {
    id: 'a_revisit',
    question: 'Do you revisit decisions after they\'re made?',
    whatYouAreTesting: 'Rumination risk',
    listenFor: ['"Yes, constantly"'],
    whatItTellsYou: 'Often → slow pacing mandatory',
    profile: 'Loss Averse Overpayer',
    checkItems: [
      { id: 'a_revisit_often', label: 'Often', scoreAdjustments: { lai: 2, isi: 1 }, insight: 'Slow pacing mandatory' },
      { id: 'a_revisit_sometimes', label: 'Sometimes', scoreAdjustments: { lai: 1 }, insight: 'Moderate rumination' },
      { id: 'a_revisit_rarely', label: 'Rarely', scoreAdjustments: {}, insight: 'Low rumination risk' },
    ],
  },
  {
    id: 'a_preference',
    question: 'Which matters more: reversibility, validation, or simplicity?',
    whatYouAreTesting: 'Safety preference',
    listenFor: [],
    whatItTellsYou: 'Validation → CPA-first sequencing',
    profile: 'Loss Averse Overpayer',
    checkItems: [
      { id: 'a_preference_reversibility', label: 'Reversibility', scoreAdjustments: { isi: 1 }, insight: 'Exit ramp focus' },
      { id: 'a_preference_validation', label: 'Validation', scoreAdjustments: { adi: 1 }, insight: 'CPA-first sequencing' },
      { id: 'a_preference_simplicity', label: 'Simplicity', scoreAdjustments: { scs: -1 }, insight: 'Complexity averse' },
    ],
  },
];

// Profile B — Authority Gated Optimizer (High ADI)
export const PROFILE_B_QUESTIONS: OrientationQuestion[] = [
  {
    id: 'b_comfort',
    question: 'Whose comfort usually matters most before moving forward?',
    whatYouAreTesting: 'Real authority vs stated authority',
    listenFor: ['Immediate CPA naming', 'Hesitation', '"I decide, but…"'],
    whatItTellsYou: 'Any two checked → ADI elevated',
    profile: 'Authority Gated Optimizer',
    note: 'Any two checked → ADI elevated',
    checkItems: [
      { id: 'b_comfort_cpa', label: 'CPA named immediately', scoreAdjustments: { adi: 1 }, insight: 'CPA authority confirmed' },
      { id: 'b_comfort_attorney', label: 'Attorney named', scoreAdjustments: { adi: 1 }, insight: 'Legal authority confirmed' },
      { id: 'b_comfort_hesitation', label: 'Hesitation', scoreAdjustments: { adi: 1 }, insight: 'Hidden authority present' },
      { id: 'b_comfort_deflection', label: 'Deflection language', scoreAdjustments: { adi: 1 }, insight: 'Authority unclear' },
    ],
  },
  {
    id: 'b_slowed',
    question: 'Have you felt aligned but someone else slowed things down?',
    whatYouAreTesting: 'Historical veto behavior',
    listenFor: ['Frustration', 'Resignation'],
    whatItTellsYou: 'Yes → authority-first path required',
    profile: 'Authority Gated Optimizer',
    checkItems: [
      { id: 'b_slowed_frustration', label: 'Yes — frustration', scoreAdjustments: { adi: 1 }, insight: 'Authority-first path required' },
      { id: 'b_slowed_resignation', label: 'Yes — resignation', scoreAdjustments: { adi: 2 }, insight: 'Authority-first path required' },
      { id: 'b_slowed_no', label: 'No', scoreAdjustments: {}, insight: 'Clear decision path' },
    ],
  },
  {
    id: 'b_backup',
    question: 'In those moments, did you want backup or delegation?',
    whatYouAreTesting: 'Shielding vs partnership',
    listenFor: [],
    whatItTellsYou: 'Backup → authority assets required',
    profile: 'Authority Gated Optimizer',
    checkItems: [
      { id: 'b_backup_backup', label: 'Backup', scoreAdjustments: { adi: 1 }, insight: 'Authority assets required' },
      { id: 'b_backup_delegation', label: 'Delegation', scoreAdjustments: {}, insight: 'Comfortable with handoff' },
      { id: 'b_backup_neither', label: 'Neither', scoreAdjustments: {}, insight: 'Self-reliant' },
    ],
  },
  {
    id: 'b_pushback',
    question: 'What would cause an advisor to push back here?',
    whatYouAreTesting: 'Advisor psychology',
    listenFor: ['Unfamiliarity', 'Risk perception', 'Timing', 'Reputation'],
    whatItTellsYou: 'Unfamiliarity → education assets. Risk / reputation → conservative framing',
    profile: 'Authority Gated Optimizer',
    checkItems: [
      { id: 'b_pushback_unfamiliarity', label: 'Unfamiliarity', scoreAdjustments: {}, insight: 'Education assets needed' },
      { id: 'b_pushback_risk', label: 'Risk', scoreAdjustments: { aeti: 1 }, insight: 'Conservative framing required' },
      { id: 'b_pushback_timing', label: 'Timing', scoreAdjustments: {}, insight: 'Sequencing important' },
      { id: 'b_pushback_reputation', label: 'Reputation', scoreAdjustments: { aeti: 1 }, insight: 'Conservative framing required' },
    ],
  },
];

// Profile C — Control Sensitive Operator (High CSI)
export const PROFILE_C_QUESTIONS: OrientationQuestion[] = [
  {
    id: 'c_handson',
    question: 'Where do you stay hands-on versus delegate?',
    whatYouAreTesting: 'Control scope',
    listenFor: ['Operational involvement', 'Visibility / optics'],
    whatItTellsYou: 'Optics → governance framing critical',
    profile: 'Control Sensitive Operator',
    checkItems: [
      { id: 'c_handson_operational', label: 'Operational control', scoreAdjustments: { csi: 1 }, insight: 'Deep operational involvement' },
      { id: 'c_handson_optics', label: 'Optics / visibility', scoreAdjustments: { csi: 1 }, insight: 'Governance framing critical' },
      { id: 'c_handson_delegate', label: 'Comfortable delegating', scoreAdjustments: { csi: -1 }, insight: 'Lower control sensitivity' },
    ],
  },
  {
    id: 'c_control',
    question: 'What does "being in control" mean to you?',
    whatYouAreTesting: 'Control definition',
    listenFor: ['Identity language', 'Functional language'],
    whatItTellsYou: 'Emotional → CSI elevated',
    profile: 'Control Sensitive Operator',
    checkItems: [
      { id: 'c_control_emotional', label: 'Emotional / identity-based', scoreAdjustments: { csi: 2 }, insight: 'CSI elevated' },
      { id: 'c_control_functional', label: 'Functional / role-based', scoreAdjustments: {}, insight: 'Practical control focus' },
    ],
  },
  {
    id: 'c_boxedout',
    question: 'Have you ever felt boxed out of a decision?',
    whatYouAreTesting: 'Governance trauma',
    listenFor: ['Strong emotional response'],
    whatItTellsYou: 'Strong → trustee optics mandatory',
    profile: 'Control Sensitive Operator',
    checkItems: [
      { id: 'c_boxedout_strong', label: 'Strong response', scoreAdjustments: { csi: 2 }, insight: 'Trustee optics mandatory' },
      { id: 'c_boxedout_mild', label: 'Mild example', scoreAdjustments: { csi: 1 }, insight: 'Some sensitivity' },
      { id: 'c_boxedout_no', label: 'No', scoreAdjustments: {}, insight: 'No governance trauma' },
    ],
  },
  {
    id: 'c_roles',
    question: 'Does clarity around roles make delegation easier?',
    whatYouAreTesting: 'Oversight tolerance',
    listenFor: ['Relief', 'Resistance'],
    whatItTellsYou: 'Relief → reporting structures acceptable',
    profile: 'Control Sensitive Operator',
    checkItems: [
      { id: 'c_roles_relief', label: 'Relief', scoreAdjustments: {}, insight: 'Reporting structures acceptable' },
      { id: 'c_roles_resistance', label: 'Resistance', scoreAdjustments: { csi: 1 }, insight: 'Role clarity insufficient' },
      { id: 'c_roles_neutral', label: 'Neutral', scoreAdjustments: {}, insight: 'No strong preference' },
    ],
  },
];

// Profile D — Rational Maximizer (Low LAI · High SCS)
export const PROFILE_D_QUESTIONS: OrientationQuestion[] = [
  {
    id: 'd_frustrates',
    question: 'What frustrates you most in professional processes?',
    whatYouAreTesting: 'Patience threshold',
    listenFor: ['Inefficiency', 'Ambiguity', 'Over-explaining'],
    whatItTellsYou: 'Inefficiency → tight pacing required',
    profile: 'Rational Maximizer',
    checkItems: [
      { id: 'd_frustrates_inefficiency', label: 'Inefficiency', scoreAdjustments: { scs: 1 }, insight: 'Tight pacing required' },
      { id: 'd_frustrates_ambiguity', label: 'Ambiguity', scoreAdjustments: { scs: 1 }, insight: 'Clear logic needed' },
      { id: 'd_frustrates_overexplaining', label: 'Over-explaining', scoreAdjustments: { lai: -1 }, insight: 'Skip emotional framing' },
    ],
  },
  {
    id: 'd_logic',
    question: 'Do you prefer full logic first or to move forward and refine?',
    whatYouAreTesting: 'Decision sequencing',
    listenFor: [],
    whatItTellsYou: 'Determines presentation order',
    profile: 'Rational Maximizer',
    checkItems: [
      { id: 'd_logic_full', label: 'Full logic', scoreAdjustments: { scs: 1 }, insight: 'Complete analysis upfront' },
      { id: 'd_logic_iterate', label: 'Iterate', scoreAdjustments: {}, insight: 'Comfortable with progressive disclosure' },
    ],
  },
  {
    id: 'd_waste',
    question: 'What would make this a waste of time?',
    whatYouAreTesting: 'Deal-kill criteria',
    listenFor: ['Fluff', 'Redundancy', 'Lack of rigor'],
    whatItTellsYou: 'Any checked → proof-first approach',
    profile: 'Rational Maximizer',
    note: 'Any checked → proof-first approach',
    checkItems: [
      { id: 'd_waste_fluff', label: 'Fluff', scoreAdjustments: {}, insight: 'Proof-first approach' },
      { id: 'd_waste_repetition', label: 'Repetition', scoreAdjustments: {}, insight: 'Proof-first approach' },
      { id: 'd_waste_rigor', label: 'Lack of rigor', scoreAdjustments: { scs: 1 }, insight: 'Proof-first approach' },
    ],
  },
  {
    id: 'd_pressuretest',
    question: 'How do you pressure-test decisions like this?',
    whatYouAreTesting: 'Proof preference',
    listenFor: [],
    whatItTellsYou: 'Determines asset emphasis later',
    profile: 'Rational Maximizer',
    checkItems: [
      { id: 'd_pressuretest_math', label: 'Math', scoreAdjustments: { scs: 1, pfi: 1 }, insight: 'Quantitative assets emphasis' },
      { id: 'd_pressuretest_authority', label: 'Authority', scoreAdjustments: { adi: 1 }, insight: 'Expert validation emphasis' },
      { id: 'd_pressuretest_cases', label: 'Case examples', scoreAdjustments: {}, insight: 'Precedent emphasis' },
    ],
  },
];

// Profile E — Legacy Builder / Inheritor
export const PROFILE_E_QUESTIONS: OrientationQuestion[] = [
  {
    id: 'e_worries',
    question: 'Assets or relationships — which worries you more long-term?',
    whatYouAreTesting: 'Core value',
    listenFor: [],
    whatItTellsYou: 'Relationships → governance weighted heavier',
    profile: 'Legacy Builder',
    checkItems: [
      { id: 'e_worries_assets', label: 'Assets', scoreAdjustments: { scs: 1 }, insight: 'Structure-focused' },
      { id: 'e_worries_relationships', label: 'Relationships', scoreAdjustments: { csi: 1 }, insight: 'Governance weighted heavier' },
    ],
  },
  {
    id: 'e_inheritance',
    question: 'Have you seen inheritance cause problems?',
    whatYouAreTesting: 'Fear origin',
    listenFor: ['Family example', 'External example'],
    whatItTellsYou: 'Family example → high sensitivity',
    profile: 'Legacy Builder',
    checkItems: [
      { id: 'e_inheritance_family', label: 'Family example', scoreAdjustments: { lai: 2, isi: 1 }, insight: 'High sensitivity' },
      { id: 'e_inheritance_external', label: 'External example', scoreAdjustments: { lai: 1 }, insight: 'Aware of risks' },
      { id: 'e_inheritance_no', label: 'No', scoreAdjustments: {}, insight: 'No direct experience' },
    ],
  },
  {
    id: 'e_framing',
    question: 'Does this feel more about protection or responsibility?',
    whatYouAreTesting: 'Framing language',
    listenFor: [],
    whatItTellsYou: 'Mirror language later',
    profile: 'Legacy Builder',
    checkItems: [
      { id: 'e_framing_protection', label: 'Protection', scoreAdjustments: { lai: 1 }, insight: 'Mirror protection language' },
      { id: 'e_framing_responsibility', label: 'Responsibility', scoreAdjustments: { csi: 1 }, insight: 'Mirror stewardship language' },
    ],
  },
  {
    id: 'e_governance',
    question: 'Would you rather build something flexible or firm?',
    whatYouAreTesting: 'Governance posture',
    listenFor: [],
    whatItTellsYou: 'Hesitation → hybrid governance required',
    profile: 'Legacy Builder',
    note: 'Hesitation → hybrid governance required',
    checkItems: [
      { id: 'e_governance_flexible', label: 'Flexible', scoreAdjustments: { isi: 1 }, insight: 'Exit options important' },
      { id: 'e_governance_firm', label: 'Firm', scoreAdjustments: { scs: 1 }, insight: 'Permanence acceptable' },
    ],
  },
];

// Profile F — Asset-Rich, Cash-Constrained Landowner
export const PROFILE_F_QUESTIONS: OrientationQuestion[] = [
  {
    id: 'f_tighter',
    question: 'What feels tighter: cash flow or flexibility?',
    whatYouAreTesting: 'Pressure point',
    listenFor: [],
    whatItTellsYou: 'Cash flow → phased build required',
    profile: 'Asset Rich Cash Constrained Landowner',
    checkItems: [
      { id: 'f_tighter_cashflow', label: 'Cash flow', scoreAdjustments: { pfi: 2 }, insight: 'Phased build required' },
      { id: 'f_tighter_flexibility', label: 'Flexibility', scoreAdjustments: { isi: 1 }, insight: 'Options important' },
    ],
  },
  {
    id: 'f_delayed',
    question: 'Have you delayed decisions because timing didn\'t feel right?',
    whatYouAreTesting: 'Staging openness',
    listenFor: [],
    whatItTellsYou: 'Yes → pilot-first path appropriate',
    profile: 'Asset Rich Cash Constrained Landowner',
    checkItems: [
      { id: 'f_delayed_yes', label: 'Yes', scoreAdjustments: {}, insight: 'Pilot-first path appropriate' },
      { id: 'f_delayed_no', label: 'No', scoreAdjustments: {}, insight: 'Direct approach OK' },
    ],
  },
  {
    id: 'f_unrealistic',
    question: 'What would feel unrealistic here?',
    whatYouAreTesting: 'Overbuild risk',
    listenFor: [],
    whatItTellsYou: 'Any checked → minimal starting structure',
    profile: 'Asset Rich Cash Constrained Landowner',
    note: 'Any checked → minimal starting structure',
    checkItems: [
      { id: 'f_unrealistic_cost', label: 'Cost', scoreAdjustments: { pfi: 1 }, insight: 'Minimal starting structure' },
      { id: 'f_unrealistic_complexity', label: 'Complexity', scoreAdjustments: { scs: -1 }, insight: 'Minimal starting structure' },
      { id: 'f_unrealistic_burden', label: 'Ongoing burden', scoreAdjustments: { pfi: 1 }, insight: 'Minimal starting structure' },
    ],
  },
  {
    id: 'f_change',
    question: 'Incremental change or big shift?',
    whatYouAreTesting: 'Implementation style',
    listenFor: [],
    whatItTellsYou: 'Determines sequencing',
    profile: 'Asset Rich Cash Constrained Landowner',
    checkItems: [
      { id: 'f_change_incremental', label: 'Incremental', scoreAdjustments: { isi: 1 }, insight: 'Staged sequencing' },
      { id: 'f_change_bigshift', label: 'Big shift', scoreAdjustments: { scs: 1 }, insight: 'Comprehensive approach OK' },
    ],
  },
];

// Profile G — Institutional / Investment Firm
export const PROFILE_G_QUESTIONS: OrientationQuestion[] = [
  {
    id: 'g_evaluated',
    question: 'How are decisions evaluated internally?',
    whatYouAreTesting: 'Process maturity',
    listenFor: [],
    whatItTellsYou: 'Formal → documentation heavy',
    profile: 'Institutional or Investment Firm',
    checkItems: [
      { id: 'g_evaluated_committee', label: 'Formal committee', scoreAdjustments: { adi: 2 }, insight: 'Documentation heavy' },
      { id: 'g_evaluated_consensus', label: 'Informal consensus', scoreAdjustments: { adi: 1 }, insight: 'Moderate documentation' },
      { id: 'g_evaluated_single', label: 'Single decision maker', scoreAdjustments: {}, insight: 'Simpler process' },
    ],
  },
  {
    id: 'g_documentation',
    question: 'What documentation must exist before moving forward?',
    whatYouAreTesting: 'Authority mechanics',
    listenFor: [],
    whatItTellsYou: 'Determines asset prep order',
    profile: 'Institutional or Investment Firm',
    checkItems: [
      { id: 'g_documentation_legal', label: 'Legal memo', scoreAdjustments: { adi: 1 }, insight: 'Legal asset prep' },
      { id: 'g_documentation_compliance', label: 'Compliance review', scoreAdjustments: { aeti: 1 }, insight: 'Compliance asset prep' },
      { id: 'g_documentation_external', label: 'External opinion', scoreAdjustments: { adi: 1 }, insight: 'Third-party validation' },
    ],
  },
  {
    id: 'g_stall',
    question: 'Where do deals usually stall?',
    whatYouAreTesting: 'Process bottlenecks',
    listenFor: [],
    whatItTellsYou: 'Maps delay risk',
    profile: 'Institutional or Investment Firm',
    checkItems: [
      { id: 'g_stall_committee', label: 'Committee', scoreAdjustments: { adi: 1 }, insight: 'Committee delay risk' },
      { id: 'g_stall_counsel', label: 'Counsel', scoreAdjustments: { adi: 1 }, insight: 'Legal delay risk' },
      { id: 'g_stall_risk', label: 'Risk review', scoreAdjustments: { aeti: 1 }, insight: 'Risk review delay' },
    ],
  },
  {
    id: 'g_nonstandard',
    question: 'What feels non-standard here?',
    whatYouAreTesting: 'Innovation tolerance',
    listenFor: [],
    whatItTellsYou: 'Any checked → conservative framing required',
    profile: 'Institutional or Investment Firm',
    note: 'Any checked → conservative framing required',
    checkItems: [
      { id: 'g_nonstandard_structure', label: 'Structure', scoreAdjustments: { scs: 1 }, insight: 'Conservative framing required' },
      { id: 'g_nonstandard_tax', label: 'Tax posture', scoreAdjustments: { aeti: 1 }, insight: 'Conservative framing required' },
      { id: 'g_nonstandard_governance', label: 'Governance model', scoreAdjustments: { csi: 1 }, insight: 'Conservative framing required' },
    ],
  },
];

// Global Red Flags (All Profiles)
// Listen for these signals → Slow down. Never sell harder.
export const RED_FLAG_ITEMS: OrientationCheckItem[] = [
  { 
    id: 'rf_audit_embarrassment', 
    label: 'Repeated audit / embarrassment language', 
    scoreAdjustments: { aeti: 2, lai: 1 },
    insight: 'Slow down. Never sell harder.'
  },
  { 
    id: 'rf_authority_deflection', 
    label: 'Authority deflection', 
    scoreAdjustments: { adi: 2 },
    insight: 'Slow down. Never sell harder.'
  },
  { 
    id: 'rf_overconfidence', 
    label: 'Over-confidence without scrutiny', 
    scoreAdjustments: { lai: -2, aeti: 2 },
    insight: 'Slow down. Never sell harder.'
  },
  { 
    id: 'rf_discomfort_norec', 
    label: 'Discomfort with "no recommendations today"', 
    scoreAdjustments: { lai: 1, isi: 1 },
    insight: 'Slow down. Never sell harder.'
  },
];

// Helper to get profile-specific questions based on profile name
export function getProfileQuestions(profileName: string): OrientationQuestion[] {
  const profileMap: Record<string, OrientationQuestion[]> = {
    'Loss Averse Overpayer': PROFILE_A_QUESTIONS,
    'Authority Gated Optimizer': PROFILE_B_QUESTIONS,
    'Control Sensitive Operator': PROFILE_C_QUESTIONS,
    'Rational Maximizer': PROFILE_D_QUESTIONS,
    'Legacy Builder': PROFILE_E_QUESTIONS,
    'Asset Rich Cash Constrained Landowner': PROFILE_F_QUESTIONS,
    'Institutional or Investment Firm': PROFILE_G_QUESTIONS,
  };
  return profileMap[profileName] || [];
}

// All profile names for iteration
export const ALL_PROFILES = [
  'Loss Averse Overpayer',
  'Authority Gated Optimizer',
  'Control Sensitive Operator',
  'Rational Maximizer',
  'Legacy Builder',
  'Asset Rich Cash Constrained Landowner',
  'Institutional or Investment Firm',
];
