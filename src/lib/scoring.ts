// Trust Diagnostic Scoring Engine
// Maps assessment responses to index scores based on defined criteria
// Based on the Trust Sales and Structuring Diagnostic Framework

export interface AssessmentResponses {
  q1_situation: string[];
  q2_annual_income: string;
  q3_net_worth: string;
  q4_income_source: string;
  q5_tax_burden: string;
  q6_avoided_strategies: string;
  q7_mindset: string;
  q8_decision_style: string;
  q9_regret_pattern: string;
  q10_change_concern: string;
  q11_exit_comfort: string;
  q12_veto_power: string[];
  q13_blame_allocation: string;
  q14_audit_perception: string;
  q15_aggressiveness_concern: string;
  q16_control_importance: string;
  q17_trustee_acceptance: string;
  q18_holding_period: string;
  q19_existing_trusts: string;
  q20_intent: string;
  q21_fee_preference: string;
  q22_savings_share: string;
  q23_pricing_priority: string;
}

export interface ComputedScores {
  scs: number; // Structural Complexity Score (0-20+)
  lai: number; // Loss Aversion Index (0-11)
  isi: number; // Irreversibility Sensitivity Index (0-6)
  adi: number; // Authority Dependence Index (0-11)
  aeti: number; // Audit Emotional Tolerance Index (0-5)
  csi: number; // Control Sensitivity Index (0-5)
  pfi: number; // Pricing Flexibility Index (0-10)
}

export interface ProfileClassification {
  primary: string;
  secondary: string | null;
}

// ============================================================================
// INDEX 1: STRUCTURAL COMPLEXITY SCORE (SCS)
// Purpose: Determines depth of trust architecture required
// Questions: Q1 (asset types), Q2 (income), Q3 (net worth), Q18 (holding period)
// ============================================================================
export function calculateSCS(responses: AssessmentResponses): number {
  let score = 0;

  // Annual income scoring (Q2)
  const incomeMap: Record<string, number> = {
    'under_250k': 0,
    '250k_500k': 1,
    '500k_1m': 2,
    '1m_5m': 3,
    '5m_plus': 4,
  };
  score += incomeMap[responses.q2_annual_income] || 0;

  // Net worth scoring (Q3)
  const netWorthMap: Record<string, number> = {
    'under_1m': 0,
    '1m_5m': 1,
    '5m_15m': 2,
    '15m_50m': 3,
    '50m_plus': 4,
  };
  score += netWorthMap[responses.q3_net_worth] || 0;

  // Asset types from Q1 (select all that apply)
  // Per document: Operating business = 2, Farmer/land = 2, Real estate = 2, 
  // Investment firm/family office = 3, Liquidity event = 2
  const assetPoints: Record<string, number> = {
    'operating_business': 2,
    'farmer_landowner': 2,
    'real_estate_investor': 2,
    'investment_firm_family_office': 3,
    'liquidity_event': 2,
  };
  responses.q1_situation.forEach((situation) => {
    score += assetPoints[situation] || 0;
  });

  // Time horizon from Q18
  const timeHorizonMap: Record<string, number> = {
    'less_3_years': 0,
    '3_7_years': 1,
    '7_15_years': 2,
    'multi_generation': 3,
  };
  score += timeHorizonMap[responses.q18_holding_period] || 0;

  return score;
}

// ============================================================================
// INDEX 2: LOSS AVERSION INDEX (LAI)
// Purpose: Measures fear of making mistakes versus missing opportunity
// Questions: Q6, Q7, Q8, Q9
// Max score: 11
// ============================================================================
export function calculateLAI(responses: AssessmentResponses): number {
  let score = 0;

  // Q6: Avoided tax strategies due to risk (Yes = 3, Not sure = 1, No = 0)
  if (responses.q6_avoided_strategies === 'yes') score += 3;
  else if (responses.q6_avoided_strategies === 'not_sure') score += 1;

  // Q8: Decision under 95/5 scenario (Avoid = 3, Delay = 2, Reduce downside = 1, Proceed = 0)
  const decisionMap: Record<string, number> = {
    'avoid': 3,
    'delay': 2,
    'reduce_downside': 1,
    'proceed': 0,
  };
  score += decisionMap[responses.q8_decision_style] || 0;

  // Q9: Regret pattern (Regret mistakes more = 3, Regret missed opportunities = 0)
  if (responses.q9_regret_pattern === 'mistakes') score += 3;

  // Q7: Mindset (Prefer certainty = 2, Prefer optimization = 1, Comfortable complexity = 0)
  const mindsetMap: Record<string, number> = {
    'prefer_certainty': 2,
    'prefer_optimization': 1,
    'comfortable_complexity': 0,
  };
  score += mindsetMap[responses.q7_mindset] || 0;

  return score;
}

// ============================================================================
// INDEX 3: IRREVERSIBILITY SENSITIVITY INDEX (ISI)
// Purpose: Determines need for pilots, exit ramps, and reversibility framing
// Questions: Q10, Q11
// Max score: 6
// ============================================================================
export function calculateISI(responses: AssessmentResponses): number {
  let score = 0;

  // Q10: Change concern (Hard to unwind = 3, Staying suboptimal = 0)
  if (responses.q10_change_concern === 'hard_to_unwind') score += 3;

  // Q11: Exit ramp comfort change (Yes significantly = 3, Somewhat = 1, No = 0)
  const exitMap: Record<string, number> = {
    'yes_significantly': 3,
    'somewhat': 1,
    'no': 0,
  };
  score += exitMap[responses.q11_exit_comfort] || 0;

  return score;
}

// ============================================================================
// INDEX 4: AUTHORITY DEPENDENCE INDEX (ADI)
// Purpose: Identifies advisor or committee gating
// Questions: Q12, Q13
// Max score: 11 (if CPA + Attorney + Board all selected = 9, plus blame = 2)
// ============================================================================
export function calculateADI(responses: AssessmentResponses): number {
  let score = 0;

  // Q12: Veto power (CPA = 3, Attorney = 3, Board/partner = 3, Self = 0, No single = 1)
  const vetoPoints: Record<string, number> = {
    'cpa': 3,
    'attorney': 3,
    'board_partner': 3,
    'self': 0,
    'no_single': 1,
  };
  responses.q12_veto_power.forEach((veto) => {
    score += vetoPoints[veto] || 0;
  });

  // Q13: Blame allocation (Prefer relying on professionals = 2, Personal decision = 0)
  if (responses.q13_blame_allocation === 'professional_advice') score += 2;

  return score;
}

// ============================================================================
// INDEX 5: AUDIT EMOTIONAL TOLERANCE INDEX (AETI)
// Purpose: Determines audit framing intensity
// Questions: Q14, Q15
// Max score: 5
// ============================================================================
export function calculateAETI(responses: AssessmentResponses): number {
  let score = 0;

  // Q14: Audit perception (Personal failure = 3, Serious distraction = 2, 
  // Administrative process = 1, Expected cost = 0)
  const auditMap: Record<string, number> = {
    'personal_failure': 3,
    'serious_distraction': 2,
    'administrative_process': 1,
    'expected_cost': 0,
  };
  score += auditMap[responses.q14_audit_perception] || 0;

  // Q15: Aggressiveness concern (Very = 2, Somewhat = 1, Not = 0)
  const aggressivenessMap: Record<string, number> = {
    'very_concerned': 2,
    'somewhat_concerned': 1,
    'not_concerned': 0,
  };
  score += aggressivenessMap[responses.q15_aggressiveness_concern] || 0;

  return score;
}

// ============================================================================
// INDEX 6: CONTROL SENSITIVITY INDEX (CSI)
// Purpose: Guides governance and trustee optics
// Questions: Q16, Q17
// Max score: 5
// ============================================================================
export function calculateCSI(responses: AssessmentResponses): number {
  let score = 0;

  // Q16: Visible control importance (Extremely = 3, Important but flexible = 1, Not important = 0)
  const controlMap: Record<string, number> = {
    'extremely_important': 3,
    'important_flexible': 1,
    'not_important': 0,
  };
  score += controlMap[responses.q16_control_importance] || 0;

  // Q17: Trustee acceptance (No = 2, Possibly = 1, Yes = 0)
  const trusteeMap: Record<string, number> = {
    'no': 2,
    'possibly': 1,
    'yes': 0,
  };
  score += trusteeMap[responses.q17_trustee_acceptance] || 0;

  return score;
}

// ============================================================================
// INDEX 7: PRICING FLEXIBILITY INDEX (PFI)
// Purpose: Determines optimal compensation model
// Questions: Q5, Q21, Q22, Q23
// Max score: 10
// ============================================================================
export function calculatePFI(responses: AssessmentResponses): number {
  let score = 0;

  // Q5: Tax pain (Acceptable = 0, Frustrating = 1, Limiting growth = 2, Actively painful = 3)
  const taxPainMap: Record<string, number> = {
    'acceptable': 0,
    'frustrating': 1,
    'limiting_growth': 2,
    'actively_painful': 3,
  };
  score += taxPainMap[responses.q5_tax_burden] || 0;

  // Q21: Fee preference (Upfront fixed = 0, Annual retainer = 1, 
  // Lower upfront + savings = 2, Performance only = 3, Combination = 2)
  const feeMap: Record<string, number> = {
    'upfront_fixed': 0,
    'annual_retainer': 1,
    'lower_upfront_savings': 2,
    'performance_only': 3,
    'combination': 2,
  };
  score += feeMap[responses.q21_fee_preference] || 0;

  // Q22: Savings share openness (Yes = 2, Maybe = 1, No = 0)
  const savingsMap: Record<string, number> = {
    'yes': 2,
    'maybe': 1,
    'no': 0,
  };
  score += savingsMap[responses.q22_savings_share] || 0;

  // Q23: Pricing priority (Minimize upfront = 2, Align incentives = 2, 
  // Predictable expenses = 1, Pay only if works = 2)
  const priorityMap: Record<string, number> = {
    'minimize_upfront': 2,
    'align_incentives': 2,
    'predictable_expenses': 1,
    'pay_if_works': 2,
  };
  score += priorityMap[responses.q23_pricing_priority] || 0;

  return score;
}

// Calculate all scores
export function calculateAllScores(responses: AssessmentResponses): ComputedScores {
  return {
    scs: calculateSCS(responses),
    lai: calculateLAI(responses),
    isi: calculateISI(responses),
    adi: calculateADI(responses),
    aeti: calculateAETI(responses),
    csi: calculateCSI(responses),
    pfi: calculatePFI(responses),
  };
}

// ============================================================================
// PROFILE CLASSIFICATION
// Based on document thresholds - ALWAYS assigns primary AND secondary profiles
// ============================================================================

interface ProfileMatch {
  name: string;
  score: number; // Higher = stronger match
  thresholdsMet: string[];
}

export function classifyProfile(scores: ComputedScores, responses: AssessmentResponses): ProfileClassification {
  const profileMatches: ProfileMatch[] = [];

  // Profile A: Loss Averse Overpayer
  // Thresholds: LAI >= 8, ISI >= 4, AETI >= 4
  {
    const thresholds: string[] = [];
    let matchScore = 0;
    if (scores.lai >= 8) { thresholds.push('LAI ≥ 8'); matchScore += 3; }
    else if (scores.lai >= 6) { matchScore += 1; }
    if (scores.isi >= 4) { thresholds.push('ISI ≥ 4'); matchScore += 2; }
    else if (scores.isi >= 3) { matchScore += 1; }
    if (scores.aeti >= 4) { thresholds.push('AETI ≥ 4'); matchScore += 2; }
    else if (scores.aeti >= 3) { matchScore += 1; }
    
    if (thresholds.length >= 2 || matchScore >= 4) {
      profileMatches.push({ name: 'Loss Averse Overpayer', score: matchScore, thresholdsMet: thresholds });
    }
  }

  // Profile B: Authority Gated Optimizer
  // Thresholds: ADI >= 5, LAI 4-7
  {
    const thresholds: string[] = [];
    let matchScore = 0;
    if (scores.adi >= 5) { thresholds.push('ADI ≥ 5'); matchScore += 3; }
    else if (scores.adi >= 3) { matchScore += 1; }
    if (scores.lai >= 4 && scores.lai <= 7) { thresholds.push('LAI 4-7'); matchScore += 2; }
    else if (scores.lai >= 3) { matchScore += 1; }
    
    if (thresholds.length >= 1 || matchScore >= 3) {
      profileMatches.push({ name: 'Authority Gated Optimizer', score: matchScore, thresholdsMet: thresholds });
    }
  }

  // Profile C: Control Sensitive Operator
  // Thresholds: CSI >= 4, SCS >= 5
  {
    const thresholds: string[] = [];
    let matchScore = 0;
    if (scores.csi >= 4) { thresholds.push('CSI ≥ 4'); matchScore += 3; }
    else if (scores.csi >= 3) { matchScore += 2; }
    else if (scores.csi >= 2) { matchScore += 1; }
    if (scores.scs >= 5) { thresholds.push('SCS ≥ 5'); matchScore += 2; }
    else if (scores.scs >= 3) { matchScore += 1; }
    
    if (thresholds.length >= 1 || matchScore >= 3) {
      profileMatches.push({ name: 'Control Sensitive Operator', score: matchScore, thresholdsMet: thresholds });
    }
  }

  // Profile D: Rational Maximizer
  // Thresholds: LAI <= 3, AETI <= 2, SCS >= 8
  {
    const thresholds: string[] = [];
    let matchScore = 0;
    if (scores.lai <= 3) { thresholds.push('LAI ≤ 3'); matchScore += 3; }
    else if (scores.lai <= 5) { matchScore += 1; }
    if (scores.aeti <= 2) { thresholds.push('AETI ≤ 2'); matchScore += 2; }
    else if (scores.aeti <= 3) { matchScore += 1; }
    if (scores.scs >= 8) { thresholds.push('SCS ≥ 8'); matchScore += 2; }
    else if (scores.scs >= 5) { matchScore += 1; }
    
    if (thresholds.length >= 2 || matchScore >= 4) {
      profileMatches.push({ name: 'Rational Maximizer', score: matchScore, thresholdsMet: thresholds });
    }
  }

  // Profile E: Legacy Builder or Inheritor
  // Thresholds: Multi-generation horizon, Net worth >= 5M, CSI moderate to high
  {
    const thresholds: string[] = [];
    let matchScore = 0;
    const isMultiGen = responses.q18_holding_period === 'multi_generation';
    const isLongHorizon = responses.q18_holding_period === '7_15_years';
    const isHighNetWorth = ['5m_15m', '15m_50m', '50m_plus'].includes(responses.q3_net_worth);
    const hasInheritance = responses.q1_situation.includes('inheriting_assets');
    
    if (isMultiGen) { thresholds.push('Multi-generation'); matchScore += 3; }
    else if (isLongHorizon) { matchScore += 2; }
    if (isHighNetWorth) { thresholds.push('Net worth ≥ 5M'); matchScore += 2; }
    if (scores.csi >= 2) { thresholds.push('CSI moderate+'); matchScore += 1; }
    if (hasInheritance) { matchScore += 2; }
    
    if (thresholds.length >= 2 || matchScore >= 4) {
      profileMatches.push({ name: 'Legacy Builder', score: matchScore, thresholdsMet: thresholds });
    }
  }

  // Profile F: Asset Rich Cash Constrained Landowner
  // Thresholds: Farmer/land owner, Moderate income, High net worth, PFI <= 6
  {
    const thresholds: string[] = [];
    let matchScore = 0;
    const isFarmer = responses.q1_situation.includes('farmer_landowner');
    const isModerateIncome = ['under_250k', '250k_500k', '500k_1m'].includes(responses.q2_annual_income);
    const isHighNetWorth = ['5m_15m', '15m_50m', '50m_plus'].includes(responses.q3_net_worth);
    
    if (isFarmer) { thresholds.push('Farmer/landowner'); matchScore += 3; }
    if (isModerateIncome) { thresholds.push('Moderate income'); matchScore += 1; }
    if (isHighNetWorth) { thresholds.push('High net worth'); matchScore += 2; }
    if (scores.pfi <= 6) { thresholds.push('PFI ≤ 6'); matchScore += 1; }
    
    if (isFarmer && matchScore >= 4) {
      profileMatches.push({ name: 'Asset Rich Cash Constrained Landowner', score: matchScore, thresholdsMet: thresholds });
    }
  }

  // Profile G: Institutional or Investment Firm
  // Thresholds: Investment firm/family office, ADI >= 5, AETI low
  {
    const thresholds: string[] = [];
    let matchScore = 0;
    const isInstitutional = responses.q1_situation.includes('investment_firm_family_office');
    
    if (isInstitutional) { thresholds.push('Investment firm/family office'); matchScore += 3; }
    if (scores.adi >= 5) { thresholds.push('ADI ≥ 5'); matchScore += 2; }
    else if (scores.adi >= 3) { matchScore += 1; }
    if (scores.aeti <= 2) { thresholds.push('AETI ≤ 2'); matchScore += 2; }
    else if (scores.aeti <= 3) { matchScore += 1; }
    
    if (isInstitutional && matchScore >= 4) {
      profileMatches.push({ name: 'Institutional or Investment Firm', score: matchScore, thresholdsMet: thresholds });
    }
  }

  // Sort by match score descending
  profileMatches.sort((a, b) => b.score - a.score);

  // If we have matches, use top 2
  if (profileMatches.length >= 2) {
    return {
      primary: profileMatches[0].name,
      secondary: profileMatches[1].name,
    };
  } else if (profileMatches.length === 1) {
    // Assign a secondary based on next best indicators
    const fallbackSecondary = determineFallbackSecondary(scores, responses, profileMatches[0].name);
    return {
      primary: profileMatches[0].name,
      secondary: fallbackSecondary,
    };
  } else {
    // No strong matches - determine based on highest indicators
    return determineDefaultProfiles(scores, responses);
  }
}

// Determine fallback secondary profile when only one primary matches
function determineFallbackSecondary(scores: ComputedScores, responses: AssessmentResponses, primary: string): string {
  // Map scores to likely secondary profiles
  if (primary !== 'Authority Gated Optimizer' && scores.adi >= 3) {
    return 'Authority Gated Optimizer';
  }
  if (primary !== 'Control Sensitive Operator' && scores.csi >= 2) {
    return 'Control Sensitive Operator';
  }
  if (primary !== 'Loss Averse Overpayer' && scores.lai >= 5) {
    return 'Loss Averse Overpayer';
  }
  if (primary !== 'Legacy Builder' && responses.q18_holding_period === 'multi_generation') {
    return 'Legacy Builder';
  }
  if (primary !== 'Rational Maximizer' && scores.lai <= 4 && scores.scs >= 5) {
    return 'Rational Maximizer';
  }
  
  // Default fallback
  return 'Control Sensitive Operator';
}

// Determine default profiles when no thresholds are met
function determineDefaultProfiles(scores: ComputedScores, responses: AssessmentResponses): ProfileClassification {
  // Determine primary based on highest relative scores
  let primary: string;
  let secondary: string;
  
  // Loss aversion is the most common driver
  if (scores.lai >= 5) {
    primary = 'Loss Averse Overpayer';
    secondary = scores.adi >= 3 ? 'Authority Gated Optimizer' : 'Control Sensitive Operator';
  } else if (scores.adi >= 4) {
    primary = 'Authority Gated Optimizer';
    secondary = scores.csi >= 2 ? 'Control Sensitive Operator' : 'Rational Maximizer';
  } else if (scores.csi >= 3) {
    primary = 'Control Sensitive Operator';
    secondary = scores.scs >= 5 ? 'Rational Maximizer' : 'Authority Gated Optimizer';
  } else if (scores.scs >= 6) {
    primary = 'Rational Maximizer';
    secondary = 'Control Sensitive Operator';
  } else {
    // Default for simpler cases
    primary = 'Control Sensitive Operator';
    secondary = 'Authority Gated Optimizer';
  }
  
  return { primary, secondary };
}

// ============================================================================
// INTERPRETATION BANDS
// ============================================================================

export interface InterpretationBand {
  level: 'low' | 'moderate' | 'high';
  label: string;
  description: string;
}

// SCS: 0-4 Simple, 5-8 Core, 9+ Advanced
export function getSCSInterpretation(score: number): InterpretationBand {
  if (score <= 4) return { level: 'low', label: 'Simple Planning', description: 'Basic trust structure, usually not a fit yet' };
  if (score <= 8) return { level: 'moderate', label: 'Core Trust Stack', description: 'Operating trust, reserve trust, beneficiary trust' };
  return { level: 'high', label: 'Advanced Architecture', description: 'Multiple trusts plus asset level and reporting trusts' };
}

// LAI: 0-3 Low, 4-7 Moderate, 8-11 High
export function getLAIInterpretation(score: number): InterpretationBand {
  if (score <= 3) return { level: 'low', label: 'Low Loss Aversion', description: 'Comfortable optimizing, open to risk' };
  if (score <= 7) return { level: 'moderate', label: 'Moderate Loss Aversion', description: 'Needs reassurance but open to options' };
  return { level: 'high', label: 'High Loss Aversion', description: 'Safety framing required, lead with risk containment' };
}

// ISI: 0-2 Low, 3-4 Moderate, 5-6 High
export function getISIInterpretation(score: number): InterpretationBand {
  if (score <= 2) return { level: 'low', label: 'Low Sensitivity', description: 'No pilot required, comfortable with commitment' };
  if (score <= 4) return { level: 'moderate', label: 'Moderate Sensitivity', description: 'Exit options should be mentioned' };
  return { level: 'high', label: 'High Sensitivity', description: 'Pilot and reversibility must be emphasized' };
}

// ADI: 0-2 Founder led, 3-4 Advisor influenced, 5+ Advisor gated
export function getADIInterpretation(score: number): InterpretationBand {
  if (score <= 2) return { level: 'low', label: 'Founder Led', description: 'Decision maker drives the process' };
  if (score <= 4) return { level: 'moderate', label: 'Advisor Influenced', description: 'Consider advisor alignment' };
  return { level: 'high', label: 'Advisor Gated', description: 'CPA-first approach, authority materials mandatory' };
}

// AETI: 0-2 High tolerance, 3-4 Moderate, 5 High sensitivity
export function getAETIInterpretation(score: number): InterpretationBand {
  if (score <= 2) return { level: 'low', label: 'High Tolerance', description: 'Views audits as normal cost of business' };
  if (score <= 4) return { level: 'moderate', label: 'Moderate Tolerance', description: 'Some concern, standard framing works' };
  return { level: 'high', label: 'High Sensitivity', description: 'Conservative language, emphasize audit normalization' };
}

// CSI: 0-1 Low, 2-3 Moderate, 4-5 High
export function getCSIInterpretation(score: number): InterpretationBand {
  if (score <= 1) return { level: 'low', label: 'Low Control Sensitivity', description: 'Flexible on governance structure' };
  if (score <= 3) return { level: 'moderate', label: 'Moderate Control Sensitivity', description: 'Consider control optics' };
  return { level: 'high', label: 'High Control Sensitivity', description: 'Governance and trustee framing critical' };
}

// PFI: 0-3 Fixed fee, 4-6 Hybrid, 7-10 Performance/residual
export function getPFIInterpretation(score: number): InterpretationBand {
  if (score <= 3) return { level: 'low', label: 'Fixed Fee Preferred', description: 'Lead with upfront fixed pricing' };
  if (score <= 6) return { level: 'moderate', label: 'Hybrid Pricing', description: 'Open to mixed fee structures' };
  return { level: 'high', label: 'Performance Friendly', description: 'Open to residual or performance-based models' };
}

export function getAllInterpretations(scores: ComputedScores) {
  return {
    scs: getSCSInterpretation(scores.scs),
    lai: getLAIInterpretation(scores.lai),
    isi: getISIInterpretation(scores.isi),
    adi: getADIInterpretation(scores.adi),
    aeti: getAETIInterpretation(scores.aeti),
    csi: getCSIInterpretation(scores.csi),
    pfi: getPFIInterpretation(scores.pfi),
  };
}

// ============================================================================
// INDEX METADATA FOR DISPLAY
// ============================================================================

export const INDEX_METADATA = {
  scs: {
    name: 'Structural Complexity Score',
    abbrev: 'SCS',
    description: 'How complex and durable the trust structure needs to be',
    maxScore: 20,
    purpose: 'Determines how many trusts to show in the first meeting and how complex the initial diagram should be',
  },
  lai: {
    name: 'Loss Aversion Index',
    abbrev: 'LAI',
    description: 'How strongly the prospect fears making a mistake vs missing opportunity',
    maxScore: 11,
    purpose: 'Determines whether we lead with upside or lead with risk containment and boundaries',
  },
  isi: {
    name: 'Irreversibility Sensitivity Index',
    abbrev: 'ISI',
    description: 'Fear of being locked into a structure that cannot be changed',
    maxScore: 6,
    purpose: 'Determines whether to propose a pilot structure, sunset clauses, or phased implementation',
  },
  adi: {
    name: 'Authority Dependence Index',
    abbrev: 'ADI',
    description: 'Whether decision is founder-led or gated by advisors',
    maxScore: 11,
    purpose: 'Determines whether the pitch must be CPA first and whether authority materials are mandatory',
  },
  aeti: {
    name: 'Audit Emotional Tolerance Index',
    abbrev: 'AETI',
    description: 'Emotional reaction to audits and reputational concerns',
    maxScore: 5,
    purpose: 'Determines how conservative the language must be and how much to emphasize audit normalization',
  },
  csi: {
    name: 'Control Sensitivity Index',
    abbrev: 'CSI',
    description: 'Need to remain visibly in control and discomfort with third-party governance',
    maxScore: 5,
    purpose: 'Determines how governance and trustee roles are framed and how much control optics matter',
  },
  pfi: {
    name: 'Pricing Flexibility Index',
    abbrev: 'PFI',
    description: 'Willingness to engage in residual or performance-based pricing',
    maxScore: 10,
    purpose: 'Determines whether to lead with fixed fees, hybrid pricing, or savings-based compensation',
  },
};

// ============================================================================
// PROFILE DETAILS - Exact from document
// ============================================================================

export interface ProfileDetail {
  description: string;
  meaning: string;
  approach: string[];
  assets: string[];
  pricing: string;
}

export const PROFILE_DETAILS: Record<string, ProfileDetail> = {
  'Loss Averse Overpayer': {
    description: 'Client fears mistakes more than cost and overpays for certainty.',
    meaning: 'High loss aversion, high irreversibility sensitivity, high audit sensitivity. Safety is the primary driver.',
    approach: [
      'Lead with "what this does NOT do"',
      'Frame audit as procedural not punitive',
      'Emphasize reversibility and pilot options',
      'Use conservative, measured language throughout',
    ],
    assets: [
      'One-page conservative explainer',
      'Exit ramp and decanting diagram',
      'Pilot trust architecture',
      'CPA-aligned memo',
    ],
    pricing: 'Higher upfront fixed fee with optional capped success bonus',
  },
  'Authority Gated Optimizer': {
    description: 'Client wants optimization but will not proceed without CPA or attorney comfort.',
    meaning: 'High authority dependence with moderate loss aversion. External validation is required.',
    approach: [
      'Lead with IRS-first legitimacy',
      'Prioritize CPA alignment and engagement',
      'Establish authority hierarchy clearly',
      'Provide materials for advisor review',
    ],
    assets: [
      'Tax code citations',
      'Case law summaries',
      'CPA briefing deck',
      'Opinion readiness checklist',
    ],
    pricing: 'Fixed upfront plus annual advisory retainer',
  },
  'Control Sensitive Operator': {
    description: 'Client cares deeply about optics and control while running complex assets.',
    meaning: 'High control sensitivity with meaningful structural complexity. Governance visibility matters.',
    approach: [
      'Emphasize governance optics',
      'Clearly separate ownership from control',
      'Frame trustee role carefully',
      'Show reporting trust diagrams',
    ],
    assets: [
      'Governance charts',
      'Control rights matrix',
      'Trustee role explainer',
      'Reporting trust diagram',
    ],
    pricing: 'Fixed upfront plus asset expansion fees',
  },
  'Rational Maximizer': {
    description: 'Client is comfortable with risk if authority and math are sound.',
    meaning: 'Low loss aversion, low audit sensitivity, high structural complexity. ROI-driven decision making.',
    approach: [
      'Lead with courtroom proof',
      'Present comprehensive risk ledger',
      'Use decision tree frameworks',
      'Show detailed ROI scenarios',
    ],
    assets: [
      'Case law pack',
      'ROI scenarios',
      'Detailed trust architecture map',
      'State tax analysis',
    ],
    pricing: 'Lower upfront plus percentage of measurable savings',
  },
  'Legacy Builder': {
    description: 'Client prioritizes continuity, governance, and family outcomes.',
    meaning: 'Multi-generation time horizon with high net worth. Family legacy is the primary focus.',
    approach: [
      'Use insurance analogy',
      'Emphasize fiduciary duty',
      'Frame around multi-generation impact',
      'Focus on family governance',
    ],
    assets: [
      'Dynasty trust visuals',
      'Family governance framework',
      'Beneficiary trust roadmap',
    ],
    pricing: 'Upfront planning fee plus family office style retainer',
  },
  'Asset Rich Cash Constrained Landowner': {
    description: 'Client needs protection and succession but has limited liquidity.',
    meaning: 'Farmer or landowner with high net worth but moderate income. Liquidity constraints affect implementation.',
    approach: [
      'Focus on asset protection',
      'Emphasize continuity and succession',
      'Frame around risk containment',
      'Propose phased implementation',
    ],
    assets: [
      'Land holding trust maps',
      'Succession visuals',
      'Creditor insulation explainer',
    ],
    pricing: 'Phased implementation with staged fees and minimal residuals',
  },
  'Institutional or Investment Firm': {
    description: 'Committee-driven, technically rigorous buyer.',
    meaning: 'Investment firm or family office with high authority dependence but high audit tolerance. Compliance and scalability matter.',
    approach: [
      'Lead with risk containment',
      'Provide authority proof documentation',
      'Emphasize scalability',
      'Prepare for committee review process',
    ],
    assets: [
      'Technical memo',
      'Compliance mapping',
      'Structural diagrams',
    ],
    pricing: 'Project-based fees plus compliance retainer',
  },
};

// ============================================================================
// HOW ALL INDEXES WORK TOGETHER (from document)
// ============================================================================

export const INDEX_USAGE_SUMMARY = {
  scs: 'Determines how complex the structure should be',
  lai: 'Determines how cautious the pitch must be',
  isi: 'Determines how cautious the pitch must be',
  adi: 'Determines who must be convinced',
  aeti: 'Determines audit framing intensity',
  csi: 'Determines governance optics',
  pfi: 'Determines pricing model',
};

export const OUTCOME_QUESTIONS = [
  'What to build (SCS)',
  'How to explain it (LAI, ISI)',
  'Who to convince (ADI)',
  'How fast to move (readiness signals)',
  'How to get paid (PFI)',
];

// ============================================================================
// MEETING RECOMMENDATIONS - Based on Internal Meeting Decision Tree
// ============================================================================

export interface MeetingFlags {
  authorityGate: boolean; // ADI >= 3
  highFear: boolean; // LAI >= 8 OR AETI >= 4
  irreversibilitySensitive: boolean; // ISI >= 5
  complexBuild: boolean; // SCS >= 9
}

export interface Meeting {
  id: string;
  name: string;
  duration: string;
  purpose: string[];
  doNot?: string[];
  assets: string[];
  whoAttends?: string;
  isRequired: boolean;
  gateCondition?: string;
}

export interface MeetingRecommendation {
  flags: MeetingFlags;
  totalMeetings: number;
  meetingPath: string;
  meetings: Meeting[];
  structureTier: 'Minimal' | 'Core Trust Stack' | 'Advanced Multi-Trust';
  emphasis: string[];
  pricingModel: string;
  implementationPath: 'Pilot' | 'Phased implementation' | 'Full architecture';
}

export function calculateMeetingFlags(scores: ComputedScores): MeetingFlags {
  return {
    authorityGate: scores.adi >= 3,
    highFear: scores.lai >= 8 || scores.aeti >= 4,
    irreversibilitySensitive: scores.isi >= 5,
    complexBuild: scores.scs >= 9,
  };
}

export function getMeetingRecommendations(scores: ComputedScores): MeetingRecommendation {
  const flags = calculateMeetingFlags(scores);
  const meetings: Meeting[] = [];

  // MEETING 1 — Orientation & Safety (Always happens)
  meetings.push({
    id: 'meeting_1',
    name: 'Meeting 1: Orientation & Safety',
    duration: '30–45 min',
    purpose: [
      'Establish safety',
      'Define boundaries',
      'Confirm authority map',
      'Set pace',
    ],
    doNot: [
      'Show trust diagrams',
      'Discuss tax savings',
      'Talk pricing',
    ],
    assets: [],
    isRequired: true,
  });

  // MEETING 2A — Authority Alignment (Only if ADI >= 3)
  if (flags.authorityGate) {
    meetings.push({
      id: 'meeting_2a',
      name: 'Meeting 2A: Authority Alignment',
      duration: '30–45 min',
      purpose: [
        'Remove veto power',
        'Normalize audit & compliance',
        'Establish legitimacy',
      ],
      assets: [
        'Authority Legitimacy Pack',
        'Code & case law citations',
        '"What this does NOT do" memo',
        'Audit framing materials',
        'Opinion-Readiness Checklist',
      ],
      whoAttends: 'CPA / attorney / board (with or without client)',
      isRequired: true,
      gateCondition: 'ADI ≥ 3 (Authority Gate)',
    });
  }

  // Determine structure tier based on SCS
  let structureTier: 'Minimal' | 'Core Trust Stack' | 'Advanced Multi-Trust';
  if (scores.scs <= 4) {
    structureTier = 'Minimal';
  } else if (scores.scs <= 8) {
    structureTier = 'Core Trust Stack';
  } else {
    structureTier = 'Advanced Multi-Trust';
  }

  // Build emphasis based on scores
  const emphasis: string[] = [];
  if (scores.lai >= 6) emphasis.push('Risk containment and boundaries (High LAI)');
  if (scores.isi >= 4) emphasis.push('Pilot + exit ramps (High ISI)');
  if (scores.csi >= 3) emphasis.push('Control optics & governance (High CSI)');
  if (scores.aeti >= 3) emphasis.push('Conservative language (High AETI)');

  // Meeting 2B assets based on scores
  const meeting2BAssets: string[] = [
    'Structure Tier Diagram (ONE PAGE)',
  ];
  if (scores.lai >= 4 || scores.aeti >= 3) {
    meeting2BAssets.push('"What This Does / What This Does Not Do" One-Pager');
  }
  if (scores.isi >= 3) {
    meeting2BAssets.push('Exit Ramp & Reversibility Diagram');
  }

  // MEETING 2B — Conceptual Architecture Preview (Always happens)
  meetings.push({
    id: 'meeting_2b',
    name: 'Meeting 2B: Conceptual Architecture Preview',
    duration: '45–60 min',
    purpose: [
      `Present ${structureTier} structure level`,
      ...emphasis,
    ],
    doNot: [
      'Show final architecture',
      'Name trusts',
      'Lock pricing',
    ],
    assets: meeting2BAssets,
    isRequired: true,
  });

  // MEETING 3A — Risk Ledger & Pilot Review (Only if LAI >= 8 OR ISI >= 5)
  if (flags.highFear || flags.irreversibilitySensitive) {
    const meeting3AAssets: string[] = [
      'Risk Ledger (Stay as-is / Partial change / Full implementation)',
    ];
    if (scores.isi >= 4 || scores.lai >= 8) {
      meeting3AAssets.push('Pilot vs Full Implementation Comparison');
    }

    meetings.push({
      id: 'meeting_3a',
      name: 'Meeting 3A: Risk Ledger & Pilot Review',
      duration: '30–45 min',
      purpose: [
        'Make inaction feel riskier than action — without pressure',
        'Address legal, tax, governance, and emotional/regret risk',
        'Enable movement without full commitment',
      ],
      assets: meeting3AAssets,
      isRequired: true,
      gateCondition: 'LAI ≥ 8 OR ISI ≥ 5 (Fear & Reversibility Gate)',
    });
  }

  // Determine pricing model based on PFI
  let pricingModel: string;
  if (scores.pfi <= 3) {
    pricingModel = 'Fixed upfront fee';
  } else if (scores.pfi <= 6) {
    pricingModel = 'Hybrid (fixed + performance component)';
  } else {
    pricingModel = 'Performance-linked / residual model';
  }

  // Determine implementation path
  let implementationPath: 'Pilot' | 'Phased implementation' | 'Full architecture';
  if (scores.isi >= 5 || scores.lai >= 8) {
    implementationPath = 'Pilot';
  } else if (scores.isi >= 3 || flags.complexBuild) {
    implementationPath = 'Phased implementation';
  } else {
    implementationPath = 'Full architecture';
  }

  // FINAL MEETING — Architecture + Decision (Always last)
  meetings.push({
    id: 'meeting_final',
    name: 'Final Meeting: Architecture + Decision',
    duration: '60 min',
    purpose: [
      'Present tailored trust architecture',
      `Review pricing aligned with PFI (${pricingModel})`,
      'Confirm implementation timeline',
      'Decision should already feel made — this is NOT a hard close',
    ],
    assets: [
      'Final Trust Architecture Diagram',
      'Decision Brief',
      'Pricing Model Alignment Page',
    ],
    isRequired: true,
  });

  // Calculate total meetings
  const totalMeetings = meetings.length;

  // Determine meeting path description
  let meetingPath: string;
  if (totalMeetings <= 3) {
    meetingPath = 'Low fear, founder-led';
  } else if (totalMeetings === 4) {
    meetingPath = 'Advisor-gated or fear-heavy';
  } else {
    meetingPath = 'Institutional / extreme complexity';
  }

  return {
    flags,
    totalMeetings,
    meetingPath,
    meetings,
    structureTier,
    emphasis,
    pricingModel,
    implementationPath,
  };
}

// ============================================================================
// MASTER ASSET LIST - By Meeting & Psychological Job
// ============================================================================

export interface AssetRecommendation {
  name: string;
  firstAllowedMeeting: string;
  purpose: string;
  psychologicalJob: string;
  condition?: string;
}

export function getAssetRecommendations(scores: ComputedScores): AssetRecommendation[] {
  const assets: AssetRecommendation[] = [];

  // Meeting 2 Assets
  assets.push({
    name: 'Structure Tier Diagram',
    firstAllowedMeeting: 'Meeting 2B',
    purpose: 'Category clarity',
    psychologicalJob: '"I\'m not being shoved into the deep end." "There are multiple safe paths."',
  });

  if (scores.lai >= 4 || scores.aeti >= 3) {
    assets.push({
      name: '"What This Does / What This Does Not Do" One-Pager',
      firstAllowedMeeting: 'Meeting 2B',
      purpose: 'Fear reduction',
      psychologicalJob: 'Reduces fear of being tricked. Signals conservatism and restraint.',
      condition: 'LAI ≥ 4 or AETI ≥ 3',
    });
  }

  if (scores.isi >= 3) {
    assets.push({
      name: 'Exit Ramp & Reversibility Diagram',
      firstAllowedMeeting: 'Meeting 2B',
      purpose: 'Irreversibility relief',
      psychologicalJob: '"I\'m not locked in." "I can stop without embarrassment."',
      condition: 'ISI ≥ 3',
    });
  }

  // Meeting 2A Assets (Authority)
  if (scores.adi >= 3) {
    assets.push({
      name: 'Authority Legitimacy Pack',
      firstAllowedMeeting: 'Meeting 2A',
      purpose: 'Remove veto power',
      psychologicalJob: 'Transfer perceived risk away from client. Make "no" harder than "yes" for advisors.',
      condition: 'ADI ≥ 3',
    });

    assets.push({
      name: 'Opinion-Readiness Checklist',
      firstAllowedMeeting: 'Meeting 2A',
      purpose: 'Professional legitimacy',
      psychologicalJob: 'Signals seriousness. Shows you expect scrutiny. Defuses "this feels informal" objections.',
      condition: 'ADI ≥ 3',
    });
  }

  // Meeting 3 Assets
  if (scores.lai >= 8 || scores.isi >= 5 || scores.aeti >= 4) {
    assets.push({
      name: 'Risk Ledger',
      firstAllowedMeeting: 'Meeting 3A',
      purpose: 'Shift default bias',
      psychologicalJob: 'Makes inaction feel riskier than action. Shows legal, tax, governance, and regret risk comparison.',
      condition: 'LAI ≥ 8 OR ISI ≥ 5 OR AETI ≥ 4',
    });
  }

  if (scores.isi >= 4 || scores.lai >= 8) {
    assets.push({
      name: 'Pilot vs Full Implementation Comparison',
      firstAllowedMeeting: 'Meeting 3A',
      purpose: 'Enable movement',
      psychologicalJob: 'Allows movement without commitment. Converts hesitation into momentum.',
      condition: 'ISI ≥ 4 or LAI ≥ 8',
    });
  }

  // Final Meeting Assets (Always)
  assets.push({
    name: 'Final Trust Architecture Diagram',
    firstAllowedMeeting: 'Final Meeting',
    purpose: 'Confirm decision',
    psychologicalJob: 'Should feel calm, clean, and inevitable. Only shown when fear and authority are neutralized.',
  });

  assets.push({
    name: 'Decision Brief',
    firstAllowedMeeting: 'Final Meeting',
    purpose: 'Anchor confidence',
    psychologicalJob: 'Proves its value, anchors the decision, prevents second-guessing.',
  });

  assets.push({
    name: 'Pricing Model Alignment Page',
    firstAllowedMeeting: 'Final Meeting',
    purpose: 'Close without pressure',
    psychologicalJob: 'Pricing should feel matched, not sold. Aligned to PFI score.',
  });

  return assets;
}
