import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, ArrowRight } from 'lucide-react';
import { useForceLightMode } from '@/hooks/useForceLightMode';
import UpsellCard from '@/components/heirway/UpsellCard';
import heirwayLogo from '@/assets/heirway-logo-transparent.png';

interface StoredAnswers {
  housing_situation?: string;
  has_special_needs?: boolean | null;
}

export default function HeirwayEnhance() {
  useForceLightMode();
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<StoredAnswers>({});
  const [addedUpsells, setAddedUpsells] = useState<string[]>([]);

  useEffect(() => {
    const selectedPlan = sessionStorage.getItem('heirway_selected_plan');
    if (selectedPlan !== 'foundation') {
      navigate('/heirway/dashboard');
      return;
    }

    const answersStr = sessionStorage.getItem('heirway_answers');
    if (answersStr) {
      try { setAnswers(JSON.parse(answersStr)); } catch {}
    }

    window.scrollTo(0, 0);
  }, [navigate]);

  const isHomeowner = answers.housing_situation === 'mortgage' || answers.housing_situation === 'paid_off';
  const hasSpecialNeeds = answers.has_special_needs === true;
  const showLegacyUpsell = isHomeowner;
  const showSpecialCareUpsell = hasSpecialNeeds;

  const toggleUpsell = (upsellId: string) => {
    setAddedUpsells(prev =>
      prev.includes(upsellId)
        ? prev.filter(id => id !== upsellId)
        : [...prev, upsellId]
    );
  };

  const handleContinue = () => {
    sessionStorage.setItem('heirway_upsells', JSON.stringify(addedUpsells));
    navigate('/heirway/checkout');
  };

  if (!showLegacyUpsell && !showSpecialCareUpsell) {
    sessionStorage.setItem('heirway_upsells', JSON.stringify([]));
    navigate('/heirway/checkout');
    return null;
  }

  return (
    <div className="min-h-screen gradient-bg">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 p-4 md:p-8">
        {/* Header */}
        <div className="max-w-3xl mx-auto mb-8 md:mb-12">
          <div className="flex justify-center mb-2">
            <img src={heirwayLogo} alt="Heirway" className="h-36 w-auto" />
          </div>

          <div className="text-center animate-fade-in">
            <Badge className="bg-accent/10 text-accent border-accent/20 mb-4">
              <Star className="w-3 h-3 mr-1" />
              Enhance Your Plan
            </Badge>
            <h2 className="text-2xl md:text-4xl font-display font-bold text-foreground mb-3">
              Strengthen Your Foundation Plan
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Based on your situation, these add-ons can provide additional protection for your family. Add them now or continue without.
            </p>
          </div>
        </div>

        {/* Upsell Cards */}
        <div className="max-w-3xl mx-auto space-y-6 mb-8">
          {showLegacyUpsell && (
            <UpsellCard
              type="legacy_insurance"
              added={addedUpsells.includes('legacy_insurance')}
              onAdd={() => toggleUpsell('legacy_insurance')}
            />
          )}

          {showSpecialCareUpsell && (
            <UpsellCard
              type="special_care"
              added={addedUpsells.includes('special_care')}
              onAdd={() => toggleUpsell('special_care')}
            />
          )}
        </div>

        {/* Continue */}
        <div className="max-w-3xl mx-auto text-center">
          <Button
            onClick={handleContinue}
            className="bg-gradient-to-r from-primary to-accent text-primary-foreground px-8"
            size="lg"
          >
            {addedUpsells.length > 0 ? 'Continue with Add-ons' : 'Continue Without Add-ons'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
