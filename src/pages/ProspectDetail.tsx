import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { GoldHeaderCard } from '@/components/ui/gold-header-card';
import { IndexExplanationDialog } from '@/components/ui/index-explanation-dialog';
import { ProfileExplanationDialog } from '@/components/ui/profile-explanation-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { INDEX_METADATA, getAllInterpretations } from '@/lib/scoring';
import { ProspectMessenger } from '@/components/prospects/ProspectMessenger';
import {
  ArrowLeft,
  Building,
  Mail,
  Phone,
  FileText,
  Loader2,
  Send,
  Clock,
  MessageSquare,
  ArrowRight,
  Info,
  Trash2,
  MailCheck,
} from 'lucide-react';
import { toast } from 'sonner';

interface QuizAnswers {
  current_plan?: string;
  top_concern?: string;
  timeline?: string;
  walkthrough_interest?: string;
}

interface ProspectData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  created_at: string;
  quiz_answers: QuizAnswers | null;
  assessments: {
    id: string;
    created_at: string;
    primary_profile: string | null;
    secondary_profile: string | null;
    scs_score: number;
    lai_score: number;
    isi_score: number;
    adi_score: number;
    aeti_score: number;
    csi_score: number;
    pfi_score: number;
  }[];
}

interface NoteData {
  id: string;
  content: string;
  created_at: string;
}

export default function ProspectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [prospect, setProspect] = useState<ProspectData | null>(null);
  const [notes, setNotes] = useState<NoteData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<keyof typeof INDEX_METADATA | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchProspect();
      fetchNotes();
    }
  }, [id]);

  async function fetchProspect() {
    try {
      const { data, error } = await supabase
        .from('prospects')
        .select(`
          id,
          name,
          email,
          phone,
          company,
          created_at,
          quiz_answers,
          assessments (
            id,
            created_at,
            primary_profile,
            secondary_profile,
            scs_score,
            lai_score,
            isi_score,
            adi_score,
            aeti_score,
            csi_score,
            pfi_score
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setProspect(data as unknown as ProspectData);
    } catch (error) {
      console.error('Error fetching prospect:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchNotes() {
    try {
      const { data, error } = await supabase
        .from('prospect_notes')
        .select('id, content, created_at')
        .eq('prospect_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  }

  const handleAddNote = async () => {
    if (!newNote.trim() || !prospect) return;

    setIsSubmittingNote(true);
    try {
      const { data, error } = await supabase
        .from('prospect_notes')
        .insert({
          prospect_id: prospect.id,
          content: newNote.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      setNotes(prev => [data, ...prev]);
      setNewNote('');
      toast.success('Note added');
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleResendVerification = async () => {
    if (!prospect?.email) {
      toast.error('No email on file for this prospect');
      return;
    }
    setIsResending(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-resend-verification', {
        body: { email: prospect.email },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'Failed to resend');
      const messages: Record<string, string> = {
        verification_resent: 'Verification email resent',
        invited: 'Invitation email sent',
        recovery_sent: 'User already verified — sent password reset link instead',
      };
      toast.success(messages[data.action] || 'Email sent');
    } catch (e: any) {
      console.error('Resend verification error:', e);
      toast.error(e.message || 'Failed to resend verification');
    } finally {
      setIsResending(false);
    }
  };

  const handleDeleteProspect = async () => {
    if (!prospect) return;

    setIsDeleting(true);
    try {
      // Clean up related contact_messages so admin counts stay accurate
      await supabase.from('contact_messages').delete().eq('prospect_id', prospect.id);
      if (prospect.email) {
        await supabase.from('contact_messages').delete().eq('email', prospect.email);
      }
      const { error } = await supabase.from('prospects').delete().eq('id', prospect.id);
      if (error) throw error;
      toast.success('Prospect deleted');
      navigate('/prospects');
    } catch (error) {
      console.error('Error deleting prospect:', error);
      toast.error('Failed to delete prospect');
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-8 flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!prospect) {
    return (
      <AppLayout>
        <div className="p-8">
          <Card className="max-w-md mx-auto overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">Prospect not found</p>
              <Link to="/prospects">
                <Button variant="outline" className="mt-4">
                  Back to Prospects
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const assessment = prospect.assessments[0];
  const scores = assessment ? {
    scs: assessment.scs_score,
    lai: assessment.lai_score,
    isi: assessment.isi_score,
    adi: assessment.adi_score,
    aeti: assessment.aeti_score,
    csi: assessment.csi_score,
    pfi: assessment.pfi_score,
  } : null;
  const interpretations = scores ? getAllInterpretations(scores) : null;

  // All indices use gold/amber theme colors
  const indexItems = assessment ? [
    { label: 'SCS', value: assessment.scs_score, key: 'scs' as const },
    { label: 'LAI', value: assessment.lai_score, key: 'lai' as const },
    { label: 'ISI', value: assessment.isi_score, key: 'isi' as const },
    { label: 'ADI', value: assessment.adi_score, key: 'adi' as const },
    { label: 'AETI', value: assessment.aeti_score, key: 'aeti' as const },
    { label: 'CSI', value: assessment.csi_score, key: 'csi' as const },
    { label: 'PFI', value: assessment.pfi_score, key: 'pfi' as const },
  ] : [];

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="mb-6 md:mb-8 animate-fade-in">
          <Link to="/prospects" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Prospects
          </Link>
          
          <div className="flex flex-col gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                {prospect.name}
              </h1>
              
              {/* Profile badges - stack on mobile */}
              {assessment?.primary_profile && (
                <div className="flex flex-col sm:flex-row gap-2 mt-2">
                  <Badge 
                    variant="outline" 
                    className="cursor-pointer hover:bg-primary/10 transition-colors text-xs md:text-sm w-fit"
                    onClick={() => setSelectedProfile(assessment.primary_profile)}
                  >
                    {assessment.primary_profile}
                    <Info className="w-3 h-3 ml-1.5 text-muted-foreground" />
                  </Badge>
                  {assessment?.secondary_profile && (
                    <Badge 
                      variant="secondary" 
                      className="cursor-pointer hover:bg-secondary/80 transition-colors text-xs md:text-sm w-fit"
                      onClick={() => setSelectedProfile(assessment.secondary_profile)}
                    >
                      {assessment.secondary_profile}
                      <Info className="w-3 h-3 ml-1.5 text-muted-foreground" />
                    </Badge>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-3 md:gap-4 text-sm text-muted-foreground">
              {prospect.company && (
                <span className="flex items-center gap-1">
                  <Building className="w-4 h-4" />
                  {prospect.company}
                </span>
              )}
              {prospect.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  <span className="truncate max-w-[200px]">{prospect.email}</span>
                </span>
              )}
              {prospect.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  {prospect.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            {/* Get Started Answers */}
            {(prospect as any).quiz_answers && (
              <GoldHeaderCard
                title="Get Started Answers"
                description="Responses from the initial questionnaire"
                icon={<MessageSquare className="w-4 h-4 text-primary" />}
                className="animate-fade-in"
              >
                <div className="space-y-3">
                  {[
                    { label: 'Do you currently have a plan for who legally owns and controls everything if something happened to you?', key: 'current_plan', map: { yes_fully: 'Yes, fully set up', kind_of: 'Kind of / not sure', no: 'No' } as Record<string, string> },
                    { label: 'What are you most concerned about?', key: 'top_concern', map: { taxes: 'Taxes', protecting_assets: 'Protecting assets', passing_to_family: 'Passing to family', avoiding_probate: 'Avoiding probate', just_learning: 'Just learning', all_set: 'All set, here for prizes' } as Record<string, string> },
                    { label: 'When are you looking to handle this?', key: 'timeline', map: { asap: 'ASAP', '3_6_months': 'Next 3–6 months', exploring: 'Just exploring' } as Record<string, string> },
                    { label: 'Would it help to walk through your situation and see how this would be structured?', key: 'walkthrough_interest', map: { yes: 'Yes', maybe: 'Maybe later', no: 'No need' } as Record<string, string> },
                  ].map(({ label, key, map }) => {
                    const val = ((prospect as any).quiz_answers as QuizAnswers)?.[key as keyof QuizAnswers];
                    if (!val) return null;
                    return (
                      <div key={key} className="py-2 border-b border-border/30 last:border-0">
                        <p className="text-sm text-muted-foreground leading-snug mb-1.5">{label}</p>
                        <Badge variant="outline" className="text-xs">{map[val] || val}</Badge>
                      </div>
                    );
                  })}
                </div>
              </GoldHeaderCard>
            )}

            {/* Assessment Summary */}
            <GoldHeaderCard
              title="Assessment"
              description="Diagnostic profile and indices"
              icon={<FileText className="w-4 h-4 text-primary" />}
              headerAction={
                assessment && (
                  <Link to={`/assessment/${assessment.id}/results`}>
                    <Button size="sm" variant="outline" className="group">
                      Full Results
                      <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                )
              }
              className="animate-fade-in"
            >
              {!assessment ? (
                <p className="text-center text-muted-foreground py-8">
                  No assessment completed yet
                </p>
              ) : (
                <div className="space-y-4 md:space-y-6">
                  {/* Profile - Stack on mobile */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                    <div className="flex items-center gap-2">
                      <p className="text-xs md:text-sm text-muted-foreground">Primary:</p>
                      <button 
                        className="font-semibold text-base md:text-lg hover:text-primary transition-colors flex items-center gap-1"
                        onClick={() => setSelectedProfile(assessment.primary_profile)}
                      >
                        {assessment.primary_profile || 'Unclassified'}
                        <Info className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground" />
                      </button>
                    </div>
                    {assessment.secondary_profile && (
                      <div className="flex items-center gap-2">
                        <p className="text-xs md:text-sm text-muted-foreground">Secondary:</p>
                        <button 
                          className="font-semibold text-base md:text-lg hover:text-primary transition-colors flex items-center gap-1"
                          onClick={() => setSelectedProfile(assessment.secondary_profile)}
                        >
                          {assessment.secondary_profile}
                          <Info className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <Separator />
                  
                  {/* Indices - Clickable */}
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground mb-3">Diagnostic Indices <span className="text-xs">(click for details)</span></p>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 md:gap-3">
                      {indexItems.map((idx) => (
                        <button 
                          key={idx.label} 
                          onClick={() => setSelectedIndex(idx.key)}
                          className="px-2 md:px-3 py-2 rounded-lg text-center bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                        >
                          <p className="text-xs font-medium opacity-70">{idx.label}</p>
                          <p className="text-base md:text-lg font-bold">{idx.value}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Completed {new Date(assessment.created_at).toLocaleDateString()}
                  </p>
                </div>
              )}
            </GoldHeaderCard>

            {/* Notes */}
            <GoldHeaderCard
              title="Notes"
              description="Observations and orientation notes"
              icon={<MessageSquare className="w-4 h-4 text-primary" />}
              className="animate-fade-in"
            >
              {/* Add Note Form */}
              <div className="flex gap-3 mb-6">
                <Textarea
                  placeholder="Add a note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="min-h-[80px]"
                />
                <Button
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || isSubmittingNote}
                  className="self-end"
                >
                  {isSubmittingNote ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {/* Notes List */}
              {notes.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No notes yet
                </p>
              ) : (
                <div className="space-y-4">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="p-4 rounded-lg bg-muted/30 border border-border"
                    >
                      <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(note.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </GoldHeaderCard>

            {/* Direct Messaging */}
            <ProspectMessenger
              prospectId={prospect.id}
              prospectName={prospect.name}
              prospectEmail={prospect.email}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-4 md:space-y-6">
            <Card className="animate-fade-in shadow-card overflow-hidden" style={{ animationDelay: '100ms' }}>
              <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
              <CardHeader>
                <CardTitle className="text-lg">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">
                    {new Date(prospect.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Assessment Status</p>
                  <p className="font-medium">
                    {assessment ? 'Completed' : 'Pending'}
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Total Notes</p>
                  <p className="font-medium">{notes.length}</p>
                </div>
                <Separator />
                {prospect.email && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleResendVerification}
                    disabled={isResending}
                  >
                    {isResending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <MailCheck className="w-4 h-4 mr-2" />
                    )}
                    Resend Verification Email
                  </Button>
                )}
                <Separator />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 mr-2" />
                      )}
                      Delete Prospect
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Prospect</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete {prospect.name} and all their associated assessments and notes. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteProspect}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <IndexExplanationDialog
        open={selectedIndex !== null}
        onOpenChange={(open) => !open && setSelectedIndex(null)}
        indexKey={selectedIndex}
        score={scores && selectedIndex ? scores[selectedIndex] : undefined}
        interpretation={interpretations && selectedIndex ? interpretations[selectedIndex] : undefined}
      />

      <ProfileExplanationDialog
        open={selectedProfile !== null}
        onOpenChange={(open) => !open && setSelectedProfile(null)}
        profileName={selectedProfile}
      />
    </AppLayout>
  );
}
