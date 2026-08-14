import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { QUESTIONS, SECTIONS, type Question } from '@/lib/questions';
import { 
  calculateAllScores, 
  classifyProfile, 
  type AssessmentResponses 
} from '@/lib/scoring';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Loader2,
  User,
  Building,
  Mail,
  Phone
} from 'lucide-react';
import { toast } from 'sonner';

interface ProspectInfo {
  name: string;
  email: string;
  phone: string;
  company: string;
}

type Responses = Record<string, string | string[]>;

export default function NewAssessment() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [prospectInfo, setProspectInfo] = useState<ProspectInfo>({
    name: '',
    email: '',
    phone: '',
    company: '',
  });
  const [responses, setResponses] = useState<Responses>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 0 is prospect info, steps 1-9 are question sections
  const totalSteps = SECTIONS.length + 1;
  const progress = ((currentStep) / totalSteps) * 100;

  const currentSection = currentStep > 0 ? SECTIONS[currentStep - 1] : null;
  const currentQuestions = currentSection 
    ? QUESTIONS.filter(q => q.section === currentSection.id) 
    : [];

  const handleSingleAnswer = (questionId: string, value: string) => {
    setResponses(prev => ({ ...prev, [questionId]: value }));
  };

  const handleMultiAnswer = (questionId: string, value: string, checked: boolean) => {
    setResponses(prev => {
      const current = (prev[questionId] as string[]) || [];
      if (checked) {
        // Prevent duplicates by checking if value already exists
        if (current.includes(value)) return prev;
        return { ...prev, [questionId]: [...current, value] };
      } else {
        return { ...prev, [questionId]: current.filter(v => v !== value) };
      }
    });
  };

  const canProceed = () => {
    if (currentStep === 0) {
      return prospectInfo.name.trim().length > 0;
    }

    // Check all questions in current section have answers
    return currentQuestions.every(q => {
      const answer = responses[q.id];
      if (q.type === 'multi') {
        return Array.isArray(answer) && answer.length > 0;
      }
      return answer && typeof answer === 'string' && answer.length > 0;
    });
  };

  const handleSubmit = async () => {
    if (!canProceed()) return;
    
    setIsSubmitting(true);
    try {
      // Get current user session for created_by
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error("You must be logged in to submit");
      }

      // Create prospect
      const { data: prospect, error: prospectError } = await supabase
        .from('prospects')
        .insert({
          name: prospectInfo.name,
          email: prospectInfo.email || null,
          phone: prospectInfo.phone || null,
          company: prospectInfo.company || null,
          created_by: session.user.id,
        })
        .select()
        .single();

      if (prospectError) throw prospectError;

      // Calculate scores
      const assessmentResponses: AssessmentResponses = {
        q1_situation: (responses.q1_situation as string[]) || [],
        q2_annual_income: responses.q2_annual_income as string || '',
        q3_net_worth: responses.q3_net_worth as string || '',
        q4_income_source: responses.q4_income_source as string || '',
        q5_tax_burden: responses.q5_tax_burden as string || '',
        q6_avoided_strategies: responses.q6_avoided_strategies as string || '',
        q7_mindset: responses.q7_mindset as string || '',
        q8_decision_style: responses.q8_decision_style as string || '',
        q9_regret_pattern: responses.q9_regret_pattern as string || '',
        q10_change_concern: responses.q10_change_concern as string || '',
        q11_exit_comfort: responses.q11_exit_comfort as string || '',
        q12_veto_power: (responses.q12_veto_power as string[]) || [],
        q13_blame_allocation: responses.q13_blame_allocation as string || '',
        q14_audit_perception: responses.q14_audit_perception as string || '',
        q15_aggressiveness_concern: responses.q15_aggressiveness_concern as string || '',
        q16_control_importance: responses.q16_control_importance as string || '',
        q17_trustee_acceptance: responses.q17_trustee_acceptance as string || '',
        q18_holding_period: responses.q18_holding_period as string || '',
        q19_existing_trusts: responses.q19_existing_trusts as string || '',
        q20_intent: responses.q20_intent as string || '',
        q21_fee_preference: responses.q21_fee_preference as string || '',
        q22_savings_share: responses.q22_savings_share as string || '',
        q23_pricing_priority: responses.q23_pricing_priority as string || '',
      };

      const scores = calculateAllScores(assessmentResponses);
      const profiles = classifyProfile(scores, assessmentResponses);

      // Create assessment
      const { data: assessment, error: assessmentError } = await supabase
        .from('assessments')
        .insert({
          prospect_id: prospect.id,
          ...assessmentResponses,
          scs_score: scores.scs,
          lai_score: scores.lai,
          isi_score: scores.isi,
          adi_score: scores.adi,
          aeti_score: scores.aeti,
          csi_score: scores.csi,
          pfi_score: scores.pfi,
          primary_profile: profiles.primary,
          secondary_profile: profiles.secondary,
          created_by: session.user.id,
        })
        .select()
        .single();

      if (assessmentError) throw assessmentError;

      toast.success('Assessment completed!');
      navigate(`/assessment/${assessment.id}/results`);
    } catch (error) {
      console.error('Error submitting assessment:', error);
      toast.error('Failed to submit assessment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderProspectForm = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name" className="flex items-center gap-2">
          <User className="w-4 h-4" />
          Prospect Name *
        </Label>
        <Input
          id="name"
          value={prospectInfo.name}
          onChange={(e) => setProspectInfo(prev => ({ ...prev, name: e.target.value }))}
          placeholder="John Smith"
          className="text-lg"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="company" className="flex items-center gap-2">
          <Building className="w-4 h-4" />
          Company
        </Label>
        <Input
          id="company"
          value={prospectInfo.company}
          onChange={(e) => setProspectInfo(prev => ({ ...prev, company: e.target.value }))}
          placeholder="Acme Corp"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={prospectInfo.email}
            onChange={(e) => setProspectInfo(prev => ({ ...prev, email: e.target.value }))}
            placeholder="john@example.com"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="phone" className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Phone
          </Label>
          <Input
            id="phone"
            type="tel"
            value={prospectInfo.phone}
            onChange={(e) => setProspectInfo(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="(555) 123-4567"
          />
        </div>
      </div>
    </div>
  );

  const renderQuestion = (question: Question) => {
    if (question.type === 'single') {
      return (
        <RadioGroup
          value={(responses[question.id] as string) || ''}
          onValueChange={(value) => handleSingleAnswer(question.id, value)}
          className="space-y-3"
        >
          {question.options.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
            >
              <RadioGroupItem value={option.value} id={`${question.id}-${option.value}`} />
              <span className="text-sm font-medium">{option.label}</span>
            </label>
          ))}
        </RadioGroup>
      );
    }

    const selectedValues = (responses[question.id] as string[]) || [];
    return (
      <div className="space-y-3">
        {question.options.map((option) => (
          <label
            key={option.value}
            className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
          >
            <Checkbox
              checked={selectedValues.includes(option.value)}
              onCheckedChange={(checked) => 
                handleMultiAnswer(question.id, option.value, checked as boolean)
              }
            />
            <span className="text-sm font-medium">{option.label}</span>
          </label>
        ))}
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-3xl mx-auto">
        {/* Progress Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-display font-bold text-foreground">
              New Assessment
            </h1>
            <span className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {totalSteps}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Current Step Content */}
        <Card className="shadow-card animate-fade-in">
          <CardHeader>
            <CardTitle>
              {currentStep === 0 
                ? 'Prospect Information' 
                : `Section ${currentSection?.id}: ${currentSection?.title}`
              }
            </CardTitle>
            <CardDescription>
              {currentStep === 0
                ? 'Enter basic information about the prospect'
                : `Questions ${currentQuestions[0]?.number} - ${currentQuestions[currentQuestions.length - 1]?.number}`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentStep === 0 ? (
              renderProspectForm()
            ) : (
              <div className="space-y-8">
                {currentQuestions.map((question) => (
                  <div key={question.id} className="space-y-4">
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-semibold flex items-center justify-center">
                        {question.number}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-foreground mb-1">{question.question}</p>
                        <p className="text-xs text-muted-foreground italic mb-4">Client sees: {question.clientQuestion}</p>
                        {renderQuestion(question)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {currentStep < totalSteps - 1 ? (
            <Button
              onClick={() => setCurrentStep(prev => prev + 1)}
              disabled={!canProceed()}
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || isSubmitting}
              className="bg-accent hover:bg-accent/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Complete Assessment
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
