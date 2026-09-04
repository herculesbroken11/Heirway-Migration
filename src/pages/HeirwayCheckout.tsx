import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForceLightMode } from '@/hooks/useForceLightMode';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2, Tag, Plus, Minus } from 'lucide-react';
import {
  HEIRWAY_SUBSCRIPTIONS,
  ADDITIONAL_TRUST_PRICE,
  CREATOR_MATCHING_PRICE,
  calculatePackageTotal,
  HEIRWAY_PLANS,
  canonicalTrustPackageId,
  resolveTrustPackage,
  packageIdToSelectedPlan,
} from '@/lib/heirwayPlans';
import PaymentOptionsInfo from '@/components/heirway/checkout/PaymentOptionsInfo';
import EmbeddedPaymentForm from '@/components/heirway/checkout/EmbeddedPaymentForm';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';

import heirwayLogo from '@/assets/heirway-logo-transparent.png';

const stripePromise = loadStripe(
  'pk_live_51TBKadBc2rQGllPQbNGRqC33JTqmqTadklVjjUMRlM1j8jrNOs54t3OvdGzDmkZF8GG65T2GirAvYMhDanrcUHLB002onerXcM',
);

type Mode = 'subscription' | 'package';
type PaymentPlan = 'cash' | 'sixMonth' | 'twelveMonth';

const fmt = (n: number) => `$${n.toLocaleString()}`;

export default function HeirwayCheckout() {
  useForceLightMode();
  const navigate = useNavigate();

  // ─── Mode selection ────────────────────────────────────────
  const [mode, setMode] = useState<Mode>('subscription');
  const [subscriptionId, setSubscriptionId] = useState<string>('essentials');
  const [packageId, setPackageId] = useState<string>('foundation_package');
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlan>('cash');
  const [additionalTrusts, setAdditionalTrusts] = useState(0);
  const [creatorMatching, setCreatorMatching] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlPackage = params.get('package');
    const urlSub = params.get('sub');

    const resolveAndSetPackage = (raw: string) => {
      const canonical = canonicalTrustPackageId(raw);
      if (!canonical) return false;
      setMode('package');
      setPackageId(canonical);
      sessionStorage.setItem('heirway_selected_package', canonical);
      return true;
    };

    if (urlPackage && resolveAndSetPackage(urlPackage)) {
      // stored canonical id in resolveAndSetPackage
    } else if (urlSub && HEIRWAY_SUBSCRIPTIONS[urlSub]) {
      setMode('subscription');
      setSubscriptionId(urlSub);
      sessionStorage.setItem('heirway_selected_subscription', urlSub);
    } else {
      const storedPkg = sessionStorage.getItem('heirway_selected_package');
      const storedSub = sessionStorage.getItem('heirway_selected_subscription');
      if (storedPkg && resolveAndSetPackage(storedPkg)) {
        // canonical id restored
      } else if (storedSub && HEIRWAY_SUBSCRIPTIONS[storedSub]) {
        setMode('subscription');
        setSubscriptionId(storedSub);
      }
    }

    window.scrollTo(0, 0);
  }, []);

  // ─── Derived values ────────────────────────────────────────
  const subscription = HEIRWAY_SUBSCRIPTIONS[subscriptionId];
  const pkg = resolveTrustPackage(packageId);

  const packageTotals = useMemo(
    () =>
      calculatePackageTotal(packageId, {
        additionalTrusts,
        creatorMatchingTrusts: creatorMatching,
      }),
    [packageId, additionalTrusts, creatorMatching],
  );

  const resetPayment = () => setClientSecret(null);

  const changePaymentPlan = (p: PaymentPlan) => {
    setPaymentPlan(p);
    resetPayment();
  };
  const changeAdditional = (n: number) => {
    setAdditionalTrusts(Math.max(0, Math.min(4, n)));
    resetPayment();
  };
  const changeCreator = (n: number) => {
    setCreatorMatching(Math.max(0, Math.min(4, n)));
    resetPayment();
  };

  // Display total
  let displayTotal = 0;
  let displayPeriod = '';
  let subLine = '';
  if (mode === 'subscription' && subscription) {
    displayTotal = subscription.price;
    displayPeriod = '/mo';
    subLine = 'Monthly billing';
  } else if (mode === 'package' && pkg && packageTotals) {
    if (paymentPlan === 'cash') {
      displayTotal = packageTotals.cash;
      subLine = 'Paid in full';
    } else if (paymentPlan === 'sixMonth') {
      displayTotal = packageTotals.sixMonth.dueToday;
      subLine = `Due today · then ${fmt(pkg.sixMonth.monthly)}/mo × 5`;
    } else {
      displayTotal = packageTotals.twelveMonth.dueToday;
      subLine = `Due today · then ${fmt(pkg.twelveMonth.monthly)}/mo × 11`;
    }
  }

  const initializePayment = async () => {
    setIsLoading(true);
    try {
      const body: Record<string, unknown> =
        mode === 'subscription'
          ? {
              subscriptionId,
              mode: 'subscription',
              promoCode: promoCode || undefined,
            }
          : {
              packageId,
              paymentPlan,
              additionalTrusts,
              creatorMatchingTrusts: creatorMatching,
              promoCode: promoCode || undefined,
            };

      const { data, error } = await supabase.functions.invoke('create-subscription', { body });

      if (error) throw error;
      if (data?.error) {
        if (data.error.includes('promo code')) setPromoError(data.error);
        else throw new Error(data.error);
        setIsLoading(false);
        return;
      }

      if (data?.clientSecret) {
        setClientSecret(data.clientSecret);
        if (promoCode) setPromoApplied(true);
      } else {
        throw new Error('No payment intent returned');
      }
    } catch (err: any) {
      console.error('Payment init error:', err);
      toast.error('Unable to initialize payment. Please try again.');
    }
    setIsLoading(false);
  };

  const handlePaymentSuccess = async () => {
    const isTrustPlan = mode === 'package';
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: priorClient } = await supabase
          .from('heirway_clients')
          .select('plan_status')
          .eq('user_id', user.id)
          .maybeSingle();
        const intakeDone = priorClient?.plan_status === 'intake_complete';

        const selectedPlanValue =
          mode === 'package'
            ? packageIdToSelectedPlan(packageId)
            : subscriptionId;

        if (!selectedPlanValue) {
          console.error('Checkout success: no selected_plan mapping for package', packageId);
          navigate('/heirway/onboarding-call');
          return;
        }

        await supabase
          .from('heirway_clients')
          .update({
            plan_status: 'active',
            selected_plan: selectedPlanValue,
            plan_started_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (isTrustPlan && !intakeDone) {
          navigate('/heirway/intake');
          return;
        }
      }
    } catch {}
    navigate('/heirway/onboarding-call');
  };

  const features =
    mode === 'subscription'
      ? subscription?.features ?? []
      : [
          ...(pkg?.features ?? []),
          ...(additionalTrusts > 0
            ? [`${additionalTrusts} Additional Trust${additionalTrusts > 1 ? 's' : ''} (${fmt(ADDITIONAL_TRUST_PRICE)} each)`]
            : []),
          ...(creatorMatching > 0
            ? [`Creator Matching Service × ${creatorMatching} (${fmt(CREATOR_MATCHING_PRICE)} each)`]
            : []),
        ];

  const title = mode === 'subscription' ? subscription?.name : pkg?.name;
  const isPackage = mode === 'package';

  // Legacy plan shim for PaymentOptionsInfo (expects HeirwayPlan)
  const legacyPlanShim =
    (() => {
      const normalized = packageIdToSelectedPlan(packageId);
      if (normalized && HEIRWAY_PLANS[normalized]) return HEIRWAY_PLANS[normalized];
      return HEIRWAY_PLANS.foundation;
    })();

  return (
    <div className="min-h-screen gradient-bg">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 p-4 md:p-8 max-w-3xl mx-auto">
        <div className="flex flex-col items-center mb-6">
          <img src={heirwayLogo} alt="Heirway" className="h-28 w-auto" />
        </div>

        <Card className="glass-panel">
          <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
          <CardContent className="p-6">
            <h3 className="text-lg font-display font-bold text-foreground mb-1">Order Summary</h3>
            <p className="text-xs text-muted-foreground mb-4">{title}</p>

            {/* Package payment-plan tabs */}
            {isPackage && pkg && packageTotals && (
              <>
                <div className="grid grid-cols-3 gap-2 mb-4 p-1 rounded-lg bg-muted/50 border border-border">
                  {([
                    { id: 'cash', label: 'Pay in Full' },
                    { id: 'sixMonth', label: '6 Months' },
                    { id: 'twelveMonth', label: '12 Months' },
                  ] as { id: PaymentPlan; label: string }[]).map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => changePaymentPlan(opt.id)}
                      className={`px-2 py-2 rounded-md text-xs md:text-sm font-medium transition-colors ${
                        paymentPlan === opt.id
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {paymentPlan === 'cash' && pkg.cashSavings > 0 && (
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-4">
                    <p className="text-xs text-foreground">
                      <strong>Save {fmt(pkg.cashSavings)}</strong> when you pay in full today.
                    </p>
                  </div>
                )}
                {paymentPlan !== 'cash' && (
                  <div className="bg-muted/30 border border-border rounded-lg p-3 mb-4 text-xs text-muted-foreground">
                    <div className="flex justify-between mb-1">
                      <span>Due today</span>
                      <strong className="text-foreground">
                        {fmt(paymentPlan === 'sixMonth'
                          ? packageTotals.sixMonth.dueToday
                          : packageTotals.twelveMonth.dueToday)}
                      </strong>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span>
                        Then {fmt(paymentPlan === 'sixMonth' ? pkg.sixMonth.monthly : pkg.twelveMonth.monthly)}/mo
                        {' × '}
                        {paymentPlan === 'sixMonth' ? 5 : 11}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-1 mt-1">
                      <span>Total</span>
                      <strong className="text-foreground">
                        {fmt(paymentPlan === 'sixMonth'
                          ? packageTotals.sixMonth.total
                          : packageTotals.twelveMonth.total)}
                      </strong>
                    </div>
                  </div>
                )}

                {/* Add-ons */}
                <div className="border border-border rounded-lg p-3 mb-4 space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Add-ons
                  </p>
                  <AddonStepper
                    label="Additional Trust"
                    sublabel={`${fmt(ADDITIONAL_TRUST_PRICE)} per trust`}
                    value={additionalTrusts}
                    onChange={changeAdditional}
                  />
                  <AddonStepper
                    label="Creator Matching Service"
                    sublabel={`${fmt(CREATOR_MATCHING_PRICE)} per trust`}
                    value={creatorMatching}
                    onChange={changeCreator}
                  />
                </div>
              </>
            )}

            {/* Subscription plain line-item */}
            {!isPackage && subscription && (
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-foreground">{subscription.name}</p>
                  <p className="text-xs text-muted-foreground">{subscription.tagline}</p>
                </div>
                <span className="text-sm font-bold text-foreground">
                  {subscription.priceLabel}/mo
                </span>
              </div>
            )}

            <div className="border-t border-border pt-4 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-base font-display font-bold text-foreground">
                  {isPackage && paymentPlan !== 'cash' ? 'Due Today' : 'Total'}
                </span>
                <div className="text-right">
                  <span className="text-2xl font-display font-bold text-foreground">
                    {fmt(displayTotal)}
                  </span>
                  <span className="text-sm text-muted-foreground">{displayPeriod}</span>
                </div>
              </div>
              {subLine && (
                <p className="text-xs text-muted-foreground mt-1 text-right">{subLine}</p>
              )}
            </div>

            <div className="space-y-2 mb-6">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                What's Included
              </p>
              {features.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>

            {isPackage && paymentPlan !== 'cash' && (
              <div className="bg-muted/30 border border-border rounded-lg p-3 mb-4">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">
                    {paymentPlan === 'sixMonth' ? '6-month' : '12-month'} installment plan
                  </strong>{' '}
                  with the option to pay off at any time.{' '}
                  <Dialog>
                    <DialogTrigger asChild>
                      <button className="text-primary hover:underline inline">
                        View payment terms
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Payment Terms</DialogTitle>
                      </DialogHeader>
                      <PaymentOptionsInfo plan={legacyPlanShim} addedUpsells={[]} />
                    </DialogContent>
                  </Dialog>
                </p>
              </div>
            )}

            {!clientSecret && (
              <div className="mb-4">
                <Label className="text-xs font-medium text-muted-foreground">Discount Code</Label>
                <div className="flex gap-2 mt-1">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      className="glass-input pl-9"
                      placeholder="Enter code"
                      value={promoCode}
                      onChange={(e) => {
                        setPromoCode(e.target.value);
                        setPromoError(null);
                      }}
                    />
                  </div>
                </div>
                {promoError && <p className="text-xs text-destructive mt-1">{promoError}</p>}
                {promoApplied && <p className="text-xs text-primary mt-1">✓ Discount applied</p>}
              </div>
            )}

            {clientSecret ? (
              <div className="border-t border-border pt-4">
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: 'stripe',
                      variables: { colorPrimary: '#b08d57', borderRadius: '8px' },
                    },
                  }}
                >
                  <EmbeddedPaymentForm
                    onSuccess={handlePaymentSuccess}
                    displayTotal={displayTotal}
                    displayPeriod={displayPeriod}
                  />
                </Elements>
              </div>
            ) : (
              <Button
                onClick={initializePayment}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Preparing checkout…
                  </>
                ) : (
                  `Continue to Payment — ${fmt(displayTotal)}${displayPeriod}`
                )}
              </Button>
            )}

            <p className="text-xs text-center text-muted-foreground mt-3">
              By placing this order, you agree to our{' '}
              <Dialog>
                <DialogTrigger asChild>
                  <button className="text-primary hover:underline">terms & conditions</button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Terms & Conditions</DialogTitle>
                  </DialogHeader>
                  <PaymentOptionsInfo plan={legacyPlanShim} addedUpsells={[]} />
                </DialogContent>
              </Dialog>
              .
            </p>

            <button
              onClick={async () => {
                try {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (user) {
                    await supabase
                      .from('heirway_clients')
                      .update({ selected_plan: 'free', plan_status: 'active' })
                      .eq('user_id', user.id);
                  }
                } catch {}
                navigate('/heirway/dashboard');
              }}
              className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors mt-2 py-1"
            >
              Continue for free instead
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Local stepper component ────────────────────────────────
function AddonStepper({
  label,
  sublabel,
  value,
  onChange,
}: {
  label: string;
  sublabel: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{label}</p>
        <p className="text-xs text-muted-foreground">{sublabel}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onChange(value - 1)}
          disabled={value <= 0}
          className="w-7 h-7 rounded-md border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={`Decrease ${label}`}
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <span className="w-6 text-center text-sm font-medium text-foreground">{value}</span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          disabled={value >= 4}
          className="w-7 h-7 rounded-md border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={`Increase ${label}`}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
