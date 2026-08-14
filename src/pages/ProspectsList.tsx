import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { toast } from 'sonner';
import {
  Users,
  Search,
  Plus,
  ArrowRight,
  Building,
  Mail,
  Phone,
  Loader2,
  FileText,
  Trash2,
  CheckCircle2,
  Circle,
  MessageSquare,
  ChevronDown,
  LayoutGrid,
  List as ListIcon,
  Sparkles,
  ClipboardCheck,
  Download,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { QUESTIONS, SECTIONS } from '@/lib/questions';
import * as XLSX from 'xlsx';

interface QuizAnswers {
  current_plan?: string;
  top_concern?: string;
  timeline?: string;
  walkthrough_interest?: string;
}

interface AssessmentRow {
  id: string;
  primary_profile: string | null;
  [key: string]: any;
}

interface ContactSummary {
  id: string;
  subject: string | null;
  message: string;
  created_at: string;
}

interface ProspectListItem {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  created_at: string;
  registered: boolean;
  quiz_answers: QuizAnswers | null;
  assessments: AssessmentRow[];
  contacts: ContactSummary[];
  // True for synthetic rows that come from contact_messages with no matching prospect record
  isContactOnly?: boolean;
}

// Helper: turn raw assessment value(s) into human labels
function getAssessmentAnswerLabels(assessment: AssessmentRow, questionId: string): string[] {
  const response = assessment[questionId];
  const question = QUESTIONS.find((q) => q.id === questionId);
  if (!question || response === undefined || response === null) return [];
  if (Array.isArray(response)) {
    if (response.length === 0) return [];
    return [...new Set(response)].map(
      (val) => question.options.find((o) => o.value === val)?.label || String(val)
    );
  }
  if (typeof response === 'string' && response.length === 0) return [];
  return [question.options.find((o) => o.value === response)?.label || String(response)];
}

const QUIZ_QUESTIONS: { key: keyof QuizAnswers; question: string; map: Record<string, string> }[] = [
  {
    key: 'current_plan',
    question: 'Do you currently have a plan for who legally owns and controls everything if something happened to you?',
    map: { yes_fully: 'Yes, fully set up', kind_of: 'Kind of / not sure', no: 'No' },
  },
  {
    key: 'top_concern',
    question: 'What are you most concerned about?',
    map: {
      taxes: 'Taxes',
      protecting_assets: 'Protecting assets',
      passing_to_family: 'Passing to family',
      avoiding_probate: 'Avoiding probate',
      just_learning: 'Just learning',
      all_set: 'All set, here for prizes',
    },
  },
  {
    key: 'timeline',
    question: 'When are you looking to handle this?',
    map: { asap: 'ASAP', '3_6_months': 'Next 3–6 months', exploring: 'Just exploring' },
  },
  {
    key: 'walkthrough_interest',
    question: 'Would it help to walk through your situation and see how this would be structured?',
    map: { yes: 'Yes', maybe: 'Maybe later', no: 'No need' },
  },
];

type RegistrationFilter = 'all' | 'registered' | 'unregistered';
type SourceFilter = 'all' | 'quiz' | 'diagnostic' | 'contact';
type ViewMode = 'cards' | 'list';

// Determine the lead source from a prospect record (priority: diagnostic > quiz > contact > other)
function getProspectSource(p: { quiz_answers: QuizAnswers | null; assessments: AssessmentRow[]; contacts?: ContactSummary[] }): 'quiz' | 'diagnostic' | 'contact' | 'other' {
  const hasQuiz = !!p.quiz_answers && Object.values(p.quiz_answers).some(Boolean);
  const hasAssessment = Array.isArray(p.assessments) && p.assessments.length > 0;
  const hasContact = Array.isArray(p.contacts) && p.contacts.length > 0;
  if (hasAssessment) return 'diagnostic';
  if (hasQuiz) return 'quiz';
  if (hasContact) return 'contact';
  return 'other';
}

// Profile colors using warm gold/amber theme - no blues
const getProfileColor = (profile: string): string => {
  const colors: Record<string, string> = {
    'Loss Averse Overpayer': 'bg-amber-500/15 text-amber-500 border-amber-500/30',
    'Authority Gated Optimizer': 'bg-orange-500/15 text-orange-500 border-orange-500/30',
    'Rational Maximizer': 'bg-success/15 text-success border-success/30',
    'Control Sensitive Operator': 'bg-primary/15 text-primary border-primary/30',
    'Irreversibility Sensitive': 'bg-destructive/15 text-destructive border-destructive/30',
    'Audit Anxious': 'bg-warning/15 text-warning border-warning/30',
    'Price Sensitive': 'bg-accent/15 text-accent border-accent/30',
    'Legacy Builder': 'bg-secondary/15 text-secondary-foreground border-secondary/30',
    'Asset Rich Cash Constrained Landowner': 'bg-muted text-muted-foreground border-border',
    'Institutional or Investment Firm': 'bg-primary/15 text-primary border-primary/30',
  };
  return colors[profile] || 'bg-primary/10 text-primary border-primary/30';
};

const STORAGE_KEY = 'prospectsList:state:v1';
const SCROLL_KEY = 'prospectsList:scroll:v1';

type PersistedState = {
  searchQuery: string;
  registrationFilter: RegistrationFilter;
  sourceFilter: SourceFilter;
  quizFilters: Record<keyof QuizAnswers, string>;
  viewMode: ViewMode;
};

function loadPersistedState(): Partial<PersistedState> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export default function ProspectsList() {
  const persisted = loadPersistedState();
  const [prospects, setProspects] = useState<ProspectListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(persisted.searchQuery ?? '');
  const [registrationFilter, setRegistrationFilter] = useState<RegistrationFilter>(persisted.registrationFilter ?? 'all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>(persisted.sourceFilter ?? 'all');
  const [quizFilters, setQuizFilters] = useState<Record<keyof QuizAnswers, string>>(persisted.quizFilters ?? {
    current_plan: 'all',
    top_concern: 'all',
    timeline: 'all',
    walkthrough_interest: 'all',
  });
  const [viewMode, setViewMode] = useState<ViewMode>(persisted.viewMode ?? 'cards');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const navigate = useNavigate();

  // Persist filter state whenever it changes
  useEffect(() => {
    const state: PersistedState = { searchQuery, registrationFilter, sourceFilter, quizFilters, viewMode };
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }, [searchQuery, registrationFilter, sourceFilter, quizFilters, viewMode]);

  // Save scroll position before unmount/navigation; restore after data loads
  useEffect(() => {
    const saveScroll = () => {
      try { sessionStorage.setItem(SCROLL_KEY, String(window.scrollY)); } catch {}
    };
    window.addEventListener('beforeunload', saveScroll);
    return () => {
      saveScroll();
      window.removeEventListener('beforeunload', saveScroll);
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;
    try {
      const y = sessionStorage.getItem(SCROLL_KEY);
      if (y) {
        const num = parseInt(y, 10);
        if (!Number.isNaN(num)) {
          // Defer past ScrollToTop's 120ms re-scroll
          setTimeout(() => window.scrollTo(0, num), 180);
        }
      }
    } catch {}
  }, [isLoading]);



  // Create a real prospect record from a contact-only lead, then navigate to its detail page.
  const promoteContactToProspect = async (prospect: ProspectListItem) => {
    if (!prospect.isContactOnly) return;
    setPromotingId(prospect.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('prospects')
        .insert({
          name: prospect.name,
          email: prospect.email,
          phone: prospect.phone,
          company: prospect.company,
          status: 'new',
          created_by: user?.id ?? null,
        })
        .select('id')
        .single();
      if (error) throw error;
      navigate(`/prospects/${data.id}`);
    } catch (err) {
      console.error('Promote contact error:', err);
      toast.error('Could not open contact profile.');
      setPromotingId(null);
    }
  };

  useEffect(() => {
    fetchProspects();
  }, []);

  async function fetchProspects() {
    try {
      const [
        { data: prospectData, error },
        { data: clientData, error: clientErr },
        { data: contactData, error: contactErr },
      ] = await Promise.all([
        supabase
          .from('prospects')
          .select(`
            id,
            name,
            email,
            phone,
            company,
            created_at,
            quiz_answers,
            assessments (*)
          `)
          .order('created_at', { ascending: false }),
        supabase.from('heirway_clients').select('email'),
        supabase
          .from('contact_messages')
          .select('id, full_name, email, subject, message, created_at')
          .order('created_at', { ascending: false }),
      ]);

      if (error) throw error;
      if (clientErr) throw clientErr;
      if (contactErr) throw contactErr;

      const registeredEmails = new Set(
        (clientData ?? [])
          .map((c) => c.email?.toLowerCase().trim())
          .filter(Boolean) as string[]
      );

      // Group contact messages by lowercased email so we can attach to prospect rows
      const contactsByEmail = new Map<string, ContactSummary[]>();
      for (const c of contactData ?? []) {
        const key = (c.email || '').toLowerCase().trim();
        if (!key) continue;
        const summary: ContactSummary = {
          id: c.id,
          subject: c.subject,
          message: c.message,
          created_at: c.created_at,
        };
        const list = contactsByEmail.get(key) ?? [];
        list.push(summary);
        contactsByEmail.set(key, list);
      }

      const prospectEmails = new Set<string>();
      const enriched: ProspectListItem[] = (prospectData ?? []).map((p: any) => {
        const emailKey = (p.email || '').toLowerCase().trim();
        if (emailKey) prospectEmails.add(emailKey);
        return {
          ...p,
          registered: !!emailKey && registeredEmails.has(emailKey),
          contacts: emailKey ? (contactsByEmail.get(emailKey) ?? []) : [],
        };
      });

      // Synthetic rows for contact_messages whose email isn't tied to any prospect
      const contactOnly: ProspectListItem[] = [];
      const seenContactEmails = new Set<string>();
      for (const c of contactData ?? []) {
        const key = (c.email || '').toLowerCase().trim();
        if (!key || prospectEmails.has(key) || seenContactEmails.has(key)) continue;
        seenContactEmails.add(key);
        const allForEmail = contactsByEmail.get(key) ?? [];
        contactOnly.push({
          id: `contact:${c.id}`,
          name: c.full_name || c.email || 'Contact',
          email: c.email,
          phone: null,
          company: null,
          created_at: c.created_at,
          registered: registeredEmails.has(key),
          quiz_answers: null,
          assessments: [],
          contacts: allForEmail,
          isContactOnly: true,
        });
      }

      const merged = [...enriched, ...contactOnly].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setProspects(merged);
    } catch (error) {
      console.error('Error fetching prospects:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const registeredCount = prospects.filter((p) => p.registered).length;
  const unregisteredCount = prospects.length - registeredCount;
  const quizCount = prospects.filter((p) => getProspectSource(p) === 'quiz').length;
  const diagnosticCount = prospects.filter((p) => getProspectSource(p) === 'diagnostic').length;
  const contactCount = prospects.filter((p) => (p.contacts?.length ?? 0) > 0).length;

  const filteredProspects = prospects.filter((prospect) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      prospect.name.toLowerCase().includes(searchLower) ||
      prospect.company?.toLowerCase().includes(searchLower) ||
      prospect.email?.toLowerCase().includes(searchLower);

    const matchesRegistration =
      registrationFilter === 'all' ||
      (registrationFilter === 'registered' && prospect.registered) ||
      (registrationFilter === 'unregistered' && !prospect.registered);

    const source = getProspectSource(prospect);
    const hasContact = (prospect.contacts?.length ?? 0) > 0;
    const matchesSource =
      sourceFilter === 'all' ||
      (sourceFilter === 'quiz' && source === 'quiz') ||
      (sourceFilter === 'diagnostic' && source === 'diagnostic') ||
      (sourceFilter === 'contact' && hasContact);

    const matchesQuiz = (Object.keys(quizFilters) as (keyof QuizAnswers)[]).every((key) => {
      const selected = quizFilters[key];
      if (selected === 'all') return true;
      return prospect.quiz_answers?.[key] === selected;
    });

    return matchesSearch && matchesRegistration && matchesSource && matchesQuiz;
  });

  const handleDeleteProspect = async (id: string) => {
    setDeletingId(id);
    try {
      const target = prospects.find((p) => p.id === id);

      if (target?.isContactOnly) {
        // Synthetic row backed only by contact_messages — delete all contact messages for this email
        const email = target.email;
        if (!email) throw new Error('Missing contact email');
        const { error: cErr } = await supabase
          .from('contact_messages')
          .delete()
          .eq('email', email);
        if (cErr) throw cErr;
      } else {
        // Real prospect row — also remove related contact_messages (by prospect_id and matching email)
        // so the "Contact" category count stays accurate.
        const email = target?.email ?? null;
        await supabase.from('contact_messages').delete().eq('prospect_id', id);
        if (email) {
          await supabase.from('contact_messages').delete().eq('email', email);
        }
        const { error } = await supabase.from('prospects').delete().eq('id', id);
        if (error) throw error;
      }

      setProspects((prev) => prev.filter((p) => p.id !== id));
      toast.success('Prospect deleted');
    } catch (error) {
      console.error('Error deleting prospect:', error);
      toast.error('Failed to delete prospect');
    } finally {
      setDeletingId(null);
    }
  };

  const handleExportExcel = () => {
    if (filteredProspects.length === 0) {
      toast.error('No prospects to export');
      return;
    }

    const rows = filteredProspects.map((p) => {
      const nameParts = (p.name || '').trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      const source = getProspectSource(p);
      const qa = p.quiz_answers || {};
      const latestContact = p.contacts?.[0];

      return {
        'First Name': firstName,
        'Last Name': lastName,
        'Email': p.email || '',
        'Phone': p.phone || '',
        'Company': p.company || '',
        'Source': source,
        'Registered': p.registered ? 'Yes' : 'No',
        'Created At': new Date(p.created_at).toISOString(),
        'Current Plan': qa.current_plan || '',
        'Top Concern': qa.top_concern || '',
        'Timeline': qa.timeline || '',
        'Walkthrough Interest': qa.walkthrough_interest || '',
        'Assessment Profile': p.assessments?.[0]?.primary_profile || '',
        'Contact Subject': latestContact?.subject || '',
        'Contact Message': latestContact?.message || '',
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    // Auto-size columns
    const colWidths = Object.keys(rows[0]).map((key) => ({
      wch: Math.min(
        50,
        Math.max(key.length, ...rows.map((r) => String(r[key as keyof typeof r] ?? '').length))
      ) + 2,
    }));
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Prospects');
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `heirway-prospects-${stamp}.xlsx`);
    toast.success(`Exported ${rows.length} prospects`);
  };

  const handleExportCSV = () => {
    if (filteredProspects.length === 0) {
      toast.error('No prospects to export');
      return;
    }

    const rows = filteredProspects.map((p) => {
      const nameParts = (p.name || '').trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      const source = getProspectSource(p);
      const qa = p.quiz_answers || {};
      const latestContact = p.contacts?.[0];

      return {
        'First Name': firstName,
        'Last Name': lastName,
        'Email': p.email || '',
        'Phone': p.phone || '',
        'Company': p.company || '',
        'Source': source,
        'Registered': p.registered ? 'Yes' : 'No',
        'Created At': new Date(p.created_at).toISOString(),
        'Current Plan': qa.current_plan || '',
        'Top Concern': qa.top_concern || '',
        'Timeline': qa.timeline || '',
        'Walkthrough Interest': qa.walkthrough_interest || '',
        'Assessment Profile': p.assessments?.[0]?.primary_profile || '',
        'Contact Subject': latestContact?.subject || '',
        'Contact Message': latestContact?.message || '',
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `heirway-prospects-${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} prospects`);
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8 animate-fade-in">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Prospects</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {prospects.length} total · {registeredCount} registered · {unregisteredCount} not registered
            </p>
          </div>
          <div className="flex flex-row sm:flex-row gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={handleExportExcel} className="flex-1 sm:flex-initial sm:size-default">
              <Download className="w-4 h-4 sm:mr-2" />
              <span className="hidden xs:inline sm:inline">Excel</span>
              <span className="hidden sm:inline">&nbsp;Export</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="flex-1 sm:flex-initial sm:size-default">
              <Download className="w-4 h-4 sm:mr-2" />
              <span className="hidden xs:inline sm:inline">CSV</span>
              <span className="hidden sm:inline">&nbsp;Export</span>
            </Button>
            <Link to="/assessment/new" className="flex-1 sm:flex-initial">
              <Button size="sm" className="w-full sm:w-auto sm:size-default">
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden xs:inline">New</span>
                <span className="hidden sm:inline">&nbsp;Assessment</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Search + Filter */}
        <Card className="mb-4 md:mb-6 animate-fade-in shadow-card overflow-hidden" style={{ animationDelay: '50ms' }}>
          <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, company, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <div className="hidden sm:flex items-center gap-1 border border-border rounded-md p-0.5 bg-muted/30">
                <Button
                  variant={viewMode === 'cards' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setViewMode('cards')}
                  title="Card view"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setViewMode('list')}
                  title="List view"
                >
                  <ListIcon className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            <Tabs value={registrationFilter} onValueChange={(v) => setRegistrationFilter(v as RegistrationFilter)}>
              <TabsList className="grid w-full grid-cols-3 h-auto">
                <TabsTrigger value="all" className="text-xs sm:text-sm px-1 py-1.5">All ({prospects.length})</TabsTrigger>
                <TabsTrigger value="registered" className="text-xs sm:text-sm px-1 py-1.5">
                  <span className="sm:hidden">Reg. ({registeredCount})</span>
                  <span className="hidden sm:inline">Registered ({registeredCount})</span>
                </TabsTrigger>
                <TabsTrigger value="unregistered" className="text-xs sm:text-sm px-1 py-1.5">
                  <span className="sm:hidden">Unreg. ({unregisteredCount})</span>
                  <span className="hidden sm:inline">Not Registered ({unregisteredCount})</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Tabs value={sourceFilter} onValueChange={(v) => setSourceFilter(v as SourceFilter)}>
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto gap-1">
                <TabsTrigger value="all" className="text-xs sm:text-sm px-1 py-1.5">All ({prospects.length})</TabsTrigger>
                <TabsTrigger value="quiz" className="gap-1 text-xs sm:text-sm px-1 py-1.5">
                  <Sparkles className="w-3 h-3 shrink-0" /> <span className="truncate">Started ({quizCount})</span>
                </TabsTrigger>
                <TabsTrigger value="diagnostic" className="gap-1 text-xs sm:text-sm px-1 py-1.5">
                  <ClipboardCheck className="w-3 h-3 shrink-0" /> <span className="truncate">Diag. ({diagnosticCount})</span>
                </TabsTrigger>
                <TabsTrigger value="contact" className="gap-1 text-xs sm:text-sm px-1 py-1.5">
                  <Mail className="w-3 h-3 shrink-0" /> <span className="truncate">Contact ({contactCount})</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="pt-1">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Filter by quiz answers</p>
                {Object.values(quizFilters).some((v) => v !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => setQuizFilters({ current_plan: 'all', top_concern: 'all', timeline: 'all', walkthrough_interest: 'all' })}
                  >
                    Clear
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {QUIZ_QUESTIONS.map((q) => (
                  <Select
                    key={q.key}
                    value={quizFilters[q.key]}
                    onValueChange={(val) => setQuizFilters((prev) => ({ ...prev, [q.key]: val }))}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder={q.key} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        All — {q.key === 'current_plan' ? 'Plan in place' : q.key === 'top_concern' ? 'Top concern' : q.key === 'timeline' ? 'Timeline' : 'Walkthrough'}
                      </SelectItem>
                      {Object.entries(q.map).map(([val, label]) => (
                        <SelectItem key={val} value={val}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredProspects.length === 0 ? (
          <Card className="animate-fade-in shadow-card overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
            <CardContent className="p-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No prospects found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? 'Try adjusting your search'
                  : 'Start by creating a new assessment'
                }
              </p>
              <Link to="/assessment/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  New Assessment
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          viewMode === 'list' ? (
            <Card className="animate-fade-in shadow-card overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium">First Name</th>
                        <th className="text-left px-4 py-3 font-medium">Last Name</th>
                        <th className="text-left px-4 py-3 font-medium">Email</th>
                        <th className="text-left px-4 py-3 font-medium">Phone</th>
                        <th className="text-left px-4 py-3 font-medium">Source</th>
                        <th className="text-left px-4 py-3 font-medium">Profile</th>
                        <th className="text-left px-4 py-3 font-medium">Registered</th>
                        <th className="text-left px-4 py-3 font-medium">Submitted</th>
                        <th className="text-right px-4 py-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProspects.map((prospect) => {
                        const parts = (prospect.name || '').trim().split(/\s+/);
                        const first = parts[0] || '—';
                        const last = parts.slice(1).join(' ') || '';
                        const source = getProspectSource(prospect);
                        const profile = prospect.assessments[0]?.primary_profile;
                        return (
                          <tr key={prospect.id} className="border-t border-border/40 hover:bg-muted/20">
                            <td className="px-4 py-3 font-medium text-foreground">
                              {prospect.isContactOnly ? (
                                <button
                                  type="button"
                                  onClick={() => promoteContactToProspect(prospect)}
                                  disabled={promotingId === prospect.id}
                                  className="hover:text-primary text-left disabled:opacity-60"
                                  title="Open contact profile"
                                >
                                  {promotingId === prospect.id ? <Loader2 className="w-3 h-3 animate-spin inline" /> : first}
                                </button>
                              ) : (
                                <Link to={`/prospects/${prospect.id}`} className="hover:text-primary">{first}</Link>
                              )}
                            </td>
                            <td className="px-4 py-3 text-foreground">{last || '—'}</td>
                            <td className="px-4 py-3 text-muted-foreground">{prospect.email || '—'}</td>
                            <td className="px-4 py-3 text-muted-foreground">{prospect.phone || '—'}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {source === 'diagnostic' && (
                                  <Badge variant="outline" className="text-[10px] gap-1 bg-primary/5 border-primary/30 text-primary">
                                    <ClipboardCheck className="w-3 h-3" /> Diagnostic
                                  </Badge>
                                )}
                                {source === 'quiz' && (
                                  <Badge variant="outline" className="text-[10px] gap-1 bg-accent/10 border-accent/30">
                                    <Sparkles className="w-3 h-3" /> Get Started
                                  </Badge>
                                )}
                                {(prospect.contacts?.length ?? 0) > 0 && (
                                  <Badge variant="outline" className="text-[10px] gap-1 bg-warning/10 border-warning/30">
                                    <Mail className="w-3 h-3" /> Contact
                                  </Badge>
                                )}
                                {source === 'other' && (prospect.contacts?.length ?? 0) === 0 && (
                                  <Badge variant="outline" className="text-[10px]">Other</Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {profile ? (
                                <Badge className={`text-[10px] ${getProfileColor(profile)}`}>{profile}</Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {prospect.registered ? (
                                <Badge className="bg-success/15 text-success border-success/30 text-[10px]">Registered</Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] text-muted-foreground">Lead only</Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                              {new Date(prospect.created_at).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                                    disabled={deletingId === prospect.id}
                                  >
                                    {deletingId === prospect.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-4 h-4" />
                                    )}
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
                                      onClick={() => handleDeleteProspect(prospect.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {filteredProspects.map((prospect, index) => {
              const handleCardClick = () => {
                if (prospect.isContactOnly) {
                  if (promotingId !== prospect.id) promoteContactToProspect(prospect);
                } else {
                  navigate(`/prospects/${prospect.id}`);
                }
              };
              return (
                <Card
                  key={prospect.id}
                  className="animate-fade-in shadow-card hover:shadow-lg hover:border-primary/30 transition-all h-full overflow-hidden"
                  style={{ animationDelay: `${(index + 1) * 30}ms` }}
                >
                  <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
                  <CardContent className="p-4 md:p-6">
                    <div className="mb-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3
                          className="font-semibold text-lg cursor-pointer hover:text-primary transition-colors"
                          onClick={handleCardClick}
                        >
                          {prospect.name}
                        </h3>
                        {prospect.registered ? (
                          <Badge className="bg-success/15 text-success border-success/30 text-[10px] font-medium px-2 py-0.5 flex items-center gap-1 flex-shrink-0">
                            <CheckCircle2 className="w-3 h-3" />
                            Registered
                          </Badge>
                        ) : (
                          <Badge className="bg-muted text-muted-foreground border-border text-[10px] font-medium px-2 py-0.5 flex items-center gap-1 flex-shrink-0">
                            <Circle className="w-3 h-3" />
                            Not Registered
                          </Badge>
                        )}
                      </div>
                      {prospect.company && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Building className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{prospect.company}</span>
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {prospect.assessments[0]?.primary_profile && (
                          <Badge
                            className={`text-xs font-medium px-2.5 py-1 ${getProfileColor(prospect.assessments[0].primary_profile)}`}
                          >
                            {prospect.assessments[0].primary_profile}
                          </Badge>
                        )}
                        {(prospect.contacts?.length ?? 0) > 0 && (
                          <Badge variant="outline" className="text-[10px] gap-1 bg-warning/10 border-warning/30">
                            <Mail className="w-3 h-3" />
                            Contact{prospect.contacts.length > 1 ? ` (${prospect.contacts.length})` : ''}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 mb-4 text-sm">
                      {prospect.email && (
                        <p className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{prospect.email}</span>
                        </p>
                      )}
                      {prospect.phone && (
                        <p className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="w-4 h-4 flex-shrink-0" />
                          {prospect.phone}
                        </p>
                      )}
                      <p className="flex items-center gap-2 text-muted-foreground">
                        <FileText className="w-4 h-4 flex-shrink-0" />
                        {prospect.assessments.length > 0 ? 'Assessment completed' : 'No assessment'}
                      </p>
                    </div>

                    {/* Compact summary chips — always visible quiz answers */}
                    {prospect.quiz_answers && Object.values(prospect.quiz_answers).some(Boolean) && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {QUIZ_QUESTIONS.map(({ key, map }) => {
                          const val = prospect.quiz_answers?.[key];
                          if (!val) return null;
                          return (
                            <Badge
                              key={key}
                              variant="outline"
                              className="text-[10px] font-medium bg-primary/5 border-primary/20 text-foreground"
                              title={map[val] || val}
                            >
                              {map[val] || val}
                            </Badge>
                          );
                        })}
                      </div>
                    )}

                    {/* Quiz answers (Get Started questionnaire) — full detail on expand */}
                    {prospect.quiz_answers && Object.values(prospect.quiz_answers).some(Boolean) && (
                      <Collapsible className="mb-4">
                        <CollapsibleTrigger
                          onClick={(e) => e.stopPropagation()}
                          className="w-full flex items-center justify-between gap-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors p-2 rounded-md bg-primary/5 border border-primary/20 group"
                        >
                          <span className="flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5" />
                            Get Started Answers
                          </span>
                          <ChevronDown className="w-3.5 h-3.5 transition-transform group-data-[state=open]:rotate-180" />
                        </CollapsibleTrigger>
                        <CollapsibleContent
                          onClick={(e) => e.preventDefault()}
                          className="mt-2 space-y-2 text-xs"
                        >
                          {QUIZ_QUESTIONS.map(({ key, question, map }) => {
                            const val = prospect.quiz_answers?.[key];
                            if (!val) return null;
                            return (
                              <div key={key} className="p-2 rounded-md bg-muted/40 border border-border/40">
                                <p className="text-muted-foreground leading-snug mb-1">{question}</p>
                                <p className="text-foreground font-medium">{map[val] || val}</p>
                              </div>
                            );
                          })}
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {/* Full diagnostic assessment answers */}
                    {prospect.assessments[0] && (
                      <Collapsible className="mb-4">
                        <CollapsibleTrigger
                          onClick={(e) => e.stopPropagation()}
                          className="w-full flex items-center justify-between gap-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors p-2 rounded-md bg-primary/5 border border-primary/20 group"
                        >
                          <span className="flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5" />
                            Assessment Answers
                          </span>
                          <ChevronDown className="w-3.5 h-3.5 transition-transform group-data-[state=open]:rotate-180" />
                        </CollapsibleTrigger>
                        <CollapsibleContent
                          onClick={(e) => e.preventDefault()}
                          className="mt-2 space-y-3 text-xs"
                        >
                          {SECTIONS.map((section) => {
                            const sectionQuestions = QUESTIONS.filter((q) => q.section === section.id);
                            const sectionRows = sectionQuestions
                              .map((q) => ({
                                q,
                                answers: getAssessmentAnswerLabels(prospect.assessments[0], q.id),
                              }))
                              .filter((row) => row.answers.length > 0);
                            if (sectionRows.length === 0) return null;
                            return (
                              <div key={section.id} className="space-y-1.5">
                                <p className="text-[10px] uppercase tracking-wide font-semibold text-primary/80">
                                  {section.title}
                                </p>
                                {sectionRows.map(({ q, answers }) => (
                                  <div
                                    key={q.id}
                                    className="p-2 rounded-md bg-muted/40 border border-border/40"
                                  >
                                    <p className="text-muted-foreground leading-snug mb-1">
                                      Q{q.number}: {q.clientQuestion || q.question}
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                      {answers.map((ans, i) => (
                                        <Badge
                                          key={i}
                                          variant="outline"
                                          className="text-[10px] font-medium"
                                        >
                                          {ans}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            disabled={deletingId === prospect.id}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                          >
                            {deletingId === prospect.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Prospect</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete {prospect.name} and all their associated assessments and notes. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={(e) => {
                                e.preventDefault();
                                handleDeleteProspect(prospect.id);
                              }}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <button
                        type="button"
                        onClick={handleCardClick}
                        className="flex items-center text-sm text-primary group hover:text-primary/80"
                      >
                        View Profile
                        <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          )
        )}
      </div>
    </AppLayout>
  );
}
