import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useForceLightMode } from '@/hooks/useForceLightMode';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Loader2, User, Heart, Users, Receipt, FileText, Building2, UserCheck, Gift, Target, CheckCircle, Home, Video } from 'lucide-react';
import heirwayLogo from '@/assets/heirway-logo-transparent.png';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { HEIRWAY_PLANS } from '@/lib/heirwayPlans';
import IntakeSectionBasicInfo from '@/components/heirway/intake/IntakeSectionBasicInfo';
import IntakeSectionSpouse from '@/components/heirway/intake/IntakeSectionSpouse';
import IntakeSectionDependents, { type Dependent, type AdditionalDependent } from '@/components/heirway/intake/IntakeSectionDependents';
import IntakeSectionTax from '@/components/heirway/intake/IntakeSectionTax';
import IntakeSectionDocuments from '@/components/heirway/intake/IntakeSectionDocuments';
import IntakeSectionTrust from '@/components/heirway/intake/IntakeSectionTrust';
import IntakeSectionPreDrafting from '@/components/heirway/intake/IntakeSectionPreDrafting';
import IntakeSectionTrustees, { type Trustee, type SuccessorTrustee } from '@/components/heirway/intake/IntakeSectionTrustees';
import IntakeSectionBeneficiaries, { type Beneficiary } from '@/components/heirway/intake/IntakeSectionBeneficiaries';
import IntakeSectionGoals from '@/components/heirway/intake/IntakeSectionGoals';
import IntakeSectionConfirmation from '@/components/heirway/intake/IntakeSectionConfirmation';

interface IntakeState {
  // Section 1
  first_name: string; middle_name: string; last_name: string; suffix: string;
  preferred_name: string; date_of_birth: Date | undefined; mobile_phone: string; trust_email: string;
  // Section 2
  spouse_full_name: string; spouse_preferred_name: string; spouse_dob: Date | undefined; spouse_phone: string;
  // Section 3
  dependents: Dependent[]; additionalDependents: AdditionalDependent[];
  hasAdditionalDependents: boolean;
  // Section 4
  cpa_name: string; cpa_email: string; cpa_phone: string; tax_return_types: string[]; tax_return_other: string;
  last_tax_year: string; estimated_current_income: string; major_tax_events: string;
  expects_inheritance: string; inheritance_details: string;
  // Section 5
  existing_documents: string[]; estate_plan_last_reviewed: Date | undefined; confident_plan_works: string;
  // Section 6
  trust_names: string[]; trust_address_street: string; trust_address_city: string; trust_address_state: string;
  trust_address_zip: string; trust_domicile_state: string;
  business_name: string; business_type: string; business_description: string; business_revenue: string;
  // Section 7
  trustees: Trustee[]; managingTrusteePhone: string; successorTrustees: SuccessorTrustee[];
  // Section 8
  beneficiaries: Beneficiary[];
  // Section 9
  top_priorities: string[]; other_priority: string; support_preference: string; biggest_fear: string;
  // Section 10
  confirmed: boolean;
}

const initialState: IntakeState = {
  first_name: '', middle_name: '', last_name: '', suffix: '', preferred_name: '',
  date_of_birth: undefined, mobile_phone: '', trust_email: '',
  spouse_full_name: '', spouse_preferred_name: '', spouse_dob: undefined, spouse_phone: '',
  dependents: [{ full_name: '', date_of_birth: '', relationship: '', living_with_you: true, special_needs: false, married: false, grandchildren_names: '' }],
  additionalDependents: [{ name: '', relationship: '', support_details: '' }],
  hasAdditionalDependents: false,
  cpa_name: '', cpa_email: '', cpa_phone: '', tax_return_types: [], tax_return_other: '',
  last_tax_year: '', estimated_current_income: '', major_tax_events: '',
  expects_inheritance: '', inheritance_details: '',
  existing_documents: [], estate_plan_last_reviewed: undefined, confident_plan_works: '',
  trust_names: [], trust_address_street: '', trust_address_city: '', trust_address_state: '',
  trust_address_zip: '', trust_domicile_state: '',
  business_name: '', business_type: '', business_description: '', business_revenue: '',
  trustees: [{ full_name: '', email: '', phone: '', address: '', relationship: '' }],
  managingTrusteePhone: '', successorTrustees: [{ full_name: '', relationship: '', contact: '' }],
  beneficiaries: [
    { name: '', full_address: '', address_street: '', address_city: '', address_state: '', address_zip: '', units: '0.05', relationship: '', is_passive: true },
    { name: '', full_address: '', address_street: '', address_city: '', address_state: '', address_zip: '', units: '199.95', relationship: '', is_passive: false },
  ],
  top_priorities: [], other_priority: '', support_preference: '', biggest_fear: '',
  confirmed: false,
};

export default function HeirwayIntake() {
  useForceLightMode();
  const navigate = useNavigate();
  const [currentSection, setCurrentSection] = useState(1);
  const [data, setData] = useState<IntakeState>(initialState);
  const [loading, setLoading] = useState(false);
  const [savingExit, setSavingExit] = useState(false);
  const [isMarried, setIsMarried] = useState(false);
  const [hasChildren, setHasChildren] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [intakeId, setIntakeId] = useState<string | null>(null);

  const selectedPlanId = sessionStorage.getItem('heirway_selected_plan') || 'starter';
  const plan = HEIRWAY_PLANS[selectedPlanId];

  // Load client data and existing intake progress
  useEffect(() => {
    const loadClient = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }
      const { data: client } = await supabase.from('heirway_clients').select('*').eq('user_id', user.id).maybeSingle();
      if (client) {
        setIsMarried(client.is_married);
        setHasChildren(client.has_children);
        setClientId(client.id);

        // Load existing intake if available
        const { data: existingIntake } = await supabase
          .from('heirway_intake')
          .select('*')
          .eq('client_id', client.id)
          .maybeSingle();

        if (existingIntake && !existingIntake.completed) {
          setIntakeId(existingIntake.id);
          setCurrentSection(existingIntake.current_section || 1);
          // Restore form state from saved intake
          setData(prev => ({
            ...prev,
            first_name: existingIntake.first_name || '',
            middle_name: existingIntake.middle_name || '',
            last_name: existingIntake.last_name || '',
            suffix: existingIntake.suffix || '',
            preferred_name: existingIntake.preferred_name || '',
            date_of_birth: existingIntake.date_of_birth ? new Date(existingIntake.date_of_birth) : undefined,
            mobile_phone: existingIntake.mobile_phone || '',
            trust_email: existingIntake.trust_email || '',
            spouse_full_name: existingIntake.spouse_full_name || '',
            spouse_preferred_name: existingIntake.spouse_preferred_name || '',
            spouse_dob: existingIntake.spouse_dob ? new Date(existingIntake.spouse_dob) : undefined,
            spouse_phone: existingIntake.spouse_phone || '',
            dependents: (existingIntake.dependents as any[])?.length ? existingIntake.dependents as any : prev.dependents,
            additionalDependents: (existingIntake.additional_dependents as any[])?.length ? existingIntake.additional_dependents as any : prev.additionalDependents,
            hasAdditionalDependents: (existingIntake.additional_dependents as any[])?.length > 0,
            cpa_name: existingIntake.cpa_name || '',
            cpa_email: existingIntake.cpa_email || '',
            cpa_phone: existingIntake.cpa_phone || '',
            tax_return_types: existingIntake.tax_return_types || [],
            tax_return_other: existingIntake.tax_return_other || '',
            last_tax_year: existingIntake.last_tax_year || '',
            estimated_current_income: existingIntake.estimated_current_income ? String(existingIntake.estimated_current_income) : '',
            major_tax_events: existingIntake.major_tax_events || '',
            expects_inheritance: existingIntake.expects_inheritance || '',
            inheritance_details: existingIntake.inheritance_details || '',
            existing_documents: existingIntake.existing_documents || [],
            estate_plan_last_reviewed: existingIntake.estate_plan_last_reviewed ? new Date(existingIntake.estate_plan_last_reviewed) : undefined,
            confident_plan_works: existingIntake.confident_plan_works || '',
            trust_names: existingIntake.trust_names || [],
            trust_address_street: existingIntake.trust_address_street || '',
            trust_address_city: existingIntake.trust_address_city || '',
            trust_address_state: existingIntake.trust_address_state || '',
            trust_address_zip: existingIntake.trust_address_zip || '',
            trust_domicile_state: existingIntake.trust_domicile_state || '',
            business_name: existingIntake.business_name || '',
            business_type: existingIntake.business_type || '',
            business_description: existingIntake.business_description || '',
            business_revenue: existingIntake.business_revenue || '',
            trustees: (existingIntake.trustees as any[])?.length ? existingIntake.trustees as any : prev.trustees,
            managingTrusteePhone: existingIntake.managing_trustee_phone || '',
            successorTrustees: (existingIntake.successor_trustees as any[])?.length ? existingIntake.successor_trustees as any : prev.successorTrustees,
            beneficiaries: (existingIntake.beneficiaries as any[])?.length ? existingIntake.beneficiaries as any : prev.beneficiaries,
            top_priorities: existingIntake.top_priorities || [],
            support_preference: existingIntake.support_preference || '',
            biggest_fear: existingIntake.biggest_fear || '',
            confirmed: false,
          }));
        }
      }
    };
    loadClient();
  }, [navigate]);

  // Save progress to database (without marking as complete)
  const saveProgress = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let activeClientId = clientId;
    if (!activeClientId) {
      const answers = (() => {
        try { return JSON.parse(sessionStorage.getItem('heirway_answers') || '{}'); } catch { return {}; }
      })();
      const selectedPlan = sessionStorage.getItem('heirway_selected_plan') || 'foundation';
      const { data: newClient, error: clientError } = await supabase.from('heirway_clients').insert({
        user_id: user.id,
        email: user.email,
        full_name: `${data.first_name} ${data.last_name}`.trim() || user.user_metadata?.full_name || '',
        state: data.trust_domicile_state || data.trust_address_state || 'TX',
        recommended_plan: selectedPlan,
        selected_plan: selectedPlan,
        is_married: isMarried,
        has_children: hasChildren,
        owns_real_estate: answers.housing_situation === 'own_mortgage' || answers.housing_situation === 'own_paid',
        over_1m_assets: answers.over_1m_assets || false,
        business_ownership: answers.business_ownership || 'none',
        plan_status: 'intake_in_progress',
      } as any).select('id').single();
      if (clientError) throw clientError;
      activeClientId = newClient.id;
      setClientId(activeClientId);
    }

    const payload: any = {
      client_id: activeClientId,
      user_id: user.id,
      current_section: currentSection,
      completed: false,
      first_name: data.first_name, middle_name: data.middle_name, last_name: data.last_name,
      suffix: data.suffix, preferred_name: data.preferred_name,
      date_of_birth: data.date_of_birth?.toISOString().split('T')[0] || null,
      mobile_phone: data.mobile_phone, trust_email: data.trust_email,
      spouse_full_name: data.spouse_full_name || null, spouse_preferred_name: data.spouse_preferred_name || null,
      spouse_dob: data.spouse_dob?.toISOString().split('T')[0] || null,
      spouse_phone: data.spouse_phone || null,
      dependents: data.dependents.filter(d => d.full_name),
      additional_dependents: data.hasAdditionalDependents ? data.additionalDependents.filter(d => d.name) : [],
      cpa_name: data.cpa_name, cpa_email: data.cpa_email, cpa_phone: data.cpa_phone,
      tax_return_types: data.tax_return_types, tax_return_other: data.tax_return_other || null,
      last_tax_year: data.last_tax_year,
      estimated_current_income: data.estimated_current_income ? parseFloat(data.estimated_current_income) : null,
      major_tax_events: data.major_tax_events, expects_inheritance: data.expects_inheritance,
      inheritance_details: data.inheritance_details || null,
      existing_documents: data.existing_documents,
      estate_plan_last_reviewed: data.estate_plan_last_reviewed?.toISOString().split('T')[0] || null,
      confident_plan_works: data.confident_plan_works,
      trust_name: data.trust_names?.[0] || '', trust_names: data.trust_names,
      business_name: data.business_name, business_type: data.business_type,
      business_description: data.business_description, business_revenue: data.business_revenue,
      trust_address_street: data.trust_address_street,
      trust_address_city: data.trust_address_city, trust_address_state: data.trust_address_state,
      trust_address_zip: data.trust_address_zip, trust_domicile_state: data.trust_domicile_state,
      trustees: data.trustees.filter(t => t.full_name),
      managing_trustee_phone: data.managingTrusteePhone,
      successor_trustees: data.successorTrustees.filter(s => s.full_name),
      beneficiaries: data.beneficiaries.filter(b => b.name),
      top_priorities: data.top_priorities,
      support_preference: data.support_preference, biggest_fear: data.biggest_fear,
    };

    if (intakeId) {
      await supabase.from('heirway_intake').update(payload).eq('id', intakeId);
    } else {
      const { data: newIntake } = await supabase.from('heirway_intake' as any).insert(payload as any).select('id').single();
      if (newIntake) setIntakeId((newIntake as any).id);
    }
  };

  const handleSaveAndExit = async () => {
    setSavingExit(true);
    try {
      await saveProgress();
      await supabase.auth.signOut();
      toast.success('Progress saved! Log back in to resume where you left off.');
      navigate('/login');
    } catch (err: any) {
      toast.error('Failed to save progress');
    } finally {
      setSavingExit(false);
    }
  };

  // Build sections list dynamically based on conditions
  const allSections = [
    { id: 1, title: 'Basic Info', icon: User, show: true },
    { id: 2, title: 'Spouse / Partner', icon: Heart, show: isMarried },
    { id: 3, title: 'Dependents & Family', icon: Users, show: true },
    { id: 4, title: 'Tax & Accounting', icon: Receipt, show: true },
    { id: 5, title: 'Estate Documents', icon: FileText, show: true },
    { id: 6, title: 'Trust Template Info', icon: Video, show: true },
    { id: 7, title: 'Trust Structure', icon: Building2, show: true },
    { id: 8, title: 'Trustees', icon: UserCheck, show: true },
    { id: 9, title: 'Beneficiaries', icon: Gift, show: true },
    { id: 10, title: 'Goals & Vision', icon: Target, show: true },
    { id: 11, title: 'Confirmation', icon: CheckCircle, show: true },
  ];

  const visibleSections = allSections.filter(s => s.show);
  const currentIndex = visibleSections.findIndex(s => s.id === currentSection);
  const progress = ((currentIndex + 1) / visibleSections.length) * 100;
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === visibleSections.length - 1;

  const goNext = () => {
    if (!isLast) {
      setCurrentSection(visibleSections[currentIndex + 1].id);
      window.scrollTo(0, 0);
    }
  };
  const goPrev = () => {
    if (!isFirst) {
      setCurrentSection(visibleSections[currentIndex - 1].id);
      window.scrollTo(0, 0);
    }
  };

  const update = (partial: Partial<IntakeState>) => setData(prev => ({ ...prev, ...partial }));

  const handleSubmit = async () => {
    if (!data.confirmed) { toast.error('Please confirm the certification before submitting.'); return; }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // If no client record exists yet (new signup path), create one
      let activeClientId = clientId;
      if (!activeClientId) {
        const answers = (() => {
          try { return JSON.parse(sessionStorage.getItem('heirway_answers') || '{}'); } catch { return {}; }
        })();
        const selectedPlan = sessionStorage.getItem('heirway_selected_plan') || 'foundation';
        const { data: newClient, error: clientError } = await supabase.from('heirway_clients').insert({
          user_id: user.id,
          email: user.email,
          full_name: `${data.first_name} ${data.last_name}`.trim() || user.user_metadata?.full_name || '',
          state: data.trust_domicile_state || data.trust_address_state || 'TX',
          recommended_plan: selectedPlan,
          selected_plan: selectedPlan,
          is_married: isMarried,
          has_children: hasChildren,
          owns_real_estate: answers.housing_situation === 'own_mortgage' || answers.housing_situation === 'own_paid',
          over_1m_assets: answers.over_1m_assets || false,
          business_ownership: answers.business_ownership || 'none',
          plan_status: 'intake_in_progress',
        } as any).select('id').single();
        if (clientError) throw clientError;
        activeClientId = newClient.id;
        setClientId(activeClientId);
      }

      const payload = {
        client_id: activeClientId,
        user_id: user.id,
        first_name: data.first_name, middle_name: data.middle_name, last_name: data.last_name,
        suffix: data.suffix, preferred_name: data.preferred_name,
        date_of_birth: data.date_of_birth?.toISOString().split('T')[0] || null,
        mobile_phone: data.mobile_phone, trust_email: data.trust_email,
        spouse_full_name: data.spouse_full_name || null, spouse_preferred_name: data.spouse_preferred_name || null,
        spouse_dob: data.spouse_dob?.toISOString().split('T')[0] || null,
        spouse_phone: data.spouse_phone || null,
        dependents: data.dependents.filter(d => d.full_name),
        additional_dependents: data.hasAdditionalDependents ? data.additionalDependents.filter(d => d.name) : [],
        legacy_recipients: [],
        cpa_name: data.cpa_name, cpa_email: data.cpa_email, cpa_phone: data.cpa_phone,
        tax_return_types: data.tax_return_types,
        tax_return_other: data.tax_return_other || null,
        last_tax_year: data.last_tax_year, estimated_current_income: data.estimated_current_income ? parseFloat(data.estimated_current_income) : null,
        major_tax_events: data.major_tax_events, expects_inheritance: data.expects_inheritance,
        inheritance_details: data.inheritance_details || null,
        existing_documents: data.existing_documents,
        estate_plan_last_reviewed: data.estate_plan_last_reviewed?.toISOString().split('T')[0] || null,
        confident_plan_works: data.confident_plan_works,
        trust_name: data.trust_names?.[0] || '', trust_names: data.trust_names,
        business_name: data.business_name, business_type: data.business_type,
        business_description: data.business_description, business_revenue: data.business_revenue,
        trust_address_street: data.trust_address_street,
        trust_address_city: data.trust_address_city, trust_address_state: data.trust_address_state,
        trust_address_zip: data.trust_address_zip, trust_domicile_state: data.trust_domicile_state,
        trustees: data.trustees.filter(t => t.full_name),
        managing_trustee_phone: data.managingTrusteePhone,
        successor_trustees: data.successorTrustees.filter(s => s.full_name),
        beneficiaries: data.beneficiaries.filter(b => b.name),
        top_priorities: data.top_priorities,
        support_preference: data.support_preference, biggest_fear: data.biggest_fear,
        confirmed: true, completed: true, current_section: 11,
      };

      // Log consent for intake submission
      await supabase.from('consent_log' as any).insert({
        user_id: user.id,
        email: user.email || null,
        full_name: `${data.first_name} ${data.last_name}`.trim() || null,
        consent_type: 'terms_and_privacy',
        form_context: 'intake_submission',
        privacy_policy_version: '03/11/2026',
        terms_version: '03/11/2026',
      } as any);

      if (intakeId) {
        const { error } = await supabase.from('heirway_intake').update(payload as any).eq('id', intakeId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('heirway_intake' as any).insert(payload as any);
        if (error) throw error;
      }

      // Determine trust cap based on the plan being assigned at intake submit.
      const submitPlan = HEIRWAY_PLANS[selectedPlanId];
      const trustCap = submitPlan?.trustCount ?? 0;

      // Split intake names into the tier's allotment vs. the extras that go
      // into the client's Trust Naming Pool for future use / upgrades.
      const allTrustNames = (data.trust_names || []).map(n => n.trim()).filter(Boolean);
      const trustNames = allTrustNames.slice(0, trustCap);
      const pooledNames = allTrustNames.slice(trustCap);

      // Update client plan status + persist the naming pool overflow.
      await supabase.from('heirway_clients').update({
        plan_status: 'intake_complete',
        selected_plan: selectedPlanId,
        trust_name_pool: pooledNames,
      } as any).eq('id', activeClientId);

      // Auto-create trust progress records ONLY up to the plan's trust allotment.
      if (trustNames.length > 0) {
        const trustRecords = trustNames.map(name => ({
          user_id: user.id,
          client_id: activeClientId,
          trust_name: name,
          stage: 'assigning_creator',
          trust_type: 'revocable',
        }));
        await supabase.from('heirway_trust_progress' as any).insert(trustRecords as any);
      }

      // Send intake completion email to user
      supabase.functions.invoke('send-transactional-email', {
        body: {
          template: 'intake_complete',
          to: user.email,
          props: { fullName: `${data.first_name} ${data.last_name}`.trim() },
        },
      }).catch(err => console.error('Intake email error:', err));

      // Notify admins of intake completion
      supabase.functions.invoke('send-admin-email', {
        body: {
          event_type: 'intake_completed',
          event_data: {
            client_name: `${data.first_name} ${data.last_name}`.trim(),
            client_email: user.email || '',
          },
        },
      }).catch(err => console.error('Admin intake email error:', err));

      toast.success('Intake completed!');
      if (selectedPlanId === 'wealth_builder') {
        navigate('/heirway/meeting-request');
      } else {
        navigate('/heirway/checkout');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save intake');
    } finally {
      setLoading(false);
    }
  };

  const currentSectionData = visibleSections[currentIndex];

  return (
    <div className="min-h-screen gradient-bg">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 p-4 md:p-8 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex justify-center mb-6">
          <button
            onClick={handleSaveAndExit}
            disabled={savingExit}
            className="hover:opacity-80 transition-opacity cursor-pointer"
            title="Save & return home"
          >
            {savingExit ? (
              <div className="h-36 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <img src={heirwayLogo} alt="Heirway — click to save & exit" className="h-36 w-auto" />
            )}
          </button>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Section {currentIndex + 1} of {visibleSections.length}</span>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Section navigation pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {visibleSections.map((s, i) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => { setCurrentSection(s.id); window.scrollTo(0, 0); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  s.id === currentSection
                    ? 'bg-primary text-primary-foreground'
                    : i < currentIndex
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span className="hidden md:inline">{s.title}</span>
              </button>
            );
          })}
        </div>

        {/* Section content */}
        <Card className="glass-panel animate-fade-in">
          <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
          <CardContent className="p-6 md:p-8">
            <div className="flex items-center gap-2 mb-6">
              {currentSectionData && <currentSectionData.icon className="w-5 h-5 text-primary" />}
              <h2 className="text-xl font-display font-bold text-foreground">{currentSectionData?.title}</h2>
            </div>

            {currentSection === 1 && (
              <IntakeSectionBasicInfo data={data} onChange={update} />
            )}
            {currentSection === 2 && (
              <IntakeSectionSpouse data={data} onChange={update} />
            )}
            {currentSection === 3 && (
              <IntakeSectionDependents
                hasChildren={hasChildren}
                dependents={data.dependents}
                additionalDependents={data.additionalDependents}
                hasAdditionalDependents={data.hasAdditionalDependents}
                onDependentsChange={d => update({ dependents: d })}
                onAdditionalChange={d => update({ additionalDependents: d })}
                onHasAdditionalChange={v => update({ hasAdditionalDependents: v })}
              />
            )}
            {currentSection === 4 && (
              <IntakeSectionTax data={data} onChange={update} />
            )}
            {currentSection === 5 && (
              <IntakeSectionDocuments data={data} onChange={update} />
            )}
            {currentSection === 6 && (
              <IntakeSectionPreDrafting clientId={clientId} />
            )}
            {currentSection === 7 && (
              <IntakeSectionTrust data={data} onChange={update} selectedPlan={selectedPlanId} />
            )}
            {currentSection === 8 && (
              <IntakeSectionTrustees
                trustees={data.trustees}
                managingTrusteePhone={data.managingTrusteePhone}
                successorTrustees={data.successorTrustees}
                onTrusteesChange={t => update({ trustees: t })}
                onManagingPhoneChange={v => update({ managingTrusteePhone: v })}
                onSuccessorChange={t => update({ successorTrustees: t })}
              />
            )}
            {currentSection === 9 && (
              <IntakeSectionBeneficiaries
                beneficiaries={data.beneficiaries}
                onChange={b => update({ beneficiaries: b })}
                showSpecialCare={(() => {
                  try {
                    const a = JSON.parse(sessionStorage.getItem('heirway_answers') || '{}');
                    return a.has_special_needs === true;
                  } catch { return false; }
                })()}
              />
            )}
            {currentSection === 10 && (
              <IntakeSectionGoals data={data} onChange={update} />
            )}
            {currentSection === 11 && (
              <IntakeSectionConfirmation
                confirmed={data.confirmed}
                onConfirmedChange={v => update({ confirmed: v })}
              />
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
              <Button variant="outline" onClick={goPrev} disabled={isFirst}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Previous
              </Button>

              {isLast ? (
                <Button
                  onClick={handleSubmit}
                  disabled={!data.confirmed || loading}
                  className="bg-gradient-to-r from-primary to-accent text-primary-foreground"
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Submit Intake
                </Button>
              ) : (
                <Button onClick={goNext}>
                  Next <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
