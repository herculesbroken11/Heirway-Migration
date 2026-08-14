import { useState, useEffect, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';
import { US_STATES, getRecommendedPlan } from '@/lib/heirwayPlans';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface QuestionnaireAnswers {
  is_18_plus: boolean | null;
  state: string;
  is_married: boolean | null;
  has_children: boolean | null;
  housing_situation: string;
  estate_plan_purposes: string[];
  has_special_needs: boolean | null;
  over_1m_assets: boolean | null;
  business_ownership: string;
  employment_type: string;
}

const initialAnswers: QuestionnaireAnswers = {
  is_18_plus: null,
  state: '',
  is_married: null,
  has_children: null,
  housing_situation: '',
  estate_plan_purposes: [],
  has_special_needs: null,
  over_1m_assets: null,
  business_ownership: '',
  employment_type: '',
};

const ESTATE_PLAN_OPTIONS = [
  { value: 'family_banking', label: 'Family banking' },
  { value: 'life_insurance', label: 'Life insurance' },
  { value: 'trust_fund', label: "Trust Fund for heirs if I don't wake up tomorrow" },
  { value: 'none', label: 'None of these at this time' },
];

const HeirwayQuestionnaire = forwardRef<HTMLDivElement>(function HeirwayQuestionnaire(_props, _ref) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<QuestionnaireAnswers>(initialAnswers);
  const [blocked, setBlocked] = useState(false);

  const handleBooleanAnswer = (key: keyof QuestionnaireAnswers, value: boolean) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
    if (key === 'is_18_plus' && !value) {
      setBlocked(true);
      return;
    }
    setTimeout(() => setStep(s => s + 1), 300);
  };

  const handleStringAnswer = (key: keyof QuestionnaireAnswers, value: string) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const handlePurposeToggle = (value: string) => {
    setAnswers(prev => {
      if (value === 'none') return { ...prev, estate_plan_purposes: ['none'] };
      const current = prev.estate_plan_purposes.filter(v => v !== 'none');
      const updated = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
      return { ...prev, estate_plan_purposes: updated };
    });
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 0: return answers.is_18_plus !== null;
      case 1: return answers.state !== '';
      case 2: return answers.is_married !== null;
      case 3: return answers.has_children !== null;
      case 4: return answers.housing_situation !== '';
      case 5: return answers.estate_plan_purposes.length > 0;
      case 6: return answers.has_special_needs !== null;
      case 7: return answers.over_1m_assets !== null;
      case 8: return answers.business_ownership !== '';
      case 9: return answers.employment_type !== '';
      default: return false;
    }
  };

  const handleSubmit = async () => {
    const recommended = getRecommendedPlan({
      over_1m_assets: answers.over_1m_assets!,
      business_ownership: answers.business_ownership,
      housing_situation: answers.housing_situation,
    });
    sessionStorage.setItem('heirway_answers', JSON.stringify(answers));
    sessionStorage.setItem('heirway_recommended_plan', recommended);

    // Persist questionnaire answers to client record for admin visibility
    if (user) {
      try {
        const { data: clientData } = await supabase
          .from('heirway_clients')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (clientData) {
          await supabase.from('heirway_clients').update({
            questionnaire_answers: { ...answers, recommended_plan: recommended, completed_at: new Date().toISOString() },
          } as any).eq('id', clientData.id);
        }
      } catch {
        // Don't block navigation
      }
    }

    navigate('/heirway/recommendation');
  };

  const totalSteps = 10;
  const progress = ((step + 1) / totalSteps) * 100;

  if (blocked) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-xl font-display font-bold text-foreground mb-2">Age Requirement</h2>
        <p className="text-muted-foreground mb-6">You must be at least 18 years old to use Heirway services.</p>
        <Button variant="outline" onClick={() => { setBlocked(false); setAnswers(initialAnswers); setStep(0); }}>Go Back</Button>
      </div>
    );
  }

  const BooleanQuestion = ({ question, answerKey }: { question: string; answerKey: keyof QuestionnaireAnswers }) => (
    <div className="space-y-6">
      <h3 className="text-lg md:text-xl font-display font-bold text-foreground">{question}</h3>
      <div className="grid grid-cols-2 gap-4">
        {['Yes', 'No'].map(opt => (
          <button
            key={opt}
            onClick={() => handleBooleanAnswer(answerKey, opt === 'Yes')}
            className={`p-4 rounded-xl border text-center font-medium transition-all duration-300 ${
              answers[answerKey] === (opt === 'Yes')
                ? 'bg-primary/15 border-primary/50 text-foreground'
                : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-primary/10 hover:border-primary/40'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );

  const steps = [
    <BooleanQuestion key="age" question="Are you at least 18 years old?" answerKey="is_18_plus" />,
    <div key="state" className="space-y-6">
      <h3 className="text-lg md:text-xl font-display font-bold text-foreground">What state do you live in?</h3>
      <Select value={answers.state} onValueChange={v => { handleStringAnswer('state', v); setTimeout(() => setStep(s => s + 1), 300); }}>
        <SelectTrigger className="h-12 bg-muted/30 border-border/40"><SelectValue placeholder="Select your state" /></SelectTrigger>
        <SelectContent className="max-h-60">{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
      </Select>
    </div>,
    <BooleanQuestion key="married" question="Are you married?" answerKey="is_married" />,
    <BooleanQuestion key="children" question="Do you have children?" answerKey="has_children" />,
    <div key="housing" className="space-y-6">
      <h3 className="text-lg md:text-xl font-display font-bold text-foreground">What is your housing situation?</h3>
      <div className="space-y-3">
        {[
          { value: 'mortgage', label: 'I own my home (paying a mortgage)' },
          { value: 'paid_off', label: 'I own my home (paid off)' },
          { value: 'renting', label: 'I am renting' },
        ].map(opt => (
          <button key={opt.value} onClick={() => { handleStringAnswer('housing_situation', opt.value); setTimeout(() => setStep(s => s + 1), 300); }}
            className={`w-full p-4 rounded-xl border text-left font-medium transition-all duration-300 ${
              answers.housing_situation === opt.value ? 'bg-primary/15 border-primary/50 text-foreground' : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-primary/10'
            }`}>{opt.label}</button>
        ))}
      </div>
    </div>,
    <div key="purposes" className="space-y-6">
      <h3 className="text-lg md:text-xl font-display font-bold text-foreground">Do you plan to use this estate plan for any of the following?</h3>
      <p className="text-sm text-muted-foreground">Check all that apply or select "None of these at this time."</p>
      <div className="space-y-3">
        {ESTATE_PLAN_OPTIONS.map(opt => {
          const isChecked = answers.estate_plan_purposes.includes(opt.value);
          return (
            <button key={opt.value} onClick={() => handlePurposeToggle(opt.value)}
              className={`w-full p-4 rounded-xl border text-left font-medium transition-all duration-300 flex items-center gap-3 ${
                isChecked ? 'bg-primary/15 border-primary/50 text-foreground' : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-primary/10'
              }`}>
              <Checkbox checked={isChecked} className="pointer-events-none" onCheckedChange={() => {}} />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>,
    <BooleanQuestion key="special_needs" question="Does anyone in your family require special needs care?" answerKey="has_special_needs" />,
    <BooleanQuestion key="assets" question="Do you have over $1M in assets?" answerKey="over_1m_assets" />,
    <div key="business" className="space-y-6">
      <h3 className="text-lg md:text-xl font-display font-bold text-foreground">Do you own a business?</h3>
      <div className="space-y-3">
        {[
          { value: 'single', label: 'Yes — I own a business' },
          { value: 'side_hustle', label: 'Yes — I have a side hustle' },
          { value: 'multiple', label: 'Yes — I own multiple businesses' },
          { value: 'none', label: 'No — I do not own a business' },
        ].map(opt => (
          <button key={opt.value} onClick={() => { handleStringAnswer('business_ownership', opt.value); setTimeout(() => setStep(s => s + 1), 300); }}
            className={`w-full p-4 rounded-xl border text-left font-medium transition-all duration-300 ${
              answers.business_ownership === opt.value ? 'bg-primary/15 border-primary/50 text-foreground' : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-primary/10'
            }`}>{opt.label}</button>
        ))}
      </div>
    </div>,
    <div key="employment" className="space-y-6">
      <h3 className="text-lg md:text-xl font-display font-bold text-foreground">Are you primarily W2 or 1099?</h3>
      <div className="space-y-3">
        {[
          { value: 'w2', label: 'W2' },
          { value: '1099', label: '1099 / Self-Employed' },
          { value: 'both', label: 'Both' },
        ].map(opt => (
          <button key={opt.value} onClick={() => handleStringAnswer('employment_type', opt.value)}
            className={`w-full p-4 rounded-xl border text-left font-medium transition-all duration-300 ${
              answers.employment_type === opt.value ? 'bg-primary/15 border-primary/50 text-foreground' : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-primary/10'
            }`}>{opt.label}</button>
        ))}
      </div>
    </div>,
  ];

  return (
    <div>
      {/* Progress */}
      <div className="mb-6">
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-xs text-muted-foreground mt-2">Question {step + 1} of {totalSteps}</p>
      </div>

      {/* Question */}
      <div className="animate-fade-in">{steps[step]}</div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 gap-2">
        <Button variant="ghost" onClick={() => setStep(s => s - 1)} disabled={step === 0} className="text-muted-foreground flex-shrink-0">
          <ArrowLeft className="w-4 h-4 mr-2" />Back
        </Button>
        {step === totalSteps - 1 ? (
          <Button onClick={handleSubmit} disabled={!canProceed()} className="bg-gradient-to-r from-primary to-accent text-primary-foreground flex-shrink-0 whitespace-nowrap">
            See My Recommendation<ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()} variant="outline" className="flex-shrink-0">
            Next<ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
});

export default HeirwayQuestionnaire;
