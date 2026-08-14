import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GoldHeaderCard } from '@/components/ui/gold-header-card';
import { IndexExplanationDialog } from '@/components/ui/index-explanation-dialog';
import { ProfileExplanationDialog } from '@/components/ui/profile-explanation-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  INDEX_METADATA,
  PROFILE_DETAILS,
  getAllInterpretations,
  getMeetingRecommendations,
  getAssetRecommendations,
  type ComputedScores,
  type ProfileDetail,
  type AssessmentResponses,
} from '@/lib/scoring';
import { QUESTIONS, SECTIONS } from '@/lib/questions';
import { MeetingRecommendations } from '@/components/results/MeetingRecommendations';
import { ScoreAdjustmentPanel } from '@/components/results/ScoreAdjustmentPanel';
import {
  ArrowLeft,
  User,
  Building,
  Target,
  TrendingUp,
  Lightbulb,
  Loader2,
  ExternalLink,
  Sparkles,
  ClipboardList,
  CheckCircle2,
  DollarSign,
  Briefcase,
  Info,
  Copy,
} from 'lucide-react';

interface AssessmentData {
  id: string;
  prospect_id: string;
  scs_score: number;
  lai_score: number;
  isi_score: number;
  adi_score: number;
  aeti_score: number;
  csi_score: number;
  pfi_score: number;
  primary_profile: string | null;
  secondary_profile: string | null;
  created_at: string;
  q1_situation: string[];
  q2_annual_income: string;
  q3_net_worth: string;
  q4_income_source: string;
  q5_tax_burden: string;
  q6_avoided_strategies: string;
  q7_mindset: string;
  q8_decision_style: string;
  q9_regret_pattern: string;
  q10_change_concern: string;
  q11_exit_comfort: string;
  q12_veto_power: string[];
  q13_blame_allocation: string;
  q14_audit_perception: string;
  q15_aggressiveness_concern: string;
  q16_control_importance: string;
  q17_trustee_acceptance: string;
  q18_holding_period: string;
  q19_existing_trusts: string;
  q20_intent: string;
  q21_fee_preference: string;
  q22_savings_share: string;
  q23_pricing_priority: string;
  prospects: {
    id: string;
    name: string;
    email: string | null;
    company: string | null;
  };
}

export default function AssessmentResults() {
  const { id } = useParams<{ id: string }>();
  const [assessment, setAssessment] = useState<AssessmentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<keyof typeof INDEX_METADATA | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAssessment() {
      if (!id) return;
      try {
        const { data, error } = await supabase
          .from('assessments')
          .select(`*, prospects (id, name, email, company)`)
          .eq('id', id)
          .single();
        if (error) throw error;
        setAssessment(data as unknown as AssessmentData);
      } catch (error) {
        console.error('Error fetching assessment:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAssessment();
  }, [id]);

  const handleSaveAdjustments = async (
    adjustedScores: ComputedScores, 
    newPrimaryProfile: string, 
    newSecondaryProfile: string | null
  ) => {
    if (!id || !assessment) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('assessments')
        .update({
          scs_score: adjustedScores.scs,
          lai_score: adjustedScores.lai,
          isi_score: adjustedScores.isi,
          adi_score: adjustedScores.adi,
          aeti_score: adjustedScores.aeti,
          csi_score: adjustedScores.csi,
          pfi_score: adjustedScores.pfi,
          primary_profile: newPrimaryProfile,
          secondary_profile: newSecondaryProfile,
        })
        .eq('id', id);

      if (error) throw error;

      setAssessment(prev => prev ? {
        ...prev,
        scs_score: adjustedScores.scs,
        lai_score: adjustedScores.lai,
        isi_score: adjustedScores.isi,
        adi_score: adjustedScores.adi,
        aeti_score: adjustedScores.aeti,
        csi_score: adjustedScores.csi,
        pfi_score: adjustedScores.pfi,
        primary_profile: newPrimaryProfile,
        secondary_profile: newSecondaryProfile,
      } : null);

      toast.success('Scores and profile updated successfully');
    } catch (error) {
      console.error('Error updating assessment:', error);
      toast.error('Failed to save adjustments');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="min-h-screen gradient-bg flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!assessment) {
    return (
      <AppLayout>
        <div className="min-h-screen gradient-bg p-8">
          <Card className="glass-panel max-w-md mx-auto overflow-hidden">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Assessment not found</p>
              <Link to="/assessments"><Button variant="outline" className="mt-4 rounded-xl">Back to Assessments</Button></Link>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const scores: ComputedScores = {
    scs: assessment.scs_score, lai: assessment.lai_score, isi: assessment.isi_score,
    adi: assessment.adi_score, aeti: assessment.aeti_score, csi: assessment.csi_score, pfi: assessment.pfi_score,
  };

  const interpretations = getAllInterpretations(scores);
  const primaryProfileDetails: ProfileDetail | null = assessment.primary_profile ? PROFILE_DETAILS[assessment.primary_profile] : null;
  const secondaryProfileDetails: ProfileDetail | null = assessment.secondary_profile ? PROFILE_DETAILS[assessment.secondary_profile] : null;

  const getBandColor = (level: 'low' | 'moderate' | 'high') => {
    switch (level) {
      case 'low': return 'bg-success/10 text-success border-success/20';
      case 'moderate': return 'bg-warning/10 text-warning border-warning/20';
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/20';
    }
  };

  const getSelectedAnswers = (questionId: string): string[] => {
    const response = assessment[questionId as keyof AssessmentData];
    const question = QUESTIONS.find(q => q.id === questionId);
    if (!question || !response) return [];
    if (Array.isArray(response)) {
      const uniqueValues = [...new Set(response)];
      return uniqueValues.map(val => question.options.find(opt => opt.value === val)?.label || val);
    }
    return [question.options.find(opt => opt.value === response)?.label || (response as string)];
  };

  const generateCopyText = () => {
    const lines: string[] = [];
    
    // Header
    lines.push(`ASSESSMENT PROFILE: ${assessment.prospects.name}`);
    if (assessment.prospects.company) {
      lines.push(`Company: ${assessment.prospects.company}`);
    }
    lines.push(`Date: ${new Date(assessment.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);
    lines.push('');
    
    // Profiles
    if (assessment.primary_profile) {
      lines.push(`Primary Profile: ${assessment.primary_profile}`);
    }
    if (assessment.secondary_profile) {
      lines.push(`Secondary Profile: ${assessment.secondary_profile}`);
    }
    lines.push('');
    
    // Scores
    lines.push('=== DIAGNOSTIC SCORES ===');
    (Object.keys(scores) as Array<keyof ComputedScores>).forEach((key) => {
      const meta = INDEX_METADATA[key];
      const interp = interpretations[key];
      lines.push(`${meta.name} (${meta.abbrev}): ${scores[key]}/${meta.maxScore} - ${interp.label}`);
    });
    lines.push('');
    
    // Questions and Answers
    lines.push('=== QUESTIONS & ANSWERS ===');
    SECTIONS.forEach((section) => {
      lines.push('');
      lines.push(`--- ${section.title} ---`);
      QUESTIONS.filter(q => q.section === section.id).forEach((q) => {
        const answers = getSelectedAnswers(q.id);
        lines.push(`Q${q.number}: ${q.question}`);
        answers.forEach(ans => {
          lines.push(`  → ${ans}`);
        });
      });
    });
    
    return lines.join('\n');
  };

  const handleCopyProfile = async () => {
    try {
      const text = generateCopyText();
      await navigator.clipboard.writeText(text);
      toast.success('Assessment profile copied to clipboard');
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  const ProfileCard = ({ profile, details, isPrimary }: { profile: string; details: ProfileDetail; isPrimary: boolean }) => (
    <Card className="glass-panel overflow-hidden animate-fade-in">
      <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Badge variant={isPrimary ? "default" : "secondary"} className="rounded-lg flex-shrink-0">
              {isPrimary ? 'Primary' : 'Secondary'}
            </Badge>
            <CardTitle className="text-lg truncate">{profile}</CardTitle>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 flex-shrink-0"
            onClick={() => setSelectedProfile(profile)}
          >
            <Info className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
        <CardDescription className="line-clamp-1">{details.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-warning" />
            <span className="font-semibold text-sm">Recommended Approach</span>
          </div>
          <ul className="space-y-1.5 ml-6">
            {details.approach.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-warning mt-2 flex-shrink-0" />{item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Briefcase className="w-4 h-4 text-accent" />
            <span className="font-semibold text-sm">Assets Needed</span>
          </div>
          <ul className="space-y-1.5 ml-6">
            {details.assets.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />{item}
              </li>
            ))}
          </ul>
        </div>
        <div className="p-3 rounded-xl bg-success/5 border border-success/20">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-success" />
            <span className="font-semibold text-sm">Pricing Strategy</span>
          </div>
          <p className="text-sm text-muted-foreground ml-6">{details.pricing}</p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AppLayout>
      <div className="min-h-screen gradient-bg">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 p-4 md:p-8">
          <div className="mb-6 md:mb-8 animate-fade-in">
            <Link to="/assessments" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
              <ArrowLeft className="w-4 h-4 mr-1" />Back to Assessments
            </Link>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 md:p-2.5 rounded-xl bg-primary/10 border border-primary/20"><Sparkles className="h-5 w-5 md:h-6 md:w-6 text-primary" /></div>
                  <h1 className="text-2xl md:text-3xl font-display font-bold">Assessment Results</h1>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-2 ml-10 md:ml-14 text-muted-foreground text-sm">
                  <span className="flex items-center gap-1"><User className="w-4 h-4" />{assessment.prospects.name}</span>
                  {assessment.prospects.company && <span className="flex items-center gap-1"><Building className="w-4 h-4" />{assessment.prospects.company}</span>}
                </div>
              </div>
              <Link to={`/prospects/${assessment.prospect_id}`}>
                <Button variant="outline" size="sm" className="rounded-xl bg-card/50 w-full sm:w-auto">View Prospect<ExternalLink className="w-4 h-4 ml-2" /></Button>
              </Link>
            </div>
          </div>

          {/* Profile Strategies Section */}
          {(primaryProfileDetails || secondaryProfileDetails) && (
            <div className="mb-6 md:mb-8">
              <h2 className="text-lg md:text-xl font-display font-bold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />Client Profile Classification
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                {assessment.primary_profile && primaryProfileDetails && (
                  <ProfileCard profile={assessment.primary_profile} details={primaryProfileDetails} isPrimary={true} />
                )}
                {assessment.secondary_profile && secondaryProfileDetails && (
                  <ProfileCard profile={assessment.secondary_profile} details={secondaryProfileDetails} isPrimary={false} />
                )}
              </div>
            </div>
          )}

          {/* Diagnostic Indices */}
          <GoldHeaderCard
            title="Diagnostic Indices"
            description="7 independent scores measuring prospect psychology — click any index for details"
            icon={<TrendingUp className="w-4 h-4 text-primary" />}
            className="mb-6 md:mb-8 animate-fade-in"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              {(Object.keys(scores) as Array<keyof ComputedScores>).map((key) => {
                const meta = INDEX_METADATA[key];
                const interp = interpretations[key];
                const pct = Math.min((scores[key] / meta.maxScore) * 100, 100);
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedIndex(key)}
                    className="p-3 md:p-4 rounded-xl glass-option text-left hover:border-primary/40 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1 md:gap-2">
                        <span className="font-semibold text-primary text-sm md:text-base">{meta.abbrev}</span>
                        <span className="text-xs md:text-sm text-muted-foreground hidden sm:inline">{meta.name}</span>
                      </div>
                      <span className="text-base md:text-lg font-bold">{scores[key]}<span className="text-xs md:text-sm text-muted-foreground">/{meta.maxScore}</span></span>
                    </div>
                    <div className="h-2 bg-border/30 rounded-full overflow-hidden mb-2">
                      <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex items-center justify-between gap-2 md:gap-4">
                      <Badge className={`${getBandColor(interp.level)} border rounded-lg text-xs flex-shrink-0`}>{interp.label}</Badge>
                      <span className="text-xs text-muted-foreground text-right line-clamp-2">{interp.description}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </GoldHeaderCard>

          {/* Selected Answers */}
          <GoldHeaderCard
            title="Selected Answers"
            icon={<ClipboardList className="w-4 h-4 text-primary" />}
            className="animate-fade-in mb-6 md:mb-8"
            headerAction={
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-xl gap-2"
                onClick={handleCopyProfile}
              >
                <Copy className="w-4 h-4" />
                Copy Profile
              </Button>
            }
          >
            <div className="space-y-6">
              {SECTIONS.map((section) => (
                <div key={section.id}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-primary/10 text-primary text-xs font-semibold">{section.id}</span>
                    <h3 className="font-semibold">{section.title}</h3>
                  </div>
                  <div className="space-y-3 ml-8">
                    {QUESTIONS.filter(q => q.section === section.id).map((q) => (
                      <div key={q.id} className="p-4 rounded-xl glass-option">
                        <div className="flex items-start gap-2 mb-2">
                          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-md flex-shrink-0">Q{q.number}</span>
                          <p className="text-sm font-medium text-foreground">{q.question}</p>
                        </div>
                        <div className="ml-8 space-y-1">
                          {getSelectedAnswers(q.id).map((ans, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-success" />
                              <span className="text-sm text-muted-foreground">{ans}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </GoldHeaderCard>

          {/* Meeting Recommendations Section */}
          <div className="mb-6 md:mb-8">
            <h2 className="text-lg md:text-xl font-display font-bold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-warning" />Recommended Next Steps
            </h2>
            <MeetingRecommendations 
              recommendation={getMeetingRecommendations(scores)} 
              assets={getAssetRecommendations(scores)} 
            />
          </div>

          {/* Orientation Calibration Section */}
          <div className="mt-6 md:mt-8">
            <ScoreAdjustmentPanel
              originalScores={scores}
              primaryProfile={assessment.primary_profile}
              secondaryProfile={assessment.secondary_profile}
              assessmentResponses={assessment as unknown as AssessmentResponses}
              onSaveAdjustments={handleSaveAdjustments}
            />
          </div>

          <p className="text-sm text-muted-foreground mt-6 text-center">
            Assessment completed on {new Date(assessment.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      {/* Dialogs */}
      <IndexExplanationDialog
        open={selectedIndex !== null}
        onOpenChange={(open) => !open && setSelectedIndex(null)}
        indexKey={selectedIndex}
        score={selectedIndex ? scores[selectedIndex] : undefined}
        interpretation={selectedIndex ? interpretations[selectedIndex] : undefined}
      />

      <ProfileExplanationDialog
        open={selectedProfile !== null}
        onOpenChange={(open) => !open && setSelectedProfile(null)}
        profileName={selectedProfile}
      />
    </AppLayout>
  );
}
