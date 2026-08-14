import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Info, Calendar, Clock, DollarSign } from 'lucide-react';
import { HeirwayPlan } from '@/lib/heirwayPlans';

interface PaymentOptionsInfoProps {
  plan: HeirwayPlan;
  addedUpsells: string[];
}

function getPayoffAmounts(plan: HeirwayPlan, upsellCount: number) {
  if (plan.payoffTiers && plan.payoffTiers.length > 0) {
    // Find the matching tier, or the highest tier if upsellCount exceeds defined tiers
    const tier = plan.payoffTiers.find(t => t.upsellCount === upsellCount)
      ?? plan.payoffTiers[plan.payoffTiers.length - 1];
    return { early: tier.earlyPayoff, standard: tier.standardPayoff };
  }
  return { early: plan.earlyPayoff ?? 0, standard: plan.standardPayoff ?? 0 };
}

export default function PaymentOptionsInfo({ plan, addedUpsells }: PaymentOptionsInfoProps) {
  const upsellCount = addedUpsells.length;
  const { early: totalEarly, standard: totalStandard } = getPayoffAmounts(plan, upsellCount);
  const basePayoff = getPayoffAmounts(plan, 0);

  if (!basePayoff.early) return null;

  return (
    <Card className="glass-panel">
      <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
      <CardContent className="p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-display font-bold text-foreground">Payment Options</h3>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          You can choose the payment option that works best for you. All Heirway plans include the same core protections—keeping your estate private, avoiding probate, protecting assets where applicable, and creating a clear structure for transferring wealth to the next generation.
        </p>

        {/* Monthly */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-bold text-foreground">Monthly Plan</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            You may remain on the standard monthly plan and continue paying for your trust structure over time. You also have the option to pay off your trust early.
          </p>
        </div>

        {/* Early Payoff */}
        <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-bold text-foreground">Early Payoff Option (Within First Year)</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            You may choose to pay off your trust within the first 12 months.
          </p>

          <div className="space-y-2 mt-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground font-medium">{plan.name} — Early payoff</span>
              <span className="font-bold text-foreground">${totalEarly.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Payoff after first year</span>
              <span className="font-semibold text-foreground">${totalStandard.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Annual + Family Governance */}
        <div className="bg-accent/5 border border-accent/10 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Badge className="bg-accent/10 text-accent border-accent/20 text-xs">Annual Benefit</Badge>
          </div>
          <h4 className="text-sm font-bold text-foreground">Family Governance — Included for the First Year</h4>
          <p className="text-sm text-muted-foreground">
            Families who choose annual billing receive Family Governance support included for the first year. This helps ensure your trust structure functions smoothly by providing guidance around:
          </p>
          <ul className="space-y-1.5 ml-1">
            {[
              'Family communication and expectations',
              'Succession planning conversations',
              'Beneficiary education',
              'Stewardship of family assets',
              'Maintaining alignment between trustees and heirs',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Check className="w-3.5 h-3.5 text-accent mt-0.5 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Payoff Summary */}
        <div className="border border-border rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-bold text-foreground">
            {upsellCount > 0 ? 'Your Payoff Summary' : 'Payoff Summary'}
          </h4>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="font-medium text-muted-foreground">Configuration</div>
            <div className="font-medium text-muted-foreground text-center">Within First Year</div>
            <div className="font-medium text-muted-foreground text-center">After First Year</div>

            {/* Show current configuration */}
            <div className="text-foreground text-sm">
              {plan.name}{upsellCount > 0 && ` + ${upsellCount} add-on${upsellCount > 1 ? 's' : ''}`}
            </div>
            <div className="text-foreground text-sm text-center">${totalEarly.toLocaleString()}</div>
            <div className="text-foreground text-sm text-center">${totalStandard.toLocaleString()}</div>

            {/* Show other tiers for reference if plan has tiers */}
            {plan.payoffTiers && plan.payoffTiers.filter(t => t.upsellCount !== upsellCount).map((tier) => (
              <div key={tier.upsellCount} className="contents text-muted-foreground">
                <div className="text-sm">
                  {plan.name}{tier.upsellCount > 0 && ` + ${tier.upsellCount} add-on${tier.upsellCount > 1 ? 's' : ''}`}
                </div>
                <div className="text-sm text-center">${tier.earlyPayoff.toLocaleString()}</div>
                <div className="text-sm text-center">${tier.standardPayoff.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Important notes */}
        <div className="flex items-start gap-2 bg-muted/30 border border-border rounded-lg p-3">
          <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Early payoff pricing is only available during the first 12 months of your plan. After the first year, the standard payoff amounts automatically apply.</p>
            <p>Family Governance is included for the first year when annual billing is selected.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
