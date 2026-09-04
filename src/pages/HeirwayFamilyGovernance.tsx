import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeirwayLayout } from '@/components/heirway/HeirwayLayout';
import { supabase } from '@/integrations/supabase/client';
import { useClientProfile } from '@/hooks/useClientProfile';
import { GoldHeaderCard } from '@/components/ui/gold-header-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Users, GraduationCap, CheckCircle2, BookOpen, ChevronRight } from 'lucide-react';
import { useForceLightMode } from '@/hooks/useForceLightMode';

interface BeneficiarySummary {
  name: string;
  email: string | null;
  userId: string | null;
  unitsOfInterest: string;
  trustName: string;
  trustId: string;
  completedLessons: number;
  totalLessons: number;
  lastActivity: string | null;
}

export default function HeirwayFamilyGovernance() {
  useForceLightMode();
  const navigate = useNavigate();
  const { clientId, loading: profileLoading } = useClientProfile();
  const [beneficiaries, setBeneficiaries] = useState<BeneficiarySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId || profileLoading) return;
    loadBeneficiaries();
  }, [clientId, profileLoading]);

  const loadBeneficiaries = async () => {
    setLoading(true);

    // Get current client's user_id to exclude them from beneficiary list
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    const { data: trusts } = await supabase
      .from('heirway_trust_progress')
      .select('id, trust_name, trust_type, beneficiaries')
      .eq('client_id', clientId!)
      .eq('trust_type', 'beneficiary');

    if (!trusts || trusts.length === 0) {
      setBeneficiaries([]);
      setLoading(false);
      return;
    }

    // RLS returns only content this user may access; count active lessons for progress denominator
    const { data: lessons } = await supabase
      .from('heirway_learning_content')
      .select('id')
      .eq('is_active', true);
    const totalLessons = lessons?.length || 0;

    const { data: members } = await supabase
      .from('trust_members')
      .select('trust_id, user_id, invite_email, invite_status')
      .eq('client_id', clientId!)
      .eq('member_type', 'beneficiary');

    const acceptedUserIds = (members || [])
      .filter(m => m.user_id && m.invite_status === 'accepted')
      .map(m => m.user_id!);

    let progressByUser: Record<string, any[]> = {};
    if (acceptedUserIds.length > 0) {
      const { data: progress } = await supabase
        .from('heirway_learning_progress')
        .select('*')
        .in('user_id', acceptedUserIds)
        .eq('completed', true);

      (progress || []).forEach((p: any) => {
        if (!progressByUser[p.user_id]) progressByUser[p.user_id] = [];
        progressByUser[p.user_id].push(p);
      });
    }

    const result: BeneficiarySummary[] = [];
    const seen = new Set<string>();

    for (const trust of trusts) {
      const benefs = (trust.beneficiaries as any[]) || [];
      for (const b of benefs) {
        // Skip passive beneficiaries
        if (b.is_passive) continue;

        const key = `${b.name}::${trust.id}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const matchedMember = (members || []).find(m => m.trust_id === trust.id);
        const userId = matchedMember?.user_id || null;

        // Skip beneficiaries who are the client themselves (they have their own learning section)
        if (userId && currentUser && userId === currentUser.id) continue;

        const userProgress = userId ? (progressByUser[userId] || []) : [];

        // Only count progress on lessons the client has access to
        const accessibleLessonIds = new Set((lessons || []).map((l: any) => l.id));
        const relevantProgress = userProgress.filter((p: any) => accessibleLessonIds.has(p.lesson_id));

        const lastActivity = relevantProgress.length > 0
          ? relevantProgress.sort((a: any, b: any) =>
              new Date(b.completed_at || b.created_at).getTime() - new Date(a.completed_at || a.created_at).getTime()
            )[0]?.completed_at || null
          : null;

        result.push({
          name: b.name,
          email: matchedMember?.invite_email || null,
          userId,
          unitsOfInterest: Number(b.units_of_interest || 0).toFixed(2),
          trustName: trust.trust_name,
          trustId: trust.id,
          completedLessons: relevantProgress.length,
          totalLessons,
          lastActivity,
        });
      }
    }

    setBeneficiaries(result);
    setLoading(false);
  };

  if (profileLoading || loading) {
    return (
      <HeirwayLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </HeirwayLayout>
    );
  }

  // Group by beneficiary name
  const grouped: Record<string, BeneficiarySummary[]> = {};
  beneficiaries.forEach(b => {
    if (!grouped[b.name]) grouped[b.name] = [];
    grouped[b.name].push(b);
  });

  return (
    <HeirwayLayout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Family Governance</h1>
        </div>

        {/* Beneficiary Learning Section */}
        <Card className="glass-panel">
          <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              Beneficiary Learning
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(grouped).length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Beneficiaries listed in your trusts will appear here once added by your advisor.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(grouped).map(([name, entries]) => {
                  const totalLessons = entries[0].totalLessons;
                  const completedLessons = Math.max(...entries.map(e => e.completedLessons));
                  const pct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
                  const lastActivity = entries
                    .map(e => e.lastActivity)
                    .filter(Boolean)
                    .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0] || null;

                  return (
                    <button
                      key={name}
                      onClick={() => navigate(`/heirway/family-governance/${encodeURIComponent(name)}`)}
                      className="w-full text-left p-4 rounded-xl border bg-card border-border hover:border-primary/30 hover:bg-muted/50 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-primary">
                              {name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground">{name}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {entries.map((e, i) => (
                                <Badge key={i} variant="outline" className="text-[10px]">
                                  {e.trustName} · {e.unitsOfInterest} units
                                </Badge>
                              ))}
                            </div>
                            <div className="flex items-center gap-3 mt-2">
                              <div className="flex-1 max-w-[200px]">
                                <Progress value={pct} className="h-1.5" />
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {completedLessons}/{totalLessons} ({pct}%)
                              </span>
                              <Badge
                                variant={pct === 100 ? 'default' : pct > 0 ? 'secondary' : 'outline'}
                                className="text-[10px]"
                              >
                                {pct === 100 ? (
                                  <><CheckCircle2 className="w-3 h-3 mr-0.5" /> Complete</>
                                ) : pct > 0 ? (
                                  <><BookOpen className="w-3 h-3 mr-0.5" /> In Progress</>
                                ) : 'Not Started'}
                              </Badge>
                            </div>
                            {lastActivity && (
                              <p className="text-[10px] text-muted-foreground mt-1">
                                Last active: {new Date(lastActivity).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </HeirwayLayout>
  );
}
