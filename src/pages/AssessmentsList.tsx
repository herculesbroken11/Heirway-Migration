import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
import {
  FileText,
  Search,
  Filter,
  Plus,
  ArrowRight,
  Building,
  Loader2,
  X,
  Trash2,
} from 'lucide-react';

interface AssessmentListItem {
  id: string;
  created_at: string;
  scs_score: number;
  lai_score: number;
  isi_score: number;
  adi_score: number;
  aeti_score: number;
  csi_score: number;
  pfi_score: number;
  primary_profile: string | null;
  secondary_profile: string | null;
  prospects: {
    id: string;
    name: string;
    company: string | null;
  };
}

const PROFILES = [
  'Loss Averse Overpayer',
  'Authority Gated Optimizer',
  'Control Sensitive Operator',
  'Rational Maximizer',
  'Legacy Builder',
  'Asset Rich Cash Constrained Landowner',
  'Institutional or Investment Firm',
];

export default function AssessmentsList() {
  const [assessments, setAssessments] = useState<AssessmentListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileFilter, setProfileFilter] = useState<string>('all');
  const [scsFilter, setScsFilter] = useState<string>('all');
  const [laiFilter, setLaiFilter] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAssessments();
  }, []);

  async function fetchAssessments() {
    try {
      const { data, error } = await supabase
        .from('assessments')
        .select(`
          id,
          created_at,
          scs_score,
          lai_score,
          isi_score,
          adi_score,
          aeti_score,
          csi_score,
          pfi_score,
          primary_profile,
          secondary_profile,
          prospects (
            id,
            name,
            company
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssessments(data as unknown as AssessmentListItem[]);
    } catch (error) {
      console.error('Error fetching assessments:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredAssessments = assessments.filter((assessment) => {
    // Search filter
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      assessment.prospects.name.toLowerCase().includes(searchLower) ||
      (assessment.prospects.company?.toLowerCase().includes(searchLower));

    // Profile filter
    const matchesProfile =
      profileFilter === 'all' ||
      assessment.primary_profile === profileFilter ||
      assessment.secondary_profile === profileFilter;

    // SCS filter
    let matchesScs = true;
    if (scsFilter === 'low') matchesScs = assessment.scs_score <= 4;
    else if (scsFilter === 'moderate') matchesScs = assessment.scs_score >= 5 && assessment.scs_score <= 8;
    else if (scsFilter === 'high') matchesScs = assessment.scs_score >= 9;

    // LAI filter
    let matchesLai = true;
    if (laiFilter === 'low') matchesLai = assessment.lai_score <= 3;
    else if (laiFilter === 'moderate') matchesLai = assessment.lai_score >= 4 && assessment.lai_score <= 7;
    else if (laiFilter === 'high') matchesLai = assessment.lai_score >= 8;

    return matchesSearch && matchesProfile && matchesScs && matchesLai;
  });

  const hasActiveFilters = profileFilter !== 'all' || scsFilter !== 'all' || laiFilter !== 'all' || searchQuery;

  const clearFilters = () => {
    setSearchQuery('');
    setProfileFilter('all');
    setScsFilter('all');
    setLaiFilter('all');
  };

  const getScoreColor = (score: number, max: number) => {
    const percentage = score / max;
    if (percentage <= 0.33) return 'bg-success/10 text-success';
    if (percentage <= 0.66) return 'bg-warning/10 text-warning';
    return 'bg-destructive/10 text-destructive';
  };

  const handleDeleteAssessment = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('assessments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAssessments(prev => prev.filter(a => a.id !== id));
      toast({
        title: 'Assessment deleted',
        description: 'The assessment has been permanently removed.',
      });
    } catch (error) {
      console.error('Error deleting assessment:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete assessment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AppLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Assessments</h1>
            <p className="text-muted-foreground mt-1">
              View and filter all completed assessments
            </p>
          </div>
          <Link to="/assessment/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Assessment
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card className="mb-6 animate-fade-in shadow-card" style={{ animationDelay: '50ms' }}>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
              </div>
              
              <Select value={profileFilter} onValueChange={setProfileFilter}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Profile" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Profiles</SelectItem>
                  {PROFILES.map((profile) => (
                    <SelectItem key={profile} value={profile}>{profile}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={scsFilter} onValueChange={setScsFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="SCS Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All SCS</SelectItem>
                  <SelectItem value="low">SCS Low (0-4)</SelectItem>
                  <SelectItem value="moderate">SCS Moderate (5-8)</SelectItem>
                  <SelectItem value="high">SCS High (9+)</SelectItem>
                </SelectContent>
              </Select>

              <Select value={laiFilter} onValueChange={setLaiFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="LAI Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All LAI</SelectItem>
                  <SelectItem value="low">LAI Low (0-3)</SelectItem>
                  <SelectItem value="moderate">LAI Moderate (4-7)</SelectItem>
                  <SelectItem value="high">LAI High (8+)</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredAssessments.length === 0 ? (
          <Card className="animate-fade-in shadow-card">
            <CardContent className="p-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {hasActiveFilters ? 'No matching assessments' : 'No assessments yet'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {hasActiveFilters
                  ? 'Try adjusting your filters'
                  : 'Start by creating a new assessment'
                }
              </p>
              {hasActiveFilters ? (
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              ) : (
                <Link to="/assessment/new">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    New Assessment
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredAssessments.map((assessment, index) => (
              <Card 
                key={assessment.id}
                className="animate-fade-in shadow-card hover:shadow-elevated transition-shadow"
                style={{ animationDelay: `${(index + 1) * 30}ms` }}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{assessment.prospects.name}</h3>
                        {assessment.primary_profile && (
                          <Badge variant="default" className="text-xs">
                            {assessment.primary_profile}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                        {assessment.prospects.company && (
                          <span className="flex items-center gap-1">
                            <Building className="w-4 h-4" />
                            {assessment.prospects.company}
                          </span>
                        )}
                        <span>
                          {new Date(assessment.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Score Pills */}
                      <div className="flex flex-wrap gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getScoreColor(assessment.scs_score, 20)}`}>
                          SCS: {assessment.scs_score}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getScoreColor(assessment.lai_score, 11)}`}>
                          LAI: {assessment.lai_score}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getScoreColor(assessment.isi_score, 6)}`}>
                          ISI: {assessment.isi_score}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getScoreColor(assessment.adi_score, 11)}`}>
                          ADI: {assessment.adi_score}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getScoreColor(assessment.aeti_score, 5)}`}>
                          AETI: {assessment.aeti_score}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getScoreColor(assessment.csi_score, 5)}`}>
                          CSI: {assessment.csi_score}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getScoreColor(assessment.pfi_score, 10)}`}>
                          PFI: {assessment.pfi_score}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link to={`/assessment/${assessment.id}/results`}>
                        <Button variant="ghost" size="sm" className="group">
                          View Results
                          <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </Link>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-muted-foreground hover:text-destructive"
                            disabled={deletingId === assessment.id}
                          >
                            {deletingId === assessment.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Assessment</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete the assessment for <strong>{assessment.prospects.name}</strong>? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteAssessment(assessment.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
