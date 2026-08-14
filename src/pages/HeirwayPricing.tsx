import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useForceLightMode } from '@/hooks/useForceLightMode';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Check, ArrowRight, Shield, Sparkles, Star, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import heirwayLogo from '@/assets/heirway-logo-transparent.png';
import { useAuth } from '@/hooks/useAuth';
import {
  HEIRWAY_SUBSCRIPTIONS,
  HEIRWAY_TRUST_PACKAGES,
  ADDITIONAL_TRUST_PRICE,
  CREATOR_MATCHING_PRICE,
  TrustPackage,
} from '@/lib/heirwayPlans';
import { checkPremiumEligibility, PREMIUM_SUBSCRIPTION_IDS } from '@/lib/subscriptionAccess';

export default function HeirwayPricing() {
  useForceLightMode();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [premiumEligible, setPremiumEligible] = useState(false);

  useEffect(() => {
    if (!user) { setPremiumEligible(false); return; }
    checkPremiumEligibility().then(r => setPremiumEligible(r.eligible));
  }, [user]);

  const handleSelectSubscription = (id: string) => {
    if (id === 'free') {
      sessionStorage.setItem('heirway_selected_plan', 'free');
      sessionStorage.setItem('heirway_free_path', 'true');
      navigate(user ? '/heirway/dashboard' : '/login');
      return;
    }
    if (PREMIUM_SUBSCRIPTION_IDS.has(id) && !premiumEligible) {
      toast.error('Steward and Gold require a trust package purchase or admin access.', {
        description: 'Purchase a trust package below, or contact support for admin-granted access.',
      });
      return;
    }
    sessionStorage.setItem('heirway_selected_subscription', id);
    navigate(user ? '/heirway/checkout' : '/login');
  };

  const handleSelectPackage = (pkg: TrustPackage) => {
    if (pkg.isWealthBuilder) {
      sessionStorage.setItem('heirway_selected_plan', 'wealth_builder');
      navigate(user ? '/heirway/onboarding-call' : '/login');
      return;
    }
    sessionStorage.setItem('heirway_selected_package', pkg.id);
    navigate(user ? '/heirway/checkout' : '/login');
  };

  const handleTakeQuiz = () => {
    if (user) navigate('/heirway/trust-questionnaire');
    else navigate('/heirway/quiz');
  };

  const subscriptions = ['free', 'essentials', 'steward', 'gold'];
  const packages = ['legacy', 'foundation', 'business', 'wealth_builder'];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-card/90 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to={user ? '/heirway/dashboard' : '/heirway'} className="shrink-0">
            <img src={heirwayLogo} alt="Heirway" className="h-28 w-auto" />
          </Link>
          {!user && (
            <div className="hidden md:flex items-center gap-8 text-sm flex-1 justify-center pl-12">
              {['Why Heirway', 'How it Works', 'Pricing', 'FAQ', 'Contact'].map(l => (
                <Link
                  key={l}
                  to={l === 'Pricing' ? '/heirway/pricing' : `/heirway#${l.toLowerCase().replace(/\s+/g, '-')}`}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {l}
                </Link>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3 shrink-0">
            {user ? (
              <Link to="/heirway/dashboard">
                <Button variant="ghost" className="rounded-full px-5 h-9 text-sm">← Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/login?mode=login"><Button variant="ghost" className="rounded-full px-5 h-9 text-sm">Login</Button></Link>
                <Button onClick={() => handleSelectSubscription('free')} className="rounded-full px-5 h-9 text-sm bg-foreground text-background hover:bg-foreground/90">
                  Get Started for Free
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-12 md:py-20">
        {/* Hero */}
        <div className="text-center mb-14">
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-medium mb-4">Pricing</p>
          <h1 className="text-3xl md:text-5xl font-display font-bold mb-4 leading-tight">
            Your Estate.
            <br />
            <span className="text-primary">Built to Last.</span>
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Choose the trust package that fits your family, your assets, and your goals. Own it outright — no ongoing purchase required.
          </p>
        </div>

        {/* Quiz CTA */}
        <div className="mb-16 glass-panel rounded-2xl p-8 md:p-10 text-center">
          <Badge className="bg-primary/10 text-primary border-primary/20 mb-4 text-xs">
            <Sparkles className="w-3 h-3 mr-1" />
            Recommended First Step
          </Badge>
          <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-3">
            Not Sure Which Package Fits?
          </h2>
          <p className="text-base text-muted-foreground max-w-lg mx-auto mb-6 leading-relaxed">
            Answer a few questions and we'll recommend the right trust package for your situation.
          </p>
          <Button onClick={handleTakeQuiz} size="lg" className="rounded-full px-10 bg-gradient-to-r from-primary to-accent text-primary-foreground">
            Take the Quiz
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* ─────────── TRUST PACKAGES ─────────── */}
        <section className="mb-20">
          <div className="text-center mb-8">
            <Badge className="bg-primary/10 text-primary border-primary/20 mb-3">
              <Shield className="w-3 h-3 mr-1" />
              Trust Packages
            </Badge>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
              One-Time Trust Purchase
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              Choose the package that fits your family. Pay in full or spread payments over 6 or 12 months.
            </p>
          </div>

          <Tabs defaultValue="12mo" className="w-full">
            <TabsList className="mx-auto mb-8 grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="12mo">12 Months</TabsTrigger>
              <TabsTrigger value="6mo">6 Months</TabsTrigger>
              <TabsTrigger value="cash">Cash</TabsTrigger>
            </TabsList>

            {(['12mo', '6mo', 'cash'] as const).map(mode => (
              <TabsContent key={mode} value={mode}>
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                  {packages.map(id => {
                    const pkg = HEIRWAY_TRUST_PACKAGES[id];
                    const isRecommended = pkg.recommended;
                    const isWB = pkg.isWealthBuilder;

                    return (
                      <Card
                        key={id}
                        className={`glass-panel overflow-hidden flex flex-col ${
                          isRecommended ? 'border-primary/50 ring-1 ring-primary/20' : 'hover:border-primary/20'
                        }`}
                      >
                        {isRecommended
                          ? <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
                          : <div className="h-1" />}
                        <CardContent className="p-6 flex flex-col h-full">

                          <div className="flex items-center gap-2 mb-3 min-h-[24px] flex-wrap">
                            {isRecommended && (
                              <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] leading-tight">
                                <Star className="w-3 h-3 mr-1" />
                                {pkg.recommendedLabel || 'Recommended'}
                              </Badge>
                            )}
                            {isWB && (
                              <Badge className="bg-destructive/10 text-destructive border-destructive/30 text-[10px] leading-tight">
                                4 clients/mo
                              </Badge>
                            )}
                          </div>

                          <h3 className="font-display font-bold text-foreground text-2xl mb-4 leading-tight">{pkg.name}</h3>

                          {/* Price display by mode */}
                          <div className="mb-4">
                          {isWB ? (
                            <>
                              <p className="text-3xl font-display font-bold text-primary leading-tight">
                                ${pkg.cashPrice.toLocaleString()}
                              </p>
                              <p className="text-[11px] text-muted-foreground mt-2 leading-snug">Consultation fee — applies toward your estate plan</p>
                            </>
                          ) : mode === 'cash' ? (
                            <>
                              <p className="text-3xl font-display font-bold text-primary leading-tight">
                                ${pkg.cashPrice.toLocaleString()}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">paid in full</p>
                              <p className="text-[11px] text-primary/80 font-medium mt-2 leading-snug">
                                Save ${pkg.cashSavings} vs. financing
                              </p>
                            </>
                          ) : mode === '6mo' ? (
                            <>
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Start for ${pkg.sixMonth.dueToday.toLocaleString()} down
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">then</p>
                              <p className="text-3xl font-display font-bold text-primary leading-tight">
                                ${pkg.sixMonth.monthly}
                                <span className="text-sm font-normal text-muted-foreground">/mo</span>
                              </p>
                              <p className="text-[11px] text-muted-foreground mt-2 leading-snug">
                                for 5 months · or pay ${pkg.cashPrice.toLocaleString()} in full and save ${pkg.cashSavings}
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Start for ${pkg.twelveMonth.dueToday.toLocaleString()} down
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">as low as</p>
                              <p className="text-3xl font-display font-bold text-primary leading-tight">
                                ${pkg.twelveMonth.monthly}
                                <span className="text-sm font-normal text-muted-foreground">/mo</span>
                              </p>
                              <p className="text-[11px] text-muted-foreground mt-2 leading-snug">
                                or pay ${pkg.cashPrice.toLocaleString()} in full and save ${pkg.cashSavings}
                              </p>
                            </>
                          )}
                          </div>

                          <p className="text-sm font-display font-semibold text-foreground mb-1 min-h-[20px]">
                            {pkg.subtitle || ''}
                          </p>
                          <p className="text-sm text-muted-foreground mb-4 min-h-[60px]">{pkg.bestFor}</p>



                          <div className="space-y-2 mb-6 flex-1">
                            {pkg.features.map((f, i) => (
                              <div key={i} className="flex items-start gap-2">
                                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                                <span className="text-xs text-muted-foreground">{f}</span>
                              </div>
                            ))}
                          </div>

                          <Button
                            onClick={() => handleSelectPackage(pkg)}
                            className={`w-full mt-auto ${
                              isRecommended ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground' : ''
                            }`}
                            variant={isRecommended ? 'default' : 'outline'}
                          >
                            {isWB ? 'Book Consultation' : 'Get Started'}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
            ))}
          </Tabs>


          <div className="mt-8 grid gap-4 md:grid-cols-2 max-w-3xl mx-auto text-sm">
            <div className="glass-panel rounded-lg p-4">
              <p className="font-bold text-foreground mb-1">Additional Trust — ${ADDITIONAL_TRUST_PRICE.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Add extra trusts to any package at any time as your family or assets grow.</p>
            </div>
            <div className="glass-panel rounded-lg p-4">
              <p className="font-bold text-foreground mb-1">Creator Matching — ${CREATOR_MATCHING_PRICE}/trust</p>
              <p className="text-xs text-muted-foreground">Every trust needs a qualified creator. Bring your own (free) or let us source, screen, and coordinate one.</p>
            </div>
          </div>
        </section>





        {/* Contact */}
        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground mb-2">
            Questions about which package or subscription is right for you?
          </p>
          <a href="/heirway#contact" className="text-primary hover:underline text-sm font-medium">
            Contact our team →
          </a>
        </div>
      </div>
    </div>
  );
}
