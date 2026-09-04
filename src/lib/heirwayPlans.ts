// ─────────────────────────────────────────────────────────────
// HEIRWAY PLAN MODEL (updated per Nov 2026 restructure)
//
// TWO independent product lines:
//   1. SUBSCRIPTIONS — Free / Essentials / Steward / Gold
//      (ongoing monthly software + education access)
//   2. TRUST PACKAGES — Legacy / Foundation / Business / Wealth Builder
//      (one-time trust document purchase; cash or 6-mo / 12-mo installments)
//
// Trust package purchases DO NOT grant Essentials/Steward/Gold access —
// customers must also subscribe. New trust buyers get Free-tier app access.
//
// Legacy plan IDs (education, foundation, business, wealth_builder) are
// preserved below because the DB still stores those values for the one
// existing paying client. Their monthly payments continue unchanged.
// ─────────────────────────────────────────────────────────────

export interface PayoffTier {
  upsellCount: number;
  earlyPayoff: number;
  standardPayoff: number;
}

export interface HeirwayPlan {
  id: string;
  name: string;
  price: string;
  priceType: 'monthly' | 'one-time';
  tagline: string;
  description: string;
  idealFor: string[];
  idealForAlt?: string[];
  idealForSeparator?: 'OR' | 'AND';
  trustCount: number;
  includesEducation?: boolean;
  earlyPayoff?: number;
  standardPayoff?: number;
  payoffTiers?: PayoffTier[];
}

// ─── NEW: SUBSCRIPTION PLANS ─────────────────────────────────

export interface HeirwaySubscription {
  id: string;
  name: string;
  price: number;           // 0 for free
  priceLabel: string;
  tagline: string;
  features: string[];
  recommended?: boolean;
}

export const HEIRWAY_SUBSCRIPTIONS: Record<string, HeirwaySubscription> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    priceLabel: '$0',
    tagline: 'Designed for families wanting to start a plan.',
    features: [
      'Dashboard Features',
      'Knowledgebase',
      'Successor Vault',
      'Family Governance',
      'Document Resources',
    ],
  },
  essentials: {
    id: 'essentials',
    name: 'Essentials',
    price: 19,
    priceLabel: '$19',
    tagline: 'Organization and governance tools for your family.',
    features: [
      'Dashboard Features',
      'Knowledgebase',
      'Successor Vault',
      'Family Governance',
      'Document Resources',
      'Monthly Workshops',
    ],
  },
  steward: {
    id: 'steward',
    name: 'Steward',
    price: 49,
    priceLabel: '$49',
    tagline: 'Everything in Essentials, plus guided education.',
    features: [
      'Everything in Essentials',
      'Learning Modules',
      'Trust Vault',
    ],
    recommended: true,
  },
  gold: {
    id: 'gold',
    name: 'Gold',
    price: 99,
    priceLabel: '$99',
    tagline: 'Everything in Steward, plus premium education.',
    features: [
      'Everything in Steward',
      'Advanced Learning Modules',
      'Live Q&A Sessions',
    ],
  },
};

// ─── NEW: TRUST PACKAGES (one-time / installment) ────────────

export interface TrustPackage {
  id: string;
  name: string;
  subtitle?: string;
  trustCount: number;
  cashPrice: number;

  cashSavings: number;
  /** 6-month plan: today + 5 more monthly payments */
  sixMonth: {
    dueToday: number;
    total: number;
    monthly: number;
  };
  /** 12-month plan: today + 11 more monthly payments */
  twelveMonth: {
    dueToday: number;
    total: number;
    monthly: number;
  };
  tagline: string;
  bestFor: string;
  features: string[];
  recommended?: boolean;
  recommendedLabel?: string;
  isWealthBuilder?: boolean;
}

export const HEIRWAY_TRUST_PACKAGES: Record<string, TrustPackage> = {
  legacy: {
    id: 'legacy',
    name: 'Legacy',
    subtitle: 'Start Your Legacy',
    trustCount: 2,
    cashPrice: 3799,
    cashSavings: 228,
    sixMonth:    { dueToday: 1499, total: 1499 + 402 * 5, monthly: 402 },
    twelveMonth: { dueToday: 1499, total: 1499 + 211 * 11, monthly: 211 },
    tagline: 'Individuals and simple asset structures.',
    bestFor: 'Individuals and Families building a legacy and desiring to protect a primary asset in a private trust structure.',
    features: [
      'Full estate plan documentation',
      'Probate avoidance & privacy',
      'Trust Vault access',
      'Asset protection strategy',
    ],
  },
  foundation: {
    id: 'foundation_package',
    name: 'Foundation',
    subtitle: 'Build & Protect',
    trustCount: 3,
    cashPrice: 5499,
    cashSavings: 330,
    sixMonth:    { dueToday: 1999, total: 1999 + 611 * 5, monthly: 611 },
    twelveMonth: { dueToday: 1999, total: 1999 + 320 * 11, monthly: 320 },
    tagline: 'Recommended for most families.',
    bestFor: 'Families with a few assets or a business, with generational wealth goals.',
    features: [
      'Everything in Legacy +',
      'Tax Strategy & Income Protection',
      'Life insurance & legacy planning',
    ],
    recommended: true,
    recommendedLabel: 'Recommended for Most Families',
  },
  business: {
    id: 'business_package',
    name: 'Business',
    subtitle: 'Grow & Operate',
    trustCount: 4,
    cashPrice: 6999,
    cashSavings: 420,
    sixMonth:    { dueToday: 2499, total: 2499 + 785 * 5, monthly: 785 },
    twelveMonth: { dueToday: 2499, total: 2499 + 410 * 11, monthly: 410 },
    tagline: 'For business owners.',
    bestFor: 'Entrepreneurs and operators with an LLC that desire true privacy and protection.',
    features: [
      'Everything in Foundation +',
      'Corporate Entity Strategy (LLC)',
      'Succession & Exit Planning Strategy',
    ],
  },
  wealth_builder: {
    id: 'wealth_builder',
    name: 'Wealth Builder',
    subtitle: 'Custom Strategy',
    trustCount: 4,
    cashPrice: 2499,
    cashSavings: 0,
    sixMonth:    { dueToday: 2499, total: 2499, monthly: 0 },
    twelveMonth: { dueToday: 2499, total: 2499, monthly: 0 },
    tagline: 'Custom architecture for complex estates. Book a consultation.',
    bestFor: 'Complex portfolios, multiple businesses, or $1M+ estates.',
    features: [
      'Private one-on-one consultation',
      'Custom trust architecture roadmap',
      '$2,499 applies toward your estate plan',
      'Only 4 clients per month',
    ],
    isWealthBuilder: true,
  },

};


/** Priced per trust — customer can add these to any package at checkout or later. */
export const ADDITIONAL_TRUST_PRICE = 1499;

/** Optional Creator Matching Service — priced per trust. */
export const CREATOR_MATCHING_PRICE = 500;

/** UI Record keys used to iterate HEIRWAY_TRUST_PACKAGES in pricing/recommendation views. */
export const TRUST_PACKAGE_RECORD_KEYS = ['legacy', 'foundation', 'business', 'wealth_builder'] as const;

/**
 * Resolve a trust package by canonical API id (TrustPackage.id) or UI Record key.
 * Canonical API ids: legacy, foundation_package, business_package, wealth_builder.
 */
export function resolveTrustPackage(packageKey: string): TrustPackage | undefined {
  const byRecord = HEIRWAY_TRUST_PACKAGES[packageKey];
  if (byRecord) return byRecord;
  return Object.values(HEIRWAY_TRUST_PACKAGES).find((p) => p.id === packageKey);
}

/** Canonical TrustPackage.id for API/sessionStorage (never UI Record keys alone). */
export function canonicalTrustPackageId(packageKey: string): string | undefined {
  const pkg = resolveTrustPackage(packageKey);
  return pkg?.id;
}

/**
 * Normalize Stripe package_id metadata to heirway_clients.selected_plan.
 * Only explicit allowlist entries — unknown ids return null.
 */
export const PACKAGE_ID_TO_SELECTED_PLAN: Record<string, string> = {
  foundation_package: 'foundation',
  business_package: 'business',
  /** subscriptionAccess TRUST_PACKAGE_PLANS — valid selected_plan for trust-package buyers */
  legacy: 'legacy',
};

export function packageIdToSelectedPlan(packageId: string): string | null {
  return PACKAGE_ID_TO_SELECTED_PLAN[packageId] ?? null;
}

/** Compute payment plan totals for N additional trusts + optional creator matching. */
export function calculatePackageTotal(
  pkgId: string,
  extras: { additionalTrusts?: number; creatorMatchingTrusts?: number } = {},
) {
  const pkg = resolveTrustPackage(pkgId);
  if (!pkg) return null;
  const additional = (extras.additionalTrusts || 0) * ADDITIONAL_TRUST_PRICE;
  const creator = (extras.creatorMatchingTrusts || 0) * CREATOR_MATCHING_PRICE;
  const addOnCash = additional + creator;
  return {
    cash: pkg.cashPrice + addOnCash,
    sixMonth: {
      dueToday: pkg.sixMonth.dueToday + addOnCash,
      total: Math.round((pkg.cashPrice + addOnCash) * 1.03),
    },
    twelveMonth: {
      dueToday: pkg.twelveMonth.dueToday + addOnCash,
      total: Math.round((pkg.cashPrice + addOnCash) * 1.06),
    },
  };
}

// ─────────────────────────────────────────────────────────────
// LEGACY PLAN DEFINITIONS (preserved for grandfathered clients)
// The one existing paying client still has selected_plan='foundation'
// with a 60-month plan — do NOT remove or change these.
// ─────────────────────────────────────────────────────────────

export const HEIRWAY_PLANS: Record<string, HeirwayPlan> = {
  education: {
    id: 'education',
    name: 'Essentials',           // renamed display
    price: '$19',
    priceType: 'monthly',
    tagline: 'Organization and governance tools for your family.',
    description: 'Includes dashboard, knowledgebase, successor vault, family governance, document resources, and monthly workshops.',
    trustCount: 0,
    includesEducation: true,
    idealFor: [
      'Dashboard Features',
      'Knowledgebase',
      'Successor Vault',
      'Family Governance',
      'Document Resources',
      'Monthly Workshops',
    ],
  },
  foundation: {
    id: 'foundation',
    name: 'Foundation (Legacy Plan)',
    price: 'Starting at $199',
    priceType: 'monthly',
    tagline: 'Grandfathered plan — retained for existing subscribers.',
    description: 'Original Heirway Foundation subscription plan. Kept for existing customers only; new customers use the Foundation trust package instead.',
    trustCount: 2,
    includesEducation: true,
    payoffTiers: [
      { upsellCount: 0, earlyPayoff: 10000, standardPayoff: 11940 },
      { upsellCount: 1, earlyPayoff: 15000, standardPayoff: 17880 },
      { upsellCount: 2, earlyPayoff: 20000, standardPayoff: 23820 },
    ],
    idealFor: [
      'Private trust templates',
      'Families implementing their first trust system',
      'Individuals preparing multi-generational wealth plans',
      'Clients seeking stronger protection than traditional estate planning',
    ],
  },
  business: {
    id: 'business',
    name: 'Business (Legacy Plan)',
    price: 'Starting at $399',
    priceType: 'monthly',
    tagline: 'Grandfathered plan — retained for existing subscribers.',
    description: 'Original Heirway Business subscription plan. Kept for existing customers only; new customers use the Business trust package instead.',
    trustCount: 4,
    includesEducation: true,
    earlyPayoff: 20000,
    standardPayoff: 23940,
    idealFor: [
      'Private trust templates',
      'Entrepreneurs and operators',
      'Family businesses',
      'Clients managing both personal and business assets',
    ],
  },
  wealth_builder: {
    id: 'wealth_builder',
    name: 'Heirway Wealth Builder',
    price: '$2,499',
    priceType: 'one-time',
    tagline: 'A private consultation and custom trust architecture roadmap for entrepreneurs, investors, and families managing complex assets. Limited to 4 clients per month. Your $2,499 roadmap investment applies toward your estate plan when you invest in a private trust structure.',
    description: 'Begin with a private one-on-one consultation and receive a custom trust architecture roadmap tailored to your situation.',
    trustCount: 4,
    includesEducation: true,
    idealFor: [
      'Private one-on-one consultation with a trust strategist',
      'Custom trust architecture roadmap for your situation',
      'Private trust templates',
      'Only accepting 4 clients this month',
      '$2,499 investment applies toward your full estate plan',
    ],
  },
};

export interface LearningLesson {
  id: string;
  title: string;
  free: boolean;
}

export interface LearningModule {
  id: string;
  title: string;
  description: string;
  lessons: LearningLesson[];
}

export const LEARNING_MODULES: LearningModule[] = [
  {
    id: 'trust_fundamentals',
    title: 'Trust Fundamentals',
    description: 'Learn the basics of trusts, how they work, and why they matter.',
    lessons: [
      { id: 'what_is_a_trust', title: 'What is a Trust?', free: true },
      { id: 'types_of_trusts', title: 'Types of Trusts', free: true },
      { id: 'trust_vs_will', title: 'Trust vs. Will', free: true },
      { id: 'how_trusts_work', title: 'How Trusts Work', free: false },
      { id: 'choosing_trustee', title: 'Choosing a Trustee', free: false },
    ],
  },
  {
    id: 'asset_protection',
    title: 'Asset Protection',
    description: 'Strategies to shield your wealth from lawsuits, creditors, and risk.',
    lessons: [
      { id: 'why_protection_matters', title: 'Why Protection Matters', free: true },
      { id: 'llc_structures', title: 'LLC Structures', free: false },
      { id: 'insurance_strategies', title: 'Insurance Strategies', free: false },
      { id: 'asset_titling', title: 'Asset Titling Best Practices', free: false },
    ],
  },
  {
    id: 'generational_wealth',
    title: 'Generational Wealth Planning',
    description: 'Build and transfer wealth across generations.',
    lessons: [
      { id: 'wealth_transfer_basics', title: 'Wealth Transfer Basics', free: true },
      { id: 'family_bank_concept', title: 'The Family Bank Concept', free: false },
      { id: 'education_funding', title: 'Education Funding Strategies', free: false },
      { id: 'legacy_planning', title: 'Legacy Planning', free: false },
    ],
  },
  {
    id: 'family_governance',
    title: 'Family Governance',
    description: 'Create structures for family decision-making and stewardship.',
    lessons: [
      { id: 'family_meetings', title: 'Running Family Meetings', free: true },
      { id: 'family_constitution', title: 'Creating a Family Constitution', free: false },
      { id: 'next_gen_preparation', title: 'Preparing the Next Generation', free: false },
    ],
  },
];

export const DOCUMENT_CATEGORIES = [
  { id: 'deeds', label: 'Deeds & Property' },
  { id: 'business', label: 'Business Documents' },
  { id: 'insurance', label: 'Insurance Policies' },
  { id: 'tax', label: 'Tax Returns' },
  { id: 'estate', label: 'Estate Planning Documents' },
  { id: 'other', label: 'Other' },
];

export const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware',
  'Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky',
  'Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi',
  'Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico',
  'New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania',
  'Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont',
  'Virginia','Washington','West Virginia','Wisconsin','Wyoming','District of Columbia',
];

/**
 * Quiz → trust package recommendation.
 * Returns one of: 'legacy', 'foundation' (default), 'business', 'wealth_builder'.
 * Logic unchanged from prior model — only the labels changed.
 */
export function getRecommendedPlan(answers: {
  over_1m_assets: boolean;
  business_ownership: string;
  housing_situation: string;
  has_children?: boolean;
  is_married?: boolean;
}): string {
  const ownsBusiness = answers.business_ownership === 'single' || answers.business_ownership === 'side_hustle';
  const ownsMultipleBusinesses = answers.business_ownership === 'multiple';
  const ownsRealEstate = answers.housing_situation === 'own_mortgage' || answers.housing_situation === 'own_paid';

  // Wealth Builder: multiple businesses OR (business + real estate) OR $1M+ assets
  if (ownsMultipleBusinesses) return 'wealth_builder';
  if (answers.over_1m_assets) return 'wealth_builder';
  if (ownsBusiness && ownsRealEstate) return 'wealth_builder';

  // Business: owns a business but no real estate
  if (ownsBusiness) return 'business';

  // Foundation: real estate, children, or married → most families
  if (ownsRealEstate || answers.has_children || answers.is_married) return 'foundation';

  // Legacy: individuals / simple structures
  return 'legacy';
}
