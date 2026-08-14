export interface QuizOption {
  label: string;
  value: string;
  points: number;
}

export interface QuizQuestion {
  id: string;
  section: string;
  sectionLabel: string;
  question: string;
  subtitle?: string;
  options: QuizOption[];
  type: 'single' | 'boolean' | 'multi' | 'contact';
  /** If true, selecting this answer blocks the quiz (e.g. under 18) */
  blockValue?: string;
  /** Condition function — if provided, question is only shown when it returns true */
  showIf?: (answers: Record<string, string | string[]>) => boolean;
}

// ─── QUESTIONS (contact + 4 questions) ───

const ALL_QUESTIONS: QuizQuestion[] = [
  {
    id: 'contact_info',
    section: 'profile',
    sectionLabel: 'About You',
    question: "Tell us a little about yourself",
    type: 'contact',
    options: [],
  },
  {
    id: 'current_plan',
    section: 'readiness',
    sectionLabel: 'Your Situation',
    question: 'Do you currently have a plan for who legally owns and controls everything if something happened to you?',
    type: 'single',
    options: [
      { label: 'Yes, fully set up', value: 'yes_fully', points: 0 },
      { label: 'Kind of / not sure', value: 'kind_of', points: 0 },
      { label: 'No', value: 'no', points: 0 },
    ],
  },
  {
    id: 'top_concern',
    section: 'readiness',
    sectionLabel: 'Your Concerns',
    question: 'What are you most concerned about?',
    type: 'single',
    options: [
      { label: 'Taxes', value: 'taxes', points: 0 },
      { label: 'Protecting assets', value: 'protecting_assets', points: 0 },
      { label: 'Passing to family', value: 'passing_to_family', points: 0 },
      { label: 'Avoiding probate', value: 'avoiding_probate', points: 0 },
      { label: 'Just learning', value: 'just_learning', points: 0 },
      { label: 'I have everything set up and my family has no need to worry, just here for the prizes', value: 'all_set', points: 0 },
    ],
  },
  {
    id: 'timeline',
    section: 'readiness',
    sectionLabel: 'Timeline',
    question: 'When are you looking to handle this?',
    type: 'single',
    options: [
      { label: 'ASAP', value: 'asap', points: 0 },
      { label: 'Next 3–6 months', value: '3_6_months', points: 0 },
      { label: 'Just exploring', value: 'exploring', points: 0 },
    ],
  },
  {
    id: 'walkthrough_interest',
    section: 'readiness',
    sectionLabel: 'Next Steps',
    question: 'Would it help to walk through your situation and see how this would be structured?',
    type: 'single',
    options: [
      { label: 'Yes', value: 'yes', points: 0 },
      { label: 'Maybe later', value: 'maybe', points: 0 },
      { label: 'No need', value: 'no', points: 0 },
    ],
  },
];

/** Returns the subset of questions visible given current answers */
export function getVisibleQuestions(answers: Record<string, string | string[]>): QuizQuestion[] {
  return ALL_QUESTIONS.filter(q => !q.showIf || q.showIf(answers));
}

/** Legacy export — full unfiltered list */
export const QUIZ_QUESTIONS = ALL_QUESTIONS;

export type RiskLevel = 'low' | 'moderate' | 'high';

export interface QuizResult {
  totalScore: number;
  maxScore: number;
  riskLevel: RiskLevel;
  gaps: string[];
  headline: string;
  message: string;
}

export function scoreQuiz(answers: Record<string, string | string[]>): QuizResult {
  const gaps: string[] = [];

  const plan = answers.current_plan as string;
  if (plan === 'no') gaps.push('No plan in place for ownership and control');
  else if (plan === 'kind_of') gaps.push('Current plan may have gaps');

  const concern = answers.top_concern as string;
  if (concern && concern !== 'all_set' && concern !== 'just_learning') {
    gaps.push(`Concerned about: ${concern.replace(/_/g, ' ')}`);
  }

  if (gaps.length === 0) gaps.push('Minor structural gaps may still exist');

  const riskSignals = gaps.length;
  let riskLevel: RiskLevel;
  if (riskSignals <= 1) riskLevel = 'low';
  else riskLevel = 'moderate';

  const headline = riskLevel === 'low'
    ? "You're ahead—but there may still be gaps."
    : "There are areas that could create exposure over time.";
  const message = riskLevel === 'low'
    ? "You've taken steps most people haven't—but there may still be areas to address."
    : "Based on your answers, there are structural gaps that could cause problems under pressure.";

  return { totalScore: 0, maxScore: 0, riskLevel, gaps, headline, message };
}

/** Extract profile answers into the format needed for plan recommendation */
export function extractProfileAnswers(answers: Record<string, string | string[]>) {
  return {
    full_name: (answers.full_name as string) || '',
    email: (answers.contact_email as string) || '',
    phone: (answers.contact_phone as string) || '',
    current_plan: (answers.current_plan as string) || '',
    top_concern: (answers.top_concern as string) || '',
    timeline: (answers.timeline as string) || '',
    walkthrough_interest: (answers.walkthrough_interest as string) || '',
    // Legacy fields for compatibility
    state: '',
    has_children: false,
    housing_situation: '',
    over_1m_assets: false,
    business_ownership: 'none',
  };
}
