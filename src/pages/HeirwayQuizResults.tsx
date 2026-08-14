import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useForceLightMode } from '@/hooks/useForceLightMode';
import { CheckCircle, ArrowRight, Phone, Mail } from 'lucide-react';
import { QuizResult } from '@/lib/trustQuiz';
import { useAuth } from '@/hooks/useAuth';
import heirwayLogo from '@/assets/heirway-logo-transparent.png';

export default function HeirwayQuizResults() {
  useForceLightMode();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [result, setResult] = useState<QuizResult | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('heirway_quiz_result');
    if (stored) {
      setResult(JSON.parse(stored));
    } else {
      navigate('/heirway');
    }
    window.scrollTo(0, 0);
  }, [navigate]);

  if (!result) return null;

  const handleBookCall = () => {
    if (user) {
      navigate('/heirway/meeting-request');
    } else {
      sessionStorage.setItem('heirway_post_login_redirect', '/heirway/quiz-results');
      navigate('/login');
    }
  };

  const handleSelectPlan = (planId: string) => {
    sessionStorage.setItem('heirway_selected_plan', planId);
    if (planId === 'wealth_builder') {
      sessionStorage.setItem('heirway_wealth_builder_diagnostic', 'true');
      navigate('/diagnostic');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen gradient-bg">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 p-4 md:p-8">
        <div className="max-w-3xl mx-auto mb-8">
          <div className="flex items-center gap-3 mb-8">
            <Link to="/heirway">
              <img src={heirwayLogo} alt="Heirway" className="h-20 w-auto" />
            </Link>
          </div>

          {/* Verification Message */}
          <div className="text-center animate-fade-in mb-10">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Mail className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl md:text-4xl font-display font-bold text-foreground mb-4">
              Thank You for Getting Started
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-2">
              Check your email to verify your account and log in to access the Heirway portal.
            </p>
            <p className="text-sm text-muted-foreground/70 max-w-md mx-auto">
              Once verified, you'll have free access to the portal where you can explore your options, track your assets, and upgrade if you choose.
            </p>
          </div>

          {/* Primary CTA — Book Call */}
          <div className="text-center animate-fade-in space-y-4 mb-12">
            <h4 className="font-display font-bold text-foreground text-lg">Want to speak with someone first?</h4>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              We'll map out the right structure for your situation and show you what it would look like to protect your assets.
            </p>
            <Button
              onClick={handleBookCall}
              size="lg"
              className="bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-full px-10"
            >
              <Phone className="w-4 h-4 mr-2" />
              Book a Complimentary Call
            </Button>
          </div>

          {/* Plans Section — always visible */}
          <div id="plans-section" className="mt-12 animate-fade-in">
            <div className="text-center mb-8">
              <h3 className="text-xl md:text-2xl font-display font-bold text-foreground mb-2">
                Our Private Trust Plans
              </h3>
              <p className="text-sm text-muted-foreground">
                Every plan avoids probate, keeps your estate private, protects assets, and creates a clear structure for passing wealth.
              </p>
            </div>

            <div className="grid gap-4">
              {/* Free */}
              <PlanCard
                name="Free — See Where You Stand"
                price="$0"
                priceLabel="forever"
                features={[
                  'Introductory training videos',
                  'Asset tracker with risk alerts',
                  'Estate net worth overview',
                  'Document vault',
                  'Knowledgebase access',
                ]}
                onSelect={() => {
                  sessionStorage.setItem('heirway_free_path', 'true');
                  navigate('/login');
                }}
                ctaLabel={user ? 'Continue with Free Plan' : 'Get Started for Free'}
              />

              {/* Education */}
              <PlanCard
                name="Heirway Education"
                price="$19.99"
                priceLabel="/ month"
                features={[
                  'Everything in Free',
                  'Monthly live & recorded private trust trainings',
                  'Progress tracking',
                ]}
                onSelect={() => handleSelectPlan('education')}
              />

              {/* Private Trust Plans */}
              <PlanCard
                name="Private Trust Plans"
                price="Starting at $199"
                priceLabel="/ month"
                highlighted
                badge="Recommended"
                features={[
                  'Private trust creation & full estate plan',
                  'Private trust templates',
                  'Asset protection & tax strategy integration',
                  'Trust Vault + secure document management',
                  'Family governance (trustees, beneficiaries, roles)',
                  'Ongoing education & support',
                ]}
                note="Every plan is customized based on your assets, goals, and family structure."
                onSelect={() => navigate('/heirway/recommendation')}
                ctaLabel="See Plan Options"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanCard({
  name, price, priceLabel, features, onSelect, highlighted, badge, note, ctaLabel,
}: {
  name: string;
  price: string;
  priceLabel: string;
  features: string[];
  onSelect: () => void;
  highlighted?: boolean;
  badge?: string;
  note?: string;
  ctaLabel?: string;
}) {
  return (
    <Card className={`glass-panel transition-all ${highlighted ? 'border-primary/50 ring-1 ring-primary/20' : ''}`}>
      {highlighted && <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />}
      <CardContent className="p-5 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-display font-bold text-foreground">{name}</h4>
            {badge && (
              <Badge className="bg-primary/15 text-primary border-primary/30 text-xs">
                {badge}
              </Badge>
            )}
          </div>
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-xl font-display font-bold text-foreground">{price}</span>
            <span className="text-xs text-muted-foreground">{priceLabel}</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <span className="text-xs text-muted-foreground">{f}</span>
              </div>
            ))}
          </div>
          {note && <p className="text-xs text-primary/80 mt-2">{note}</p>}
        </div>
        <Button
          onClick={onSelect}
          variant={highlighted ? 'default' : 'outline'}
          className={`flex-shrink-0 ${highlighted ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground' : ''}`}
        >
          {ctaLabel || 'Get Started'} <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}
