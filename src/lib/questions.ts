// Trust Diagnostic Assessment Questions
// All 23 questions with exact answer choices as defined
// Includes both internal diagnostic questions and client-facing versions

export interface QuestionOption {
  value: string;
  label: string;
}

export interface Question {
  id: string;
  number: number;
  section: string;
  sectionTitle: string;
  question: string; // Internal diagnostic question
  clientQuestion: string; // Client-facing question (neutral, no scoring cues)
  type: 'single' | 'multi';
  options: QuestionOption[];
}

// Internal titles for framework/scoring reference, customer-facing titles for display
export const SECTIONS = [
  { id: 'A', title: 'About You & What You Do', internalTitle: 'Structural Complexity and Asset Profile' },
  { id: 'B', title: 'Your Experience With Taxes', internalTitle: 'Tax Pain and Motivation' },
  { id: 'C', title: 'How You Make Big Decisions', internalTitle: 'Decision Style and Loss Aversion' },
  { id: 'D', title: 'Comfort With Change & Flexibility', internalTitle: 'Irreversibility and Optionality' },
  { id: 'E', title: 'Advisors & Decision Input', internalTitle: 'Authority and Advisor Control' },
  { id: 'F', title: 'Comfort With Oversight & Perception', internalTitle: 'Audit and Reputation Psychology' },
  { id: 'G', title: 'Control & Involvement Preferences', internalTitle: 'Control and Governance' },
  { id: 'H', title: 'Time Horizon & Readiness', internalTitle: 'Time Horizon and Readiness' },
  { id: 'I', title: 'Fees & Engagement Preferences', internalTitle: 'Pricing and Compensation Preferences' },
];

export const QUESTIONS: Question[] = [
  // Section A: Structural Complexity and Asset Profile
  {
    id: 'q1_situation',
    number: 1,
    section: 'A',
    sectionTitle: 'Structural Complexity and Asset Profile',
    question: 'What best describes your situation today? (Select all that apply)',
    clientQuestion: 'Which of the following best describe your current financial or professional situation? (Select all that apply)',
    type: 'multi',
    options: [
      { value: 'operating_business', label: 'Operating business owner' },
      { value: 'farmer_landowner', label: 'Farmer or agricultural land owner' },
      { value: 'real_estate_investor', label: 'Real estate investor' },
      { value: 'private_investor', label: 'Private investor or limited partner' },
      { value: 'ma_professional', label: 'M&A professional or dealmaker' },
      { value: 'investment_firm_family_office', label: 'Investment firm or family office' },
      { value: 'high_w2', label: 'High W2 professional income' },
      { value: 'inheriting_assets', label: 'Inheriting assets or wealth' },
      { value: 'liquidity_event', label: 'Liquidity event expected in the next 24 months' },
    ],
  },
  {
    id: 'q2_annual_income',
    number: 2,
    section: 'A',
    sectionTitle: 'Structural Complexity and Asset Profile',
    question: 'Approximate annual taxable income (personal and business combined)',
    clientQuestion: 'Approximately how much taxable income do you generate each year across all sources?',
    type: 'single',
    options: [
      { value: 'under_250k', label: 'Under $250K' },
      { value: '250k_500k', label: '$250K to $500K' },
      { value: '500k_1m', label: '$500K to $1M' },
      { value: '1m_5m', label: '$1M to $5M' },
      { value: '5m_plus', label: '$5M+' },
    ],
  },
  {
    id: 'q3_net_worth',
    number: 3,
    section: 'A',
    sectionTitle: 'Structural Complexity and Asset Profile',
    question: 'Approximate net worth (excluding primary residence)',
    clientQuestion: 'Approximately what is your net worth, excluding your primary residence?',
    type: 'single',
    options: [
      { value: 'under_1m', label: 'Under $1M' },
      { value: '1m_5m', label: '$1M to $5M' },
      { value: '5m_15m', label: '$5M to $15M' },
      { value: '15m_50m', label: '$15M to $50M' },
      { value: '50m_plus', label: '$50M+' },
    ],
  },
  {
    id: 'q4_income_source',
    number: 4,
    section: 'A',
    sectionTitle: 'Structural Complexity and Asset Profile',
    question: 'Primary source of taxable income',
    clientQuestion: 'What are the primary sources of your taxable income?',
    type: 'single',
    options: [
      { value: 'operating_business', label: 'Operating business profits' },
      { value: 'real_estate', label: 'Real estate rents or sales' },
      { value: 'capital_gains', label: 'Capital gains and investments' },
      { value: 'salary_bonuses', label: 'Salary and bonuses' },
      { value: 'mixed', label: 'Mixed' },
    ],
  },

  // Section B: Tax Pain and Motivation
  {
    id: 'q5_tax_burden',
    number: 5,
    section: 'B',
    sectionTitle: 'Tax Pain and Motivation',
    question: 'How do you feel about your current tax burden?',
    clientQuestion: 'How would you describe the impact taxes currently have on your financial situation?',
    type: 'single',
    options: [
      { value: 'acceptable', label: 'Acceptable' },
      { value: 'frustrating', label: 'Frustrating but tolerable' },
      { value: 'limiting_growth', label: 'Limiting growth of business(s)' },
      { value: 'actively_painful', label: 'Actively painful' },
    ],
  },
  {
    id: 'q6_avoided_strategies',
    number: 6,
    section: 'B',
    sectionTitle: 'Tax Pain and Motivation',
    question: 'Have you ever intentionally not pursued a tax strategy because it felt risky?',
    clientQuestion: 'Have you ever chosen not to explore a planning idea because it felt uncertain or difficult to evaluate?',
    type: 'single',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
      { value: 'not_sure', label: 'Not sure' },
    ],
  },
  {
    id: 'q7_mindset',
    number: 7,
    section: 'B',
    sectionTitle: 'Tax Pain and Motivation',
    question: 'Which statement best reflects your mindset?',
    clientQuestion: 'Which statement best reflects how you generally approach financial decisions?',
    type: 'single',
    options: [
      { value: 'prefer_certainty', label: 'I prefer certainty even if it costs more' },
      { value: 'prefer_optimization', label: 'I prefer optimization if risk is controlled' },
      { value: 'comfortable_complexity', label: 'I am comfortable with complexity if upside is clear' },
    ],
  },

  // Section C: Decision Style and Loss Aversion
  {
    id: 'q8_decision_style',
    number: 8,
    section: 'C',
    sectionTitle: 'Decision Style and Loss Aversion',
    question: 'When faced with a decision with a 95% chance of success and a 5% chance that it possibly will not work, you typically:',
    clientQuestion: 'When making decisions that involve some uncertainty, which approach best describes you?',
    type: 'single',
    options: [
      { value: 'avoid', label: 'Avoid it' },
      { value: 'delay', label: 'Delay it' },
      { value: 'reduce_downside', label: 'Seek to reduce downside further' },
      { value: 'proceed', label: 'Proceed if upside justifies it' },
    ],
  },
  {
    id: 'q9_regret_pattern',
    number: 9,
    section: 'C',
    sectionTitle: 'Decision Style and Loss Aversion',
    question: 'Which statement feels more accurate?',
    clientQuestion: 'Looking back, which do you tend to regret more?',
    type: 'single',
    options: [
      { value: 'mistakes', label: 'I regret mistakes more than missed opportunities' },
      { value: 'missed_opportunities', label: 'I regret missed opportunities more than mistakes' },
    ],
  },

  // Section D: Irreversibility and Optionality
  {
    id: 'q10_change_concern',
    number: 10,
    section: 'D',
    sectionTitle: 'Irreversibility and Optionality',
    question: 'Which concerns you more?',
    clientQuestion: 'Which situation would you find more uncomfortable?',
    type: 'single',
    options: [
      { value: 'hard_to_unwind', label: 'Making a change that is hard to unwind' },
      { value: 'suboptimal_structure', label: 'Staying in a poor or maybe even risky situation for too long' },
    ],
  },
  {
    id: 'q11_exit_comfort',
    number: 11,
    section: 'D',
    sectionTitle: 'Irreversibility and Optionality',
    question: 'If you knew you could back out of a situation within 12 to 24 months at a reasonable cost, would that change how comfortable you feel?',
    clientQuestion: 'If you knew you could back out of a situation within 12 to 24 months at a reasonable cost, would that change how comfortable you feel?',
    type: 'single',
    options: [
      { value: 'yes_significantly', label: 'Yes, significantly' },
      { value: 'somewhat', label: 'Somewhat' },
      { value: 'no', label: 'No' },
    ],
  },

  // Section E: Authority and Advisor Control
  {
    id: 'q12_veto_power',
    number: 12,
    section: 'E',
    sectionTitle: 'Authority and Advisor Control',
    question: 'Who typically has real decision-making influence over major financial or new business setup choices?',
    clientQuestion: 'Who typically has real decision-making influence over major financial or new business setup choices? (Select all that apply)',
    type: 'multi',
    options: [
      { value: 'self', label: 'Me' },
      { value: 'cpa', label: 'My CPA' },
      { value: 'attorney', label: 'My attorney' },
      { value: 'board_partner', label: 'A board or partner' },
      { value: 'no_single', label: 'No single person' },
    ],
  },
  {
    id: 'q13_blame_allocation',
    number: 13,
    section: 'E',
    sectionTitle: 'Authority and Advisor Control',
    question: 'If things didn\'t go your way or someone challenged you for the results of a choice you made, which of these would feel worse to you?',
    clientQuestion: 'If things didn\'t go your way or someone challenged you for the results of a choice you made, which of these would feel worse to you?',
    type: 'single',
    options: [
      { value: 'personal_decision', label: 'I made the call' },
      { value: 'professional_advice', label: 'I relied on professional advice' },
    ],
  },

  // Section F: Audit and Reputation Psychology
  {
    id: 'q14_audit_perception',
    number: 14,
    section: 'F',
    sectionTitle: 'Audit and Reputation Psychology',
    question: 'An IRS audit would feel like:',
    clientQuestion: 'If your tax position were ever reviewed by a regulator, how would that experience most likely feel to you?',
    type: 'single',
    options: [
      { value: 'personal_failure', label: 'A personal failure' },
      { value: 'serious_distraction', label: 'A serious distraction' },
      { value: 'administrative_process', label: 'An administrative process' },
      { value: 'expected_cost', label: 'An expected cost of operating at scale' },
    ],
  },
  {
    id: 'q15_aggressiveness_concern',
    number: 15,
    section: 'F',
    sectionTitle: 'Audit and Reputation Psychology',
    question: 'How concerned are you about how your tax situation might be viewed by others?',
    clientQuestion: 'How important is it to you that your tax position feels conservative and well-within professional norms?',
    type: 'single',
    options: [
      { value: 'very_concerned', label: 'Very concerned' },
      { value: 'somewhat_concerned', label: 'Somewhat concerned' },
      { value: 'not_concerned', label: 'Not concerned' },
    ],
  },

  // Section G: Control and Governance
  {
    id: 'q16_control_importance',
    number: 16,
    section: 'G',
    sectionTitle: 'Control and Governance',
    question: 'How important is it to you that everything remains in your personal name and in the public record that you own things?',
    clientQuestion: 'How important is it to you that everything remains in your personal name and in the public record that you own things?',
    type: 'single',
    options: [
      { value: 'extremely_important', label: 'Extremely important' },
      { value: 'important_flexible', label: 'Important but flexible' },
      { value: 'not_important', label: 'Not important if outcomes improve' },
    ],
  },
  {
    id: 'q17_trustee_acceptance',
    number: 17,
    section: 'G',
    sectionTitle: 'Control and Governance',
    question: 'Would you be open to allowing a third-party or someone else in your business with limited or full control if required? (Banking, IRS, Administrative Company, Additional Support)?',
    clientQuestion: 'Would you be open to allowing a third-party or someone else in your business with limited or full control if required? (Banking, IRS, Administrative Company, Additional Support)?',
    type: 'single',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'possibly', label: 'Possibly' },
      { value: 'no', label: 'No' },
    ],
  },

  // Section H: Time Horizon and Readiness
  {
    id: 'q18_holding_period',
    number: 18,
    section: 'H',
    sectionTitle: 'Time Horizon and Readiness',
    question: 'How long do you expect to control and operate your main businesses or assets? (Business, Land etc.)',
    clientQuestion: 'How long do you expect to control and operate your main businesses or assets? (Business, Land etc.)',
    type: 'single',
    options: [
      { value: 'less_3_years', label: 'Less than 3 years' },
      { value: '3_7_years', label: '3 to 7 years' },
      { value: '7_15_years', label: '7 to 15 years' },
      { value: 'multi_generation', label: 'Multi-generation' },
    ],
  },
  {
    id: 'q19_existing_trusts',
    number: 19,
    section: 'H',
    sectionTitle: 'Time Horizon and Readiness',
    question: 'Do you already have trusts or advanced entities?',
    clientQuestion: 'Which best describes your current planning and entity setup?',
    type: 'single',
    options: [
      { value: 'none', label: 'None' },
      { value: 'basic_revocable', label: 'Basic revocable trust only' },
      { value: 'some_entities', label: 'Some entities but not coordinated' },
      { value: 'advanced_structure', label: 'Advanced structure already' },
    ],
  },
  {
    id: 'q20_intent',
    number: 20,
    section: 'H',
    sectionTitle: 'Time Horizon and Readiness',
    question: 'Which best describes your intent today?',
    clientQuestion: 'Which best describes where you are right now in exploring these topics?',
    type: 'single',
    options: [
      { value: 'just_learning', label: 'Just learning' },
      { value: 'evaluating_options', label: 'Evaluating options' },
      { value: 'ready_to_implement', label: 'Ready to implement if confident' },
    ],
  },

  // Section I: Pricing and Compensation Preferences
  {
    id: 'q21_fee_preference',
    number: 21,
    section: 'I',
    sectionTitle: 'Pricing and Compensation Preferences',
    question: 'Which fee structure feels most reasonable?',
    clientQuestion: 'Which type of fee structure generally feels most reasonable to you?',
    type: 'single',
    options: [
      { value: 'upfront_fixed', label: 'Upfront fixed fee for permanent setup' },
      { value: 'lower_upfront_savings', label: 'Lower upfront plus share of savings' },
      { value: 'annual_retainer', label: 'Annual advisory retainer' },
      { value: 'performance_only', label: 'Performance-based only' },
      { value: 'combination', label: 'Combination' },
    ],
  },
  {
    id: 'q22_savings_share',
    number: 22,
    section: 'I',
    sectionTitle: 'Pricing and Compensation Preferences',
    question: 'If savings were measurable, would you be open to sharing a percentage in exchange for lower upfront cost?',
    clientQuestion: 'If outcomes were clearly measurable, how open would you be to sharing a portion in exchange for a lower upfront cost?',
    type: 'single',
    options: [
      { value: 'open', label: 'Open' },
      { value: 'somewhat_open', label: 'Somewhat open' },
      { value: 'not_open', label: 'Not open' },
    ],
  },
  {
    id: 'q23_pricing_priority',
    number: 23,
    section: 'I',
    sectionTitle: 'Pricing and Compensation Preferences',
    question: 'Which matters more?',
    clientQuestion: 'When it comes to professional services, which tends to matter most to you?',
    type: 'single',
    options: [
      { value: 'minimize_upfront', label: 'Minimizing upfront cost' },
      { value: 'align_incentives', label: 'Aligning incentives long term' },
      { value: 'predictable_expenses', label: 'Predictable expenses' },
      { value: 'pay_if_works', label: 'Paying only if it works' },
    ],
  },
];

export function getQuestionsBySection(sectionId: string): Question[] {
  return QUESTIONS.filter((q) => q.section === sectionId);
}
