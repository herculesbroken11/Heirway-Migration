import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, BookOpen, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { HEIRWAY_PLANS } from '@/lib/heirwayPlans';
import heirwayLogo from '@/assets/heirway-logo-transparent.png';
import heirwayIcon from '@/assets/heirway-icon.png';

interface PaymentGateProps {
  clientId: string;
  selectedPlan: string | null;
  onComplete: () => void;
}

export default function PaymentGate({ clientId, selectedPlan, onComplete }: PaymentGateProps) {
  const navigate = useNavigate();
  const [switching, setSwitching] = useState(false);
  const plan = selectedPlan ? HEIRWAY_PLANS[selectedPlan] : null;

  const handleContinueToCheckout = () => {
    if (selectedPlan) {
      sessionStorage.setItem('heirway_selected_plan', selectedPlan);
    }
    navigate('/heirway/checkout');
  };

  const handleSwitchToFree = async () => {
    setSwitching(true);
    try {
      const { error } = await supabase
        .from('heirway_clients')
        .update({ selected_plan: 'free', plan_status: 'active' })
        .eq('id', clientId);
      if (error) throw error;
      toast.success('Welcome! You now have access to the free plan.');
      onComplete();
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex flex-col items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="mb-6 relative z-10">
        <img src={heirwayLogo} alt="Heirway" className="h-36 w-auto" />
      </div>

      <Card className="glass-panel max-w-lg w-full relative z-10 animate-fade-in">
        <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
        <CardContent className="p-6 md:p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <img src={heirwayIcon} alt="Heirway" className="w-9 h-9 object-contain" />
          </div>
          <h2 className="text-xl font-display font-bold text-foreground mb-2">
            Complete Your Enrollment
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Your intake has been submitted! To access your dashboard, please complete your enrollment or switch to the free plan.
          </p>

          {/* Option 1: Complete Payment */}
          <button
            onClick={handleContinueToCheckout}
            className="w-full text-left p-4 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors mb-3 group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">
                  Continue with {plan?.name || 'your selected plan'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {plan?.price ? `Starting at ${plan.price}` : 'Complete your payment to unlock full access'}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>

          {/* Option 2: Switch to Free */}
          <button
            onClick={handleSwitchToFree}
            disabled={switching}
            className="w-full text-left p-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <BookOpen className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">
                  {switching ? 'Switching...' : 'Start with the Free Plan'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Access introductory learning content and upgrade anytime
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>

          <p className="text-xs text-muted-foreground mt-4">
            You can always upgrade your plan later from the dashboard.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
