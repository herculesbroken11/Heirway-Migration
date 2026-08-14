import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { HeirwayLayout } from '@/components/heirway/HeirwayLayout';
import { useForceLightMode } from '@/hooks/useForceLightMode';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Loader2,
  DollarSign,
  Calendar,
  TrendingDown,
  CheckCircle2,
  ArrowLeft,
  Clock,
  Zap,
  CreditCard,
  History,
} from 'lucide-react';
import { HEIRWAY_PLANS } from '@/lib/heirwayPlans';

interface ExtraPayment {
  date: string;
  amount: number;
}

interface PayoffData {
  planId: string;
  subscriptionId: string;
  startDate: string;
  monthsElapsed: number;
  isEarly: boolean;
  earlyDeadline: number;
  upsellCount: number;
  totalPayoff: number;
  totalPaid: number;
  totalFromSubscription: number;
  totalExtraPayments: number;
  extraPayments: ExtraPayment[];
  remainingBalance: number;
  monthlyPayment: number;
}

export default function HeirwayPayoff() {
  useForceLightMode();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [processingExtra, setProcessingExtra] = useState(false);
  const [payoffData, setPayoffData] = useState<PayoffData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [extraAmount, setExtraAmount] = useState('');

  const canceled = searchParams.get('canceled') === 'true';
  const paymentCanceled = searchParams.get('payment') === 'canceled';
  const paymentSuccess = searchParams.get('payment') === 'success';

  useEffect(() => {
    loadPayoffData();
  }, []);

  useEffect(() => {
    if (paymentSuccess) {
      toast.success('Payment applied! Your balance has been updated.');
    }
  }, [paymentSuccess]);

  const loadPayoffData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }

      const { data, error: fnError } = await supabase.functions.invoke('calculate-payoff');
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      setPayoffData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load payoff details');
    } finally {
      setLoading(false);
    }
  };

  const handlePayoff = async () => {
    if (!payoffData) return;
    setProcessing(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('process-payoff', {
        body: {
          subscriptionId: payoffData.subscriptionId,
          remainingBalance: payoffData.remainingBalance,
        },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      if (data.type === 'checkout' && data.url) {
        window.location.href = data.url;
      } else if (data.type === 'free_payoff') {
        toast.success('Your plan has been fully paid off!');
        navigate('/heirway/settings?payoff=success');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to process payoff');
    } finally {
      setProcessing(false);
    }
  };

  const handleExtraPayment = async () => {
    if (!payoffData) return;
    const amount = parseFloat(extraAmount);
    if (isNaN(amount) || amount < 1) {
      toast.error('Enter an amount of at least $1');
      return;
    }
    if (amount > payoffData.remainingBalance) {
      toast.error(`Amount cannot exceed remaining balance of $${payoffData.remainingBalance.toLocaleString()}`);
      return;
    }

    setProcessingExtra(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('make-extra-payment', {
        body: {
          amount,
          subscriptionId: payoffData.subscriptionId,
        },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to process payment');
    } finally {
      setProcessingExtra(false);
    }
  };

  if (loading) {
    return (
      <HeirwayLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </HeirwayLayout>
    );
  }

  if (error) {
    return (
      <HeirwayLayout>
        <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/heirway/settings')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Settings
          </Button>
          <Card className="glass-panel">
            <CardContent className="p-6 text-center space-y-3">
              <p className="text-muted-foreground">{error}</p>
              <p className="text-xs text-muted-foreground">
                Payoff is available for Foundation and Business subscription plans.
              </p>
            </CardContent>
          </Card>
        </div>
      </HeirwayLayout>
    );
  }

  if (!payoffData) return null;

  const plan = HEIRWAY_PLANS[payoffData.planId];
  const progressPercent = payoffData.totalPayoff > 0
    ? Math.min(100, (payoffData.totalPaid / payoffData.totalPayoff) * 100)
    : 0;
  const monthsRemaining = payoffData.monthlyPayment > 0
    ? Math.ceil(payoffData.remainingBalance / payoffData.monthlyPayment)
    : 0;
  const earlyDeadlineDate = new Date(payoffData.startDate);
  earlyDeadlineDate.setMonth(earlyDeadlineDate.getMonth() + payoffData.earlyDeadline);

  return (
    <HeirwayLayout>
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/heirway/settings')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Settings
        </Button>

        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Plan Balance</h1>
          <p className="text-sm text-muted-foreground">
            Manage payments for your {plan?.name || payoffData.planId} plan
          </p>
        </div>

        {(canceled || paymentCanceled) && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-4">
              <p className="text-sm text-destructive">Payment was canceled. You can try again when ready.</p>
            </CardContent>
          </Card>
        )}

        {/* Progress Overview */}
        <Card className="glass-panel">
          <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-display font-bold text-foreground">Payment Progress</h3>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>${payoffData.totalPaid.toLocaleString()} paid</span>
                <span>${payoffData.totalPayoff.toLocaleString()} total</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {progressPercent.toFixed(1)}% complete
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <Calendar className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground">Months Active</p>
                <p className="text-lg font-bold text-foreground">{payoffData.monthsElapsed}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <DollarSign className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground">Monthly</p>
                <p className="text-lg font-bold text-foreground">
                  ${payoffData.monthlyPayment.toLocaleString()}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <CreditCard className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground">Subscription Paid</p>
                <p className="text-lg font-bold text-foreground">
                  ${payoffData.totalFromSubscription.toLocaleString()}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <Zap className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground">Extra Payments</p>
                <p className="text-lg font-bold text-foreground">
                  ${payoffData.totalExtraPayments.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payoff Breakdown */}
        <Card className="glass-panel">
          <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-display font-bold text-foreground">Balance Breakdown</h3>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {payoffData.isEarly ? 'Early Payoff Price' : 'Standard Payoff Price'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {payoffData.isEarly
                      ? `Early rate available for ${payoffData.earlyDeadline - payoffData.monthsElapsed} more months`
                      : `Past ${payoffData.earlyDeadline}-month early window`}
                  </p>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  ${payoffData.totalPayoff.toLocaleString()}
                </p>
              </div>

              <div className="flex justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Subscription Payments</p>
                  <p className="text-xs text-muted-foreground">
                    {payoffData.monthsElapsed} month{payoffData.monthsElapsed !== 1 ? 's' : ''} × ${payoffData.monthlyPayment}/mo
                  </p>
                </div>
                <p className="text-sm font-semibold text-primary">
                  -${payoffData.totalFromSubscription.toLocaleString()}
                </p>
              </div>

              {payoffData.totalExtraPayments > 0 && (
                <div className="flex justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Extra Payments</p>
                    <p className="text-xs text-muted-foreground">
                      {payoffData.extraPayments.length} additional payment{payoffData.extraPayments.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-primary">
                    -${payoffData.totalExtraPayments.toLocaleString()}
                  </p>
                </div>
              )}

              {payoffData.upsellCount > 0 && (
                <div className="flex justify-between">
                  <p className="text-sm text-muted-foreground">
                    Add-ons included: {payoffData.upsellCount}
                  </p>
                </div>
              )}
            </div>

            <Separator />

            <div className="flex justify-between items-center">
              <p className="text-base font-bold text-foreground">Remaining Balance</p>
              <p className="text-2xl font-bold text-primary">
                ${payoffData.remainingBalance.toLocaleString()}
              </p>
            </div>

            {payoffData.isEarly && (
              <div className="flex items-start gap-2 bg-primary/5 border border-primary/20 rounded-lg p-3">
                <Zap className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-foreground">Early Payoff Savings</p>
                  <p className="text-xs text-muted-foreground">
                    You're saving by paying off early! After{' '}
                    {earlyDeadlineDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })},
                    the payoff price increases to the standard rate.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Make a Payment */}
        <Card className="glass-panel border-primary/30">
          <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-display font-bold text-foreground">Make a Payment</h3>
            </div>

            <p className="text-sm text-muted-foreground">
              Make an extra payment to reduce your balance faster. Every dollar goes directly toward your remaining balance.
            </p>

            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Payment Amount</Label>
                <div className="relative mt-1">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    min="1"
                    max={payoffData.remainingBalance}
                    step="1"
                    value={extraAmount}
                    onChange={(e) => setExtraAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="glass-input pl-9"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Max: ${payoffData.remainingBalance.toLocaleString()}
                </p>
              </div>

              {/* Quick amount buttons */}
              <div className="flex flex-wrap gap-2">
                {[100, 250, 500, 1000].filter(a => a <= payoffData.remainingBalance).map((amt) => (
                  <Button
                    key={amt}
                    variant="outline"
                    size="sm"
                    onClick={() => setExtraAmount(String(amt))}
                    className={extraAmount === String(amt) ? 'border-primary bg-primary/5' : ''}
                  >
                    ${amt.toLocaleString()}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExtraAmount(String(payoffData.remainingBalance))}
                  className={extraAmount === String(payoffData.remainingBalance) ? 'border-primary bg-primary/5' : ''}
                >
                  Full Balance
                </Button>
              </div>

              <Button
                onClick={handleExtraPayment}
                disabled={processingExtra || !extraAmount}
                className="w-full"
              >
                {processingExtra ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <CreditCard className="w-4 h-4 mr-2" />
                )}
                {extraAmount
                  ? `Pay $${parseFloat(extraAmount || '0').toLocaleString()}`
                  : 'Enter an amount'}
              </Button>
            </div>

            <Separator />

            {/* Full payoff option */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Pay Off Completely</p>
                <p className="text-xs text-muted-foreground">
                  Pay the full remaining balance and complete your plan
                </p>
              </div>
              <Button
                onClick={handlePayoff}
                disabled={processing}
                variant="outline"
                size="sm"
              >
                {processing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                )}
                Pay ${payoffData.remainingBalance.toLocaleString()}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Payment History */}
        {payoffData.extraPayments.length > 0 && (
          <Card className="glass-panel">
            <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-display font-bold text-foreground">Extra Payment History</h3>
              </div>
              <div className="space-y-2">
                {payoffData.extraPayments.map((payment, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      <span className="text-sm text-foreground">
                        {new Date(payment.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      ${payment.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info footer */}
        {!payoffData.isEarly && monthsRemaining > 0 && (
          <div className="flex items-start gap-2 bg-muted/50 rounded-lg p-4">
            <Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              At your current monthly rate only, you'd finish in ~{monthsRemaining} months.
              Extra payments reduce this time and your total balance.
            </p>
          </div>
        )}
      </div>
    </HeirwayLayout>
  );
}
