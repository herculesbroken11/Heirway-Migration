import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Shield, CheckCircle2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { QUESTIONS, SECTIONS } from "@/lib/questions";
import { calculateAllScores, classifyProfile, AssessmentResponses } from "@/lib/scoring";
import { useToast } from "@/hooks/use-toast";
import DiagnosticLoader from "@/components/diagnostic/DiagnosticLoader";
import heirwayLogo from "@/assets/heirway-logo.png";

interface ProspectInfo {
  name: string;
  email: string;
  phone: string;
  company: string;
}

const STORAGE_KEY = "diagnostic_progress_public";

const PublicAssessment = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<"info" | "questions">("info");
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [prospectInfo, setProspectInfo] = useState<ProspectInfo>({
    name: "",
    email: "",
    phone: "",
    company: "",
  });
  const [responses, setResponses] = useState<Record<string, string | string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasExistingProgress, setHasExistingProgress] = useState(false);
  const prevSectionRef = useRef(currentSectionIndex);
  const prevStepRef = useRef(step);
  // Honeypot field (hidden from real users, bots fill it)
  const [honeypot, setHoneypot] = useState("");
  // Timing: record when the page loaded
  const pageLoadedAt = useRef(Date.now());

  const currentSection = SECTIONS[currentSectionIndex];
  const sectionQuestions = QUESTIONS.filter(q => q.section === currentSection.id);
  const totalSections = SECTIONS.length;
  const progress = ((currentSectionIndex + 1) / totalSections) * 100;

  // Load saved progress on mount, and auto-fill for logged-in users
  useEffect(() => {
    const initAsync = async () => {
      // Check if user is logged in — skip contact info step
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: client } = await supabase
          .from('heirway_clients')
          .select('full_name, email, phone')
          .eq('user_id', user.id)
          .maybeSingle();
        const autoName = client?.full_name || user.user_metadata?.full_name || '';
        const autoEmail = client?.email || user.email || '';
        const autoPhone = client?.phone || '';
        setProspectInfo({ name: autoName, email: autoEmail, phone: autoPhone, company: '' });
        setStep("questions");
        return;
      }

      // Not logged in — try loading saved progress
      const savedProgress = localStorage.getItem(STORAGE_KEY);
      if (savedProgress) {
        try {
          const progress = JSON.parse(savedProgress);
          setHasExistingProgress(true);
          setProspectInfo(progress.prospectInfo || { name: "", email: "", phone: "", company: "" });
          setResponses(progress.responses || {});
          setCurrentSectionIndex(progress.currentSectionIndex || 0);
          if (progress.step === "questions" && progress.prospectInfo?.name) {
            setStep("questions");
          }
        } catch {
          // Invalid saved data, start fresh
        }
      }
    };
    initAsync();
  }, []);

  // Save progress whenever it changes
  useEffect(() => {
    const progressData = {
      step,
      prospectInfo,
      responses,
      currentSectionIndex,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progressData));
  }, [step, prospectInfo, responses, currentSectionIndex]);

  // Scroll to top when section or step changes
  useEffect(() => {
    if (prevSectionRef.current !== currentSectionIndex || prevStepRef.current !== step) {
      window.scrollTo({ top: 0, behavior: "instant" });
      prevSectionRef.current = currentSectionIndex;
      prevStepRef.current = step;
    }
  }, [currentSectionIndex, step]);

  const validatePhoneNumber = (phone: string): boolean => {
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length === 10;
  };

  const formatPhoneNumber = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setProspectInfo(prev => ({ ...prev, phone: formatted }));
  };

  const handleProspectInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prospectInfo.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    if (!prospectInfo.email.trim()) {
      toast({ title: "Email address is required", variant: "destructive" });
      return;
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(prospectInfo.email.trim())) {
      toast({ title: "Please enter a valid email address", variant: "destructive" });
      return;
    }
    if (!prospectInfo.phone.trim()) {
      toast({ title: "Phone number is required", variant: "destructive" });
      return;
    }
    if (!validatePhoneNumber(prospectInfo.phone)) {
      toast({ 
        title: "Invalid phone number", 
        description: "Please enter a valid 10-digit phone number",
        variant: "destructive" 
      });
      return;
    }
    setStep("questions");
  };

  const handleSingleSelect = (questionId: string, value: string) => {
    setResponses(prev => ({ ...prev, [questionId]: value }));
  };

  const handleMultiSelect = (questionId: string, value: string, checked: boolean) => {
    setResponses(prev => {
      const current = (prev[questionId] as string[]) || [];
      if (checked) {
        if (current.includes(value)) return prev;
        return { ...prev, [questionId]: [...current, value] };
      } else {
        return { ...prev, [questionId]: current.filter(v => v !== value) };
      }
    });
  };

  const canProceed = () => {
    return sectionQuestions.every(q => {
      const response = responses[q.id];
      if (q.type === "multi") {
        return Array.isArray(response) && response.length > 0;
      }
      return response && response.length > 0;
    });
  };

  const handleNext = () => {
    if (currentSectionIndex < totalSections - 1) {
      setCurrentSectionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const assessmentResponses: AssessmentResponses = {
        q1_situation: (responses.q1_situation as string[]) || [],
        q2_annual_income: responses.q2_annual_income as string,
        q3_net_worth: responses.q3_net_worth as string,
        q4_income_source: responses.q4_income_source as string,
        q5_tax_burden: responses.q5_tax_burden as string,
        q6_avoided_strategies: responses.q6_avoided_strategies as string,
        q7_mindset: responses.q7_mindset as string,
        q8_decision_style: responses.q8_decision_style as string,
        q9_regret_pattern: responses.q9_regret_pattern as string,
        q10_change_concern: responses.q10_change_concern as string,
        q11_exit_comfort: responses.q11_exit_comfort as string,
        q12_veto_power: (responses.q12_veto_power as string[]) || [],
        q13_blame_allocation: responses.q13_blame_allocation as string,
        q14_audit_perception: responses.q14_audit_perception as string,
        q15_aggressiveness_concern: responses.q15_aggressiveness_concern as string,
        q16_control_importance: responses.q16_control_importance as string,
        q17_trustee_acceptance: responses.q17_trustee_acceptance as string,
        q18_holding_period: responses.q18_holding_period as string,
        q19_existing_trusts: responses.q19_existing_trusts as string,
        q20_intent: responses.q20_intent as string,
        q21_fee_preference: responses.q21_fee_preference as string,
        q22_savings_share: responses.q22_savings_share as string,
        q23_pricing_priority: responses.q23_pricing_priority as string,
      };

      const scores = calculateAllScores(assessmentResponses);
      const profile = classifyProfile(scores, assessmentResponses);

      const { data, error } = await supabase.functions.invoke("submit-assessment", {
        body: {
          prospectInfo: {
            name: prospectInfo.name.trim(),
            email: prospectInfo.email.trim(),
            phone: prospectInfo.phone.trim(),
            company: prospectInfo.company.trim() || null,
          },
          responses: assessmentResponses,
          scores,
          profile,
          honeypot,
          startedAt: pageLoadedAt.current,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Clear saved progress after successful submission
      localStorage.removeItem(STORAGE_KEY);

      // Wealth Builder flow: diagnostic → login → checkout (skip intake)
      const isWealthBuilderFlow = sessionStorage.getItem('heirway_wealth_builder_diagnostic') === 'true';
      if (isWealthBuilderFlow) {
        sessionStorage.removeItem('heirway_wealth_builder_diagnostic');
        navigate('/login');
      } else {
        navigate("/diagnostic/complete", { state: { name: prospectInfo.name } });
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error("Submission error:", error);
      toast({
        title: "Submission failed",
        description: "Please try again or contact us directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitting) {
    return <DiagnosticLoader />;
  }

  // Info collection step (no auth required)
  if (step === "info") {
    return (
      <div className="min-h-screen gradient-bg">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
        </div>


        <main className="relative z-10 container mx-auto px-4 py-12 max-w-2xl">
          <Card className="glass-panel overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-primary via-secondary to-primary" />
            
            <CardHeader className="text-center pb-8 pt-10">
              <div className="mx-auto mb-4">
                <img src={heirwayLogo} alt="Heirway" className="h-16 w-auto mx-auto" />
              </div>
              <CardTitle className="text-3xl font-display">Trust Structural Readiness & Risk Review</CardTitle>
              <CardDescription className="text-base mt-3 max-w-md mx-auto leading-relaxed">
                This confidential review will help us understand your unique situation and provide a personalized consult for your trust planning needs.
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-10">
              <form onSubmit={handleProspectInfoSubmit} className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={prospectInfo.name}
                      onChange={(e) => setProspectInfo(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter your full name"
                      className="glass-input h-12 rounded-xl"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={prospectInfo.email}
                      onChange={(e) => setProspectInfo(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="you@example.com"
                      className="glass-input h-12 rounded-xl"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={prospectInfo.phone}
                      onChange={handlePhoneChange}
                      placeholder="(555) 123-4567"
                      className="glass-input h-12 rounded-xl"
                      required
                    />
                    <p className="text-xs text-muted-foreground">Enter a valid 10-digit phone number</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company (Optional)</Label>
                    <Input
                      id="company"
                      value={prospectInfo.company}
                      onChange={(e) => setProspectInfo(prev => ({ ...prev, company: e.target.value }))}
                      placeholder="Your company name"
                      className="glass-input h-12 rounded-xl"
                    />
                  </div>
                </div>

                <div className="pt-6">
                  <Button 
                    type="submit"
                    className="w-full h-14 rounded-xl text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {hasExistingProgress ? "Continue Review" : "Begin Review"}
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>

                {/* Honeypot field - hidden from real users */}
                <div className="absolute -left-[9999px]" aria-hidden="true" tabIndex={-1}>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    name="website"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    autoComplete="off"
                    tabIndex={-1}
                  />
                </div>

                <p className="text-xs text-muted-foreground text-center pt-4">
                  Your responses are confidential and will only be used to provide personalized recommendations.
                </p>
              </form>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Questions step
  return (
    <div className="min-h-screen gradient-bg">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      <header className="sticky top-0 z-50 border-b border-border/20 bg-card/40 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 backdrop-blur-sm border border-primary/20">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <span className="font-display font-semibold text-foreground hidden sm:inline">Trust Structural Readiness & Risk Review</span>
              <span className="font-display font-semibold text-foreground sm:hidden">Risk Review</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                Section {currentSectionIndex + 1} of {totalSections}
              </span>
              <span className="text-sm text-muted-foreground sm:hidden">
                {currentSectionIndex + 1}/{totalSections}
              </span>
            </div>
          </div>
          <div className="mt-3">
            <Progress value={progress} className="h-2 rounded-full" />
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-8 max-w-3xl">
        <Card className="glass-panel overflow-hidden">
          <CardHeader className="border-b border-border/30 pb-6 pt-8">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-primary/10 hidden sm:flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl font-display mb-2">{currentSection.title}</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Please answer each question in this section carefully.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="py-8 space-y-8">
            {sectionQuestions.map((question, qIndex) => (
              <div key={question.id} className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                    <span className="text-sm font-semibold text-primary">{qIndex + 1}</span>
                  </div>
                  <div className="flex-1">
                    <Label className="text-base font-medium leading-relaxed block mb-4">
                      {question.question}
                      {question.type === "multi" && (
                        <span className="text-sm font-normal text-muted-foreground ml-2">(Select all that apply)</span>
                      )}
                    </Label>

                    {question.type === "single" ? (
                      <RadioGroup
                        value={(responses[question.id] as string) || ""}
                        onValueChange={(value) => handleSingleSelect(question.id, value)}
                        className="space-y-3"
                      >
                        {question.options.map((option) => (
                          <div
                            key={option.value}
                            className={`flex items-center space-x-3 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer hover:border-primary/40 hover:bg-primary/5 ${
                              responses[question.id] === option.value
                                ? "border-primary bg-primary/10 shadow-sm"
                                : "border-border/50 bg-card/50"
                            }`}
                            onClick={() => handleSingleSelect(question.id, option.value)}
                          >
                            <RadioGroupItem value={option.value} id={`${question.id}-${option.value}`} />
                            <Label
                              htmlFor={`${question.id}-${option.value}`}
                              className="flex-1 cursor-pointer font-normal"
                            >
                              {option.label}
                            </Label>
                            {responses[question.id] === option.value && (
                              <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                            )}
                          </div>
                        ))}
                      </RadioGroup>
                    ) : (
                      <div className="space-y-3">
                        {question.options.map((option) => {
                          const isChecked = ((responses[question.id] as string[]) || []).includes(option.value);
                          return (
                            <div
                              key={option.value}
                              className={`flex items-center space-x-3 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer hover:border-primary/40 hover:bg-primary/5 ${
                                isChecked
                                  ? "border-primary bg-primary/10 shadow-sm"
                                  : "border-border/50 bg-card/50"
                              }`}
                              onClick={() => handleMultiSelect(question.id, option.value, !isChecked)}
                            >
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={(checked) =>
                                  handleMultiSelect(question.id, option.value, checked as boolean)
                                }
                                id={`${question.id}-${option.value}`}
                              />
                              <Label
                                htmlFor={`${question.id}-${option.value}`}
                                className="flex-1 cursor-pointer font-normal"
                              >
                                {option.label}
                              </Label>
                              {isChecked && (
                                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between mt-8 gap-4">
          <Button
            variant="outline"
            onClick={currentSectionIndex === 0 ? () => setStep("info") : handlePrevious}
            className="h-12 px-6 rounded-xl"
          >
            <ChevronLeft className="mr-2 h-5 w-5" />
            {currentSectionIndex === 0 ? "Back to Info" : "Previous"}
          </Button>

          {currentSectionIndex < totalSections - 1 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="h-12 px-8 rounded-xl shadow-lg"
            >
              Continue
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || isSubmitting}
              className="h-12 px-8 rounded-xl shadow-lg"
            >
              Submit Review
              <CheckCircle2 className="ml-2 h-5 w-5" />
            </Button>
          )}
        </div>
      </main>
    </div>
  );
};

export default PublicAssessment;
