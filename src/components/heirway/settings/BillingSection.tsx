import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2, Receipt, DollarSign } from 'lucide-react';
import { HEIRWAY_PLANS } from '@/lib/heirwayPlans';
import { SEAT_LIMITS } from '@/lib/stripePrices';

interface BillingLineItem {
  label: string;
  detail: string;
  amount: number;
}

interface Props {
  client: any;
}

export default function BillingSection({ client }: Props) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [lineItems, setLineItems] = useState<BillingLineItem[]>([]);
  const [totalMonthly, setTotalMonthly] = useState(0);
  const [isWealthBuilder, setIsWealthBuilder] = useState(false);
  const canPayoff = client?.selected_plan === 'foundation' || client?.selected_plan === 'business';
  const isPaidOff = client?.plan_status === 'paid_off';

  useEffect(() => {
    if (!client) { setLoading(false); return; }
    loadBillingData();
  }, [client]);

  const loadBillingData = async () => {
    const items: BillingLineItem[] = [];
    const planKey = client.selected_plan;
    const plan = planKey ? HEIRWAY_PLANS[planKey] : null;

    // Wealth Builder is a one-time payment with no ongoing subscription billing
    if (planKey === 'wealth_builder') {
      setIsWealthBuilder(true);
      setLineItems([{
        label: 'Heirway Wealth Builder',
        detail: 'Private consultation & trust roadmap — investment applies toward your estate plan',
        amount: 2499,
      }]);
      setTotalMonthly(0);
      setLoading(false);
      return;
    }

    setIsWealthBuilder(false);

    if (plan) {
      const priceNum = parseMonthlyPrice(plan.price, plan.priceType);
      items.push({
        label: plan.name,
        detail: plan.priceType === 'one-time' ? 'One-time payment' : 'Base subscription',
        amount: priceNum,
      });
    } else {
      items.push({ label: 'Free Plan', detail: 'No active subscription', amount: 0 });
    }

    // Additional trusts (upsells)
    if (plan && plan.trustCount > 0) {
      const { data: trusts } = await supabase
        .from('heirway_trust_progress')
        .select('id')
        .eq('client_id', client.id);

      const trustCount = trusts?.length || 0;
      const extraTrusts = Math.max(0, trustCount - plan.trustCount);
      if (extraTrusts > 0) {
        items.push({
          label: `Additional Trusts (×${extraTrusts})`,
          detail: '$99/mo each',
          amount: extraTrusts * 99,
        });
      }
    }

    // Per-seat billing
    const { data: members } = await supabase
      .from('trust_members')
      .select('id, member_type, is_billable')
      .eq('client_id', client.id);

    if (members && members.length > 0) {
      const allTrustees = members.filter(m => m.member_type === 'trustee_manager' || m.member_type === 'trustee');
      const allBeneficiaries = members.filter(m => m.member_type === 'beneficiary');

      const paidTrustees = Math.max(0, allTrustees.length - SEAT_LIMITS.FREE_TRUSTEES);
      const paidBeneficiaries = Math.max(0, allBeneficiaries.length - SEAT_LIMITS.FREE_BENEFICIARIES);

      if (paidTrustees > 0) {
        items.push({
          label: `Additional Trustee Seats (×${paidTrustees})`,
          detail: `${allTrustees.length} total, ${SEAT_LIMITS.FREE_TRUSTEES} included free`,
          amount: paidTrustees * 10,
        });
      }

      if (paidBeneficiaries > 0) {
        items.push({
          label: `Additional Beneficiary Seats (×${paidBeneficiaries})`,
          detail: `${allBeneficiaries.length} total, ${SEAT_LIMITS.FREE_BENEFICIARIES} included free`,
          amount: paidBeneficiaries * 10,
        });
      }
    }

    setLineItems(items);
    setTotalMonthly(items.reduce((sum, i) => sum + i.amount, 0));
    setLoading(false);
  };

  if (loading) {
    return (
      <Card className="glass-panel">
        <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (isWealthBuilder) {
    return (
      <Card className="glass-panel">
        <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-display font-bold text-foreground">Billing Summary</h3>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{lineItems[0]?.label}</p>
              <p className="text-xs text-muted-foreground">{lineItems[0]?.detail}</p>
            </div>
            <p className="text-sm font-semibold text-foreground whitespace-nowrap">$2,499</p>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-foreground">Ongoing Subscription</p>
            <p className="text-lg font-bold text-primary">None</p>
          </div>
          <Badge variant="outline" className="text-xs">No recurring charges</Badge>
        </CardContent>
      </Card>
    );
  }

  const hasOneTimeOnly = lineItems.length === 1 && lineItems[0].detail === 'One-time payment';

  return (
    <Card className="glass-panel">
      <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-display font-bold text-foreground">Billing Summary</h3>
        </div>

        <div className="space-y-3">
          {lineItems.map((item, i) => (
            <div key={i} className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </div>
              <p className="text-sm font-semibold text-foreground whitespace-nowrap">
                {item.amount === 0 ? '$0' : `$${item.amount.toLocaleString()}`}
                {item.detail !== 'One-time payment' && item.amount > 0 ? '/mo' : ''}
              </p>
            </div>
          ))}
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-foreground">
            {hasOneTimeOnly ? 'Total Paid' : 'Monthly Total'}
          </p>
          <div className="text-right">
            <p className="text-lg font-bold text-primary">
              ${totalMonthly.toLocaleString()}
              {!hasOneTimeOnly && totalMonthly > 0 ? '/mo' : ''}
            </p>
            {!hasOneTimeOnly && totalMonthly > 0 && (
              <p className="text-xs text-muted-foreground">
                ${(totalMonthly * 12).toLocaleString()}/year
              </p>
            )}
          </div>
        </div>

        {lineItems.length <= 1 && totalMonthly === 0 && (
          <Badge variant="outline" className="text-xs">No active charges</Badge>
        )}

        {isPaidOff && (
          <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
            ✓ Plan Paid Off
          </Badge>
        )}

        {canPayoff && !isPaidOff && client?.plan_status === 'active' && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2"
            onClick={() => navigate('/heirway/payoff')}
          >
            <DollarSign className="w-4 h-4 mr-1" />
            Pay Off Early
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function parseMonthlyPrice(priceStr: string, priceType: string): number {
  const match = priceStr.match(/\$?([\d,.]+)/);
  if (!match) return 0;
  return parseFloat(match[1].replace(',', ''));
}
