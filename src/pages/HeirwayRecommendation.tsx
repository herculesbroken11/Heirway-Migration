import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useForceLightMode } from '@/hooks/useForceLightMode';
import { Shield, Star, Check, ArrowRight } from 'lucide-react';
import { HEIRWAY_TRUST_PACKAGES } from '@/lib/heirwayPlans';
import { useAuth } from '@/hooks/useAuth';

// Map legacy quiz recommendations to new package IDs.
const RECOMMENDATION_MAP: Record<string, string> = {
  foundation: 'foundation',        // legacy id → new foundation package
  business: 'business',
  wealth_builder: 'wealth_builder',
  legacy: 'legacy',
};

export default function HeirwayRecommendation() {
  useForceLightMode();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recommendedId, setRecommendedId] = useState<string>('foundation');

  useEffect(() => {
    const stored = sessionStorage.getItem('heirway_recommended_plan');
    if (stored) setRecommendedId(RECOMMENDATION_MAP[stored] || 'foundation');
    window.scrollTo(0, 0);
  }, []);

  const packageOrder = ['legacy', 'foundation', 'business', 'wealth_builder'];

  const handleSelectPackage = (pkgId: string) => {
    const pkg = HEIRWAY_TRUST_PACKAGES[pkgId];
    if (pkg?.isWealthBuilder) {
      sessionStorage.setItem('heirway_selected_plan', 'wealth_builder');
      sessionStorage.setItem('heirway_wealth_builder_diagnostic', 'true');
      navigate('/diagnostic');
      return;
    }
    sessionStorage.setItem('heirway_selected_package', pkgId);
    navigate(user ? '/heirway/checkout' : '/login');
  };

  const handleFreeStart = () => {
    sessionStorage.setItem('heirway_free_path', 'true');
    navigate(user ? '/heirway/dashboard' : '/login');
  };

  return (
    <div className="min-h-screen gradient-bg">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 p-4 md:p-8">
        <div className="max-w-6xl mx-auto mb-8 md:mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="font-display font-bold text-foreground text-lg">Heirway</h1>
          </div>

          <div className="text-center animate-fade-in">
            <Badge className="bg-primary/10 text-primary border-primary/20 mb-4">
              <Star className="w-3 h-3 mr-1" />
              Your Recommendation
            </Badge>
            <h2 className="text-2xl md:text-4xl font-display font-bold text-foreground mb-3">
              Our Trust Packages
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Based on your answers, we've highlighted the package that best fits your situation. Every Heirway
              package avoids probate, keeps your estate private, protects assets, and creates a clear structure
              for passing wealth to the next generation. All packages can be paid in cash or over 6 or 12 months.
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-4">
          {packageOrder.map((pkgId) => {
            const pkg = HEIRWAY_TRUST_PACKAGES[pkgId];
            const isRecommended = pkgId === recommendedId;
            const isWB = pkg.isWealthBuilder;

            return (
              <Card
                key={pkgId}
                className={`glass-panel overflow-hidden flex flex-col transition-all duration-300 ${
                  isRecommended
                    ? 'border-primary/50 shadow-glow ring-1 ring-primary/20 scale-[1.02]'
                    : 'hover:border-primary/20'
                }`}
              >
                {isRecommended && <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />}
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="min-h-[24px] mb-3 flex gap-2">
                    {isRecommended && (
                      <Badge className="bg-primary/15 text-primary border-primary/30 text-xs">
                        <Star className="w-3 h-3 mr-1" />
                        Recommended
                      </Badge>
                    )}
                    {isWB && (
                      <Badge className="bg-destructive/10 text-destructive border-destructive/30 text-xs">
                        4 clients/mo
                      </Badge>
                    )}
                  </div>

                  <h3 className="font-display font-bold text-foreground text-xl mb-1">{pkg.name}</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    {pkg.trustCount} {pkg.trustCount === 1 ? 'Trust' : 'Trusts'}
                  </p>

                  <div className="mb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-display font-bold text-foreground">
                        ${pkg.cashPrice.toLocaleString()}
                      </span>
                      {!isWB && <span className="text-xs text-muted-foreground">cash</span>}
                    </div>
                    {!isWB && (
                      <p className="text-xs text-muted-foreground mt-1">
                        or from ${pkg.twelveMonth.monthly}/mo over 12 months
                      </p>
                    )}
                    {isWB && (
                      <p className="text-xs text-primary font-medium mt-1">
                        Applies toward your full estate plan
                      </p>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground mb-4 flex-1">{pkg.bestFor}</p>

                  <div className="space-y-2 mb-6">
                    {pkg.features.map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{item}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={() => handleSelectPackage(pkgId)}
                    className={`w-full mt-auto ${
                      isRecommended ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground' : ''
                    }`}
                    variant={isRecommended ? 'default' : 'outline'}
                  >
                    {isWB ? 'Book Your Consultation' : 'Get Started'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="max-w-5xl mx-auto text-center mt-10">
          <p className="text-sm text-muted-foreground mb-3">Not ready to commit? Start exploring for free.</p>
          <Button
            onClick={handleFreeStart}
            variant="outline"
            className="rounded-full px-8 border-primary/40 text-primary hover:bg-primary/10"
          >
            {user ? 'Continue with Free Plan' : 'Get Started for Free'} <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
