## Goal
Bring `/heirway/checkout` in line with the new pricing model in `src/lib/heirwayPlans.ts`. Two purchase types share the page, chosen by what the pricing page stored in sessionStorage.

## Flow detection (on mount)
```
sessionStorage.heirway_selected_subscription  →  Subscription mode
sessionStorage.heirway_selected_package       →  Trust Package mode
(neither)                                     →  fall back to Subscription: essentials
```
URL `?sub=<id>` or `?package=<id>` overrides sessionStorage (mirrors current `?plan=` behavior).

## Subscription mode (Essentials $19, Steward $49, Gold $99)
- Read plan from `HEIRWAY_SUBSCRIPTIONS[id]`.
- Order Summary shows `$X/mo`, features from `subscription.features`, no billing toggle, no add-ons.
- Button label: `Continue to Payment — $X/mo`.
- Payment intent: call `create-subscription` with `{ subscriptionId, mode: 'subscription' }`.

## Trust Package mode (Legacy, Foundation, Business)
- Read pkg from `HEIRWAY_TRUST_PACKAGES[id]`.
- New tabbed payment selector replacing today's Monthly/Annual toggle:
  ```
  [ Pay in Full ] [ 6 Months ] [ 12 Months ]
  ```
  - Pay in Full: shows `cashPrice` and `Save $${cashSavings}` badge.
  - 6 Months: `Due today $${sixMonth.dueToday}` + `then $${sixMonth.monthly}/mo × 5`, total `$${sixMonth.total}`.
  - 12 Months: `Due today $${twelveMonth.dueToday}` + `then $${twelveMonth.monthly}/mo × 11`, total `$${twelveMonth.total}`.
- Add-ons section (replaces Legacy Insurance / Special Care):
  - Additional Trust — $1,499 per trust, quantity stepper (0–4).
  - Creator Matching Service — $500 per trust, quantity stepper (0–4).
  - Add-on totals are added to `dueToday` in the installment plans (per `calculatePackageTotal`).
- What's Included: `pkg.features` plus any add-on line items.
- Payment intent: call `create-subscription` with `{ packageId, paymentPlan: 'cash'|'6mo'|'12mo', additionalTrusts, creatorMatchingTrusts }`.

## Wealth Builder
- Not handled here — pricing page routes it directly to `/heirway/onboarding-call`. Left unchanged.

## Files to change
- `src/pages/HeirwayCheckout.tsx` — full rewrite of state, order summary block, and payment initialization.
- `src/lib/heirwayPlans.ts` — no changes; already has the models plus `calculatePackageTotal`.
- (Optional cleanup) remove `UpsellCard` import and the old upsell block.

## Backend note (out of scope for this change)
`create-subscription` and Stripe products/prices still reflect the legacy Foundation/Business plans. The new subscription IDs (`essentials`/`steward`/`gold`) and package IDs with 3 payment plans + add-ons will need matching Stripe prices and edge-function updates before "Continue to Payment" actually charges. This plan updates the UI end only. I'll flag this after the UI ships so we can tackle the Stripe/edge-function work as a follow-up.

## Preserved behavior
- "Continue for free instead" button.
- Promo code input.
- Terms dialog.
- Force-light-mode + logo header.
- Post-payment routing (intake → onboarding-call).
