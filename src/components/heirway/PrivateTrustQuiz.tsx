import { useState, useEffect, useRef, forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Checkbox } from '@/components/ui/checkbox';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { getVisibleQuestions } from '@/lib/trustQuiz';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getAuthRedirectUrl } from '@/lib/appUrl';
import { toast } from 'sonner';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const formatPhoneNumber = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
};

const validatePhone = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10;
};

const PrivateTrustQuiz = forwardRef<HTMLDivElement>(function PrivateTrustQuiz(_props, _ref) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [contactErrors, setContactErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const questionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll question into view on step change, especially important on mobile
    setTimeout(() => {
      questionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, [step]);

  const visibleQuestions = getVisibleQuestions(answers);
  const totalSteps = visibleQuestions.length;
  const currentQ = visibleQuestions[step] || visibleQuestions[visibleQuestions.length - 1];
  const progress = ((step + 1) / totalSteps) * 100;

  const handleSingleSelect = (value: string) => {
    const updated = { ...answers, [currentQ.id]: value };
    setAnswers(updated);

    const newVisible = getVisibleQuestions(updated);
    const currentIndex = newVisible.findIndex(q => q.id === currentQ.id);
    if (currentIndex < newVisible.length - 1) {
      setTimeout(() => setStep(currentIndex + 1), 300);
    }
  };

  const validateContactInfo = (): boolean => {
    const errors: Record<string, string> = {};
    const name = ((answers.full_name as string) || '').trim();
    const email = ((answers.contact_email as string) || '').trim();
    const phone = ((answers.contact_phone as string) || '').trim();

    if (!name) errors.full_name = 'Full name is required';
    else if (name.length < 2) errors.full_name = 'Please enter your full name';

    if (!email) errors.contact_email = 'Email is required';
    else if (!EMAIL_REGEX.test(email)) errors.contact_email = 'Please enter a valid email address';

    if (!phone) errors.contact_phone = 'Phone number is required';
    else if (!validatePhone(phone)) errors.contact_phone = 'Please enter a valid 10-digit phone number';

    setContactErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const canProceed = (): boolean => {
    if (currentQ.type === 'contact') {
      const name = (answers.full_name as string) || '';
      const email = (answers.contact_email as string) || '';
      const phone = (answers.contact_phone as string) || '';
      return name.trim().length > 0 && email.trim().length > 0 && phone.trim().length > 0;
    }
    const val = answers[currentQ.id];
    return !!val && val !== '';
  };

  const handleContactNext = () => {
    if (validateContactInfo()) {
      handleNext();
    }
  };

  const createProspectRecord = async () => {
    try {
      const name = ((answers.full_name as string) || '').trim();
      const email = ((answers.contact_email as string) || '').trim();
      const phone = ((answers.contact_phone as string) || '').trim();

      const quizAnswers = {
        current_plan: (answers.current_plan as string) || '',
        top_concern: (answers.top_concern as string) || '',
        timeline: (answers.timeline as string) || '',
        walkthrough_interest: (answers.walkthrough_interest as string) || '',
      };

      await supabase.from('prospects').insert({
        name,
        email,
        phone,
        status: 'new',
        quiz_answers: quizAnswers,
      } as any);
    } catch (err) {
      // Silently fail — don't block the user flow for prospect creation
      if (import.meta.env.DEV) console.error('Prospect creation error:', err);
    }
  };

  const generateSecurePassword = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    const array = new Uint8Array(24);
    crypto.getRandomValues(array);
    let pw = '';
    for (let i = 0; i < 24; i++) pw += chars[array[i] % chars.length];
    return 'Aa1!' + pw;
  };

  const handleSubmit = async () => {
    if (!consentAccepted) {
      toast.error('You must agree to the Privacy Policy and Terms of Service to continue.');
      return;
    }

    setIsSubmitting(true);

    try {
      const email = ((answers.contact_email as string) || '').trim().toLowerCase();
      const fullName = ((answers.full_name as string) || '').trim();
      const phone = ((answers.contact_phone as string) || '').trim();
      const signedInEmail = user?.email?.trim().toLowerCase();
      const isSignedInAsSubmittedEmail = Boolean(user && signedInEmail === email);

      await supabase.from('consent_log' as any).insert({
        user_id: isSignedInAsSubmittedEmail ? user?.id ?? null : null,
        email,
        full_name: fullName,
        consent_type: 'terms_and_privacy',
        form_context: 'get_started_form',
        privacy_policy_version: '03/11/2026',
        terms_version: '03/11/2026',
      } as any);

      if (user && !isSignedInAsSubmittedEmail) {
        await supabase.auth.signOut();
      }

      const tempPassword = generateSecurePassword();
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password: tempPassword,
        options: {
          emailRedirectTo: getAuthRedirectUrl('/set-password'),
          data: {
            full_name: fullName,
            phone,
          },
        },
      });

      // Detect existing account: explicit error OR empty identities (Supabase's
      // "secure" response when email is already registered).
      const existsByError = !!signUpError && (
        signUpError.message?.toLowerCase().includes('already') ||
        signUpError.message?.toLowerCase().includes('registered') ||
        signUpError.message?.toLowerCase().includes('exists')
      );
      const existsByIdentities = !!signUpData?.user && (signUpData.user.identities?.length ?? 0) === 0;

      if (existsByError || existsByIdentities) {
        // Don't create a duplicate prospect or fire a "new account" admin email.
        toast.info(
          'It looks like you already have an account with this email. Please sign in instead.',
          { duration: 7000 }
        );
        sessionStorage.setItem('heirway_login_email', email);
        window.location.assign('/login?mode=login');
        return;
      }

      if (signUpError) {
        toast.error(signUpError.message || 'Could not create your account. Please try again.');
        return;
      }

      // Genuine new account — record prospect and notify admins.
      await createProspectRecord();
      try {
        await supabase.functions.invoke('send-admin-email', {
          body: {
            event_type: 'new_account',
            event_data: {
              name: fullName || '',
              email: email,
            },
          },
        });
      } catch (err) {
        console.error('Admin new account email error:', err);
      }

      await supabase.auth.signOut();

      toast.success(
        `Thanks, ${fullName || 'there'}! Please check your email and verify your account to continue. We've sent you next steps and your personalized recommendation.`,
        { duration: 8000 }
      );

      // Give the user a moment to read the verification message before
      // resetting the form for the next person.
      await new Promise((resolve) => setTimeout(resolve, 4000));

      // Reset quiz so the next person can fill it out
      setAnswers({});
      setContactErrors({});
      setConsentAccepted(false);
      setStep(0);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLastStep = step === totalSteps - 1;

  const prevSection = step > 0 ? visibleQuestions[step - 1]?.section : null;
  const showSectionHeader = currentQ.section !== prevSection;

  const renderContactForm = () => (
    <div className="animate-fade-in space-y-6">
      <h3 className="text-lg md:text-xl font-display font-bold text-foreground">{currentQ.question}</h3>
      <div className="space-y-4">
        <div>
          <Label htmlFor="full_name" className="text-sm text-muted-foreground">Full Name *</Label>
          <Input
            id="full_name"
            placeholder="Your full name"
            value={(answers.full_name as string) || ''}
            onChange={(e) => {
              setAnswers(prev => ({ ...prev, full_name: e.target.value }));
              if (contactErrors.full_name) setContactErrors(prev => ({ ...prev, full_name: '' }));
            }}
            className={`h-12 bg-muted/30 border-border/40 mt-1 ${contactErrors.full_name ? 'border-destructive' : ''}`}
          />
          {contactErrors.full_name && <p className="text-xs text-destructive mt-1">{contactErrors.full_name}</p>}
        </div>
        <div>
          <Label htmlFor="contact_email" className="text-sm text-muted-foreground">Email *</Label>
          <Input
            id="contact_email"
            type="email"
            placeholder="you@email.com"
            value={(answers.contact_email as string) || ''}
            onChange={(e) => {
              setAnswers(prev => ({ ...prev, contact_email: e.target.value }));
              if (contactErrors.contact_email) setContactErrors(prev => ({ ...prev, contact_email: '' }));
            }}
            className={`h-12 bg-muted/30 border-border/40 mt-1 ${contactErrors.contact_email ? 'border-destructive' : ''}`}
          />
          {contactErrors.contact_email && <p className="text-xs text-destructive mt-1">{contactErrors.contact_email}</p>}
        </div>
        <div>
          <Label htmlFor="contact_phone" className="text-sm text-muted-foreground">Phone Number *</Label>
          <Input
            id="contact_phone"
            type="tel"
            placeholder="(555) 555-5555"
            value={(answers.contact_phone as string) || ''}
            onChange={(e) => {
              const formatted = formatPhoneNumber(e.target.value);
              setAnswers(prev => ({ ...prev, contact_phone: formatted }));
              if (contactErrors.contact_phone) setContactErrors(prev => ({ ...prev, contact_phone: '' }));
            }}
            className={`h-12 bg-muted/30 border-border/40 mt-1 ${contactErrors.contact_phone ? 'border-destructive' : ''}`}
          />
          {contactErrors.contact_phone && <p className="text-xs text-destructive mt-1">{contactErrors.contact_phone}</p>}
        </div>
      </div>
    </div>
  );

  const renderSingle = () => (
    <div className="animate-fade-in space-y-6">
      <h3 className="text-lg md:text-xl font-display font-bold text-foreground">{currentQ.question}</h3>
      <div className="space-y-3">
        {currentQ.options.map(opt => (
          <button
            key={opt.value}
            onClick={() => handleSingleSelect(opt.value)}
            className={`w-full p-4 rounded-xl border text-left font-medium transition-all duration-300 ${
              answers[currentQ.id] === opt.value
                ? 'bg-primary/15 border-primary/50 text-foreground'
                : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-primary/10 hover:border-primary/40'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );

  const renderQuestion = () => {
    if (currentQ.type === 'contact') return renderContactForm();
    return renderSingle();
  };

  const handleBack = () => {
    if (step > 0) setStep(s => s - 1);
  };

  const handleNext = () => {
    if (step < totalSteps - 1) setStep(s => s + 1);
  };

  // For the contact step, use validated next instead of regular next
  const isContactStep = currentQ.type === 'contact';

  return (
    <div>
      <div className="mb-6">
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between items-center mt-2">
          <p className="text-xs text-muted-foreground">Question {step + 1} of {totalSteps}</p>
          {showSectionHeader && (
            <p className="text-xs font-medium text-primary">{currentQ.sectionLabel}</p>
          )}
        </div>
      </div>

      <div ref={questionRef} className="scroll-mt-20">
        {renderQuestion()}
      </div>

      {isLastStep && (
        <label className="flex items-start gap-3 text-left p-3 rounded-lg border border-border bg-muted/30 cursor-pointer mt-6">
          <Checkbox
            checked={consentAccepted}
            onCheckedChange={(checked) => setConsentAccepted(checked === true)}
            className="mt-0.5"
          />
          <span className="text-xs text-muted-foreground leading-relaxed">
            By checking this box, I agree to Heirway's <Link to="/privacy" target="_blank" className="text-primary underline">Privacy Policy</Link> and <Link to="/terms" target="_blank" className="text-primary underline">Terms of Service</Link>. This acts as my electronic signature and consent to the collection and use of my information as described therein. I also agree to receive marketing and informational emails and SMS text messages from Heirway at the email address and phone number provided. Message frequency varies. Message and data rates may apply. Reply STOP to unsubscribe from SMS, or use the unsubscribe link in any email. Consent is not a condition of purchase. <span className="text-destructive">*</span>
          </span>
        </label>
      )}

      <div className="flex items-center justify-between mt-8 gap-2">
        <Button variant="ghost" onClick={handleBack} disabled={step === 0} className="text-muted-foreground flex-shrink-0">
          <ArrowLeft className="w-4 h-4 mr-2" />Back
        </Button>
        {isLastStep ? (
          <Button onClick={handleSubmit} disabled={!canProceed() || !consentAccepted || isSubmitting} className="bg-gradient-to-r from-primary to-accent text-primary-foreground flex-shrink-0 whitespace-nowrap">
            {isSubmitting ? 'Submitting...' : 'Submit'}<ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : isContactStep ? (
          <Button onClick={handleContactNext} disabled={!canProceed()} variant="outline" className="flex-shrink-0">
            Next<ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleNext} disabled={!canProceed()} variant="outline" className="flex-shrink-0">
            Next<ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
});

export default PrivateTrustQuiz;
