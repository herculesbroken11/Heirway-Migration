import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Shield, Heart, Plus, CheckCircle } from 'lucide-react';

interface UpsellCardProps {
  type: 'legacy_insurance' | 'special_care';
  added?: boolean;
  onAdd: () => void;
}

const UPSELL_DATA = {
  legacy_insurance: {
    name: 'Heirway Legacy Insurance Trust™',
    price: '$99',
    hook: 'Without liquidity, families often lose assets they spent a lifetime building.',
    subtitle: 'Create a trust-funded safety net and family banking system for the next generation.',
    description: 'Add a Legacy Insurance Trust to your Heirway plan to ensure life insurance proceeds flow directly into a private trust structure designed to support your heirs, protect liquidity, and maintain long-term family wealth.',
    details: 'Instead of leaving your family to navigate courts, taxes, or rushed financial decisions, this structure allows insurance proceeds to move privately into the trust—where they can support your family, maintain assets, and fund future opportunities.',
    bankingNote: 'This approach is often used to create a family banking system, where capital inside the trust can be strategically used to support heirs, fund education, provide startup capital, or maintain family property and businesses.',
    features: [
      'Life Insurance Trust structure integrated with your estate plan',
      'Private transfer of insurance proceeds outside probate',
      'Liquidity for heirs when it matters most',
      'Trust fund structure for children or future generations',
      'Family banking strategy framework',
      'Succession support for businesses or real estate',
      'Protects children from inheriting assets at 18—allows structured distributions over time',
    ],
    whyAdd: 'Even well-planned estates can struggle with liquidity when a death occurs. Insurance inside a trust ensures funds are immediately available to protect the family and maintain stability.',
    whyAddDetail: "Instead of selling assets or creating financial stress, your heirs have capital, structure, and guidance already in place.",
    idealFor: [
      'Families with children',
      'Homeowners or landowners',
      'Business owners planning succession',
      'Clients building a family banking strategy',
      'Anyone wanting to create a trust fund for heirs',
    ],
    cta: 'Add Legacy Insurance Trust',
    ctaAdded: 'Added to Your Plan',
    ctaSubtext: 'Strengthen your trust structure and create a long-term financial foundation for your family.',
    icon: Shield,
  },
  special_care: {
    name: 'Heirway Special Care Trust™',
    price: '$99',
    hook: 'Every family deserves peace of mind knowing their loved one will always be protected.',
    subtitle: 'Protect and support a loved one with special needs—without putting their benefits or future at risk.',
    description: 'The Heirway Special Care Trust is designed for families who want to provide financial support for a child or loved one with special needs while ensuring assets are managed responsibly on their behalf.',
    details: 'This trust allows funds and assets to be used for the benefit of the individual without being owned by them directly, helping preserve eligibility for certain assistance programs while still providing resources for a better quality of life.',
    bankingNote: 'A trusted guardian or trustee manages the funds and ensures they are used for the individual\'s care, education, housing, or other needs according to the terms of the trust.',
    features: [
      'Special Needs Trust structure integrated with your estate plan',
      'Funds available for a beneficiary without direct ownership',
      'Protection of eligibility for certain government assistance programs',
      'Trustee or guardian oversight for responsible financial management',
      'Long-term care and support planning for your loved one',
      'Private administration outside of probate',
      'Protects children from inheriting assets at 18—allows structured distributions over time',
    ],
    whyAdd: 'Families with a loved one who has special needs often worry about what will happen when they are no longer able to provide support.',
    whyAddDetail: 'A Special Care Trust helps ensure that financial resources remain available, benefits are not unintentionally disrupted, a trusted person manages funds responsibly, and long-term care planning is clearly defined. Most importantly, it gives families peace of mind knowing their loved one will always have support and protection.',
    idealFor: [
      'Parents of children with special needs',
      'Families caring for a disabled adult',
      'Individuals receiving government assistance programs',
      'Families planning long-term guardianship and care',
    ],
    cta: 'Add Special Care Trust',
    ctaAdded: 'Added to Your Plan',
    ctaSubtext: 'Provide lifelong support and protection for a loved one who needs it most.',
    icon: Heart,
  },
};

export default function UpsellCard({ type, added = false, onAdd }: UpsellCardProps) {
  const data = UPSELL_DATA[type];
  const Icon = data.icon;

  return (
    <Card className={`glass-panel overflow-hidden transition-all duration-300 ${added ? 'border-primary/50 ring-1 ring-primary/20' : 'border-accent/30'}`}>
      <div className="h-1 bg-gradient-to-r from-accent via-primary to-accent" />
      <CardContent className="p-6 md:p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="font-display font-bold text-foreground text-lg">{data.name}</h3>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-display font-bold text-foreground">{data.price}</span>
              <span className="text-sm text-muted-foreground">/ month</span>
            </div>
          </div>
        </div>

        {/* Hook */}
        <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3 mb-4">
          <p className="text-sm font-medium text-green-600 dark:text-green-400 italic">{data.hook}</p>
        </div>

        <p className="font-medium text-foreground mb-2">{data.subtitle}</p>
        <p className="text-sm text-muted-foreground mb-3">{data.description}</p>
        <p className="text-sm text-muted-foreground mb-3">{data.details}</p>
        <p className="text-sm text-muted-foreground mb-5">{data.bankingNote}</p>

        {/* Features */}
        <div className="space-y-2 mb-5">
          <p className="text-xs font-medium text-foreground/70 uppercase tracking-wider">What This Adds to Your Trust Plan</p>
          {data.features.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <span className="text-sm text-muted-foreground">{item}</span>
            </div>
          ))}
        </div>

        {/* Why Families Add This */}
        <div className="mb-5">
          <p className="text-xs font-medium text-foreground/70 uppercase tracking-wider mb-2">Why Families Add This</p>
          <p className="text-sm text-muted-foreground mb-2">{data.whyAdd}</p>
          <p className="text-sm text-muted-foreground">{data.whyAddDetail}</p>
        </div>

        {/* Ideal For */}
        <div className="space-y-2 mb-6">
          <p className="text-xs font-medium text-foreground/70 uppercase tracking-wider">Ideal For</p>
          {data.idealFor.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <span className="text-sm text-muted-foreground">{item}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="border-t border-border pt-5">
          <div className="text-center mb-3">
            <div className="flex items-baseline justify-center gap-1 mb-1">
              <span className="text-2xl font-display font-bold text-foreground">{data.price}</span>
              <span className="text-sm text-muted-foreground">/ month</span>
            </div>
            <p className="text-sm text-muted-foreground">{data.ctaSubtext}</p>
          </div>
          <Button
            onClick={onAdd}
            className={`w-full ${added ? 'bg-primary text-primary-foreground' : 'bg-gradient-to-r from-accent to-primary text-primary-foreground'}`}
          >
            {added ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                {data.ctaAdded}
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                {data.cta}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
