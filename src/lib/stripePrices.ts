/** Stripe product & price IDs mapped to Heirway plans */

/** LEGACY plans (grandfathered clients only — do not use for new signups) */
export const STRIPE_PLANS = {
  foundation: {
    product_id: "prod_UB6i8fs6Y9Oy6z",
    price_id: "price_1TCkVSBc2rQGllPQ2MkMSPDs",
  },
  business: {
    product_id: "prod_UB6kU5XTHzCwYl",
    price_id: "price_1TCkXLBc2rQGllPQWdsCL3ZF",
  },
  wealth_builder: {
    product_id: "prod_UB6lnyMt8dDvuo",
    price_id: "price_1TCkXeBc2rQGllPQ51phA0P0",
  },
  education: {
    product_id: "prod_UB6lFribR1Bh6j",
    price_id: "price_1TCkXxBc2rQGllPQgHfSTSWd",
  },
} as const;

/** LEGACY upsells */
export const STRIPE_UPSELLS = {
  legacy_insurance: {
    product_id: "prod_UB6m3UwCKkM0Zf",
    price_id: "price_1TCkYUBc2rQGllPQTcZ8aGkv",
  },
  special_care: {
    product_id: "prod_UB6mWt3H4ic3mg",
    price_id: "price_1TCkYrBc2rQGllPQmbP18YKu",
  },
} as const;

/** NEW subscription tiers (recurring monthly software access) */
export const STRIPE_SUBSCRIPTIONS = {
  essentials: {
    product_id: "prod_UtJyRDwt6TML7o",
    price_id: "price_1TtXK8Bc2rQGllPQuEXthEfW",
  },
  steward: {
    product_id: "prod_UtJyXeyBRqcQkV",
    price_id: "price_1TtXKhBc2rQGllPQCLc9zQP2",
  },
  gold: {
    product_id: "prod_UtJzYzC2Z8FCoo",
    price_id: "price_1TtXL5Bc2rQGllPQB9oORG63",
  },
} as const;

/** NEW trust packages — one product per package, three price variants each */
export const STRIPE_PACKAGES = {
  legacy: {
    product_id: "prod_UtJzK7r0dXbjCx",
    cash_price_id: "price_1TtXLUBc2rQGllPQuKIi9atL",
    deposit_price_id: "price_1TtXUbBc2rQGllPQ75kT9XII",
    six_month_price_id: "price_1TtXLnBc2rQGllPQrUYPjhZz",
    twelve_month_price_id: "price_1TtXM4Bc2rQGllPQgyDvS633",
  },
  foundation_package: {
    product_id: "prod_UtK4MAZARpZNkh",
    cash_price_id: "price_1TtXQ7Bc2rQGllPQ1DmVKbM7",
    deposit_price_id: "price_1TtXUzBc2rQGllPQCJ0xjzEz",
    six_month_price_id: "price_1TtXQuBc2rQGllPQOe3FQoZ6",
    twelve_month_price_id: "price_1TtXRFBc2rQGllPQtlaultb9",
  },
  business_package: {
    product_id: "prod_UtK6BHhnfcR3aM",
    cash_price_id: "price_1TtXRtBc2rQGllPQn8OnnrZo",
    deposit_price_id: "price_1TtXWWBc2rQGllPQMJchhLYe",
    six_month_price_id: "price_1TtXSBBc2rQGllPQakG1A7Tc",
    twelve_month_price_id: "price_1TtXSmBc2rQGllPQDBFajt0g",
  },
} as const;

/** NEW checkout add-ons (one-time, quantity-based) */
export const STRIPE_ADDONS = {
  additional_trust: {
    product_id: "prod_UtK7GXLGGYODEz",
    price_id: "price_1TtXTcBc2rQGllPQ65jc3t7f",
  },
  creator_matching: {
    product_id: "prod_UtK8sw6x5eI1vV",
    price_id: "price_1TtXU9Bc2rQGllPQVliq99RN",
  },
} as const;


/** Per-seat billing for additional trustees/beneficiaries beyond the first 3 */
export const STRIPE_SEATS = {
  additional_trustee: {
    product_id: "prod_UB6nDDrIs5SY4K",
    price_id: "price_1TCkZkBc2rQGllPQUlxFTzko",
  },
  additional_beneficiary: {
    product_id: "prod_UB6nIzqWALTxjw",
    price_id: "price_1TCka3Bc2rQGllPQoEmrgz3E",
  },
} as const;

/** Payoff prices (one-time payments to pay off subscription early) */
export const STRIPE_PAYOFFS = {
  foundation_early: {
    product_id: "prod_UB6i8fs6Y9Oy6z",
    price_id: "price_1TCkVSBc2rQGllPQ2MkMSPDs",
    amount: 10000,
    label: "Foundation Early Payoff (within 12 months)",
  },
  foundation_standard: {
    product_id: "prod_UB6i8fs6Y9Oy6z",
    price_id: "price_1TCkVSBc2rQGllPQ2MkMSPDs",
    amount: 11940,
    label: "Foundation Standard Payoff (after 12 months)",
  },
  foundation_1_upsell_standard: {
    product_id: "prod_UB6i8fs6Y9Oy6z",
    price_id: "price_1TCkVSBc2rQGllPQ2MkMSPDs",
    amount: 17880,
    label: "Foundation + 1 Add-on Standard Payoff (after 12 months)",
  },
  foundation_2_upsell_early: {
    product_id: "prod_UB6i8fs6Y9Oy6z",
    price_id: "price_1TCkVSBc2rQGllPQ2MkMSPDs",
    amount: 20000,
    label: "Foundation + 2 Add-ons Early Payoff (within 12 months)",
  },
  foundation_2_upsell_standard: {
    product_id: "prod_UB6i8fs6Y9Oy6z",
    price_id: "price_1TCkVSBc2rQGllPQ2MkMSPDs",
    amount: 23820,
    label: "Foundation + 2 Add-ons Standard Payoff (after 12 months)",
  },
  business_early: {
    product_id: "prod_UB6kU5XTHzCwYl",
    price_id: "price_1TCkXLBc2rQGllPQWdsCL3ZF",
    amount: 20000,
    label: "Business Early Payoff (within 12 months)",
  },
  business_standard: {
    product_id: "prod_UB6kU5XTHzCwYl",
    price_id: "price_1TCkXLBc2rQGllPQWdsCL3ZF",
    amount: 23940,
    label: "Business Standard Payoff (after 12 months)",
  },
} as const;

/** Free seat limits per client (raised from 3/3) */
export const SEAT_LIMITS = {
  FREE_TRUSTEES: 10,
  FREE_BENEFICIARIES: 15, // excludes passive beneficiary
} as const;
