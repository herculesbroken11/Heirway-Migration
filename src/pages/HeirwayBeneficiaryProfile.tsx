import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HeirwayLayout } from '@/components/heirway/HeirwayLayout';
import { supabase } from '@/integrations/supabase/client';
import { useClientProfile } from '@/hooks/useClientProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, GraduationCap, Coins, CheckCircle2, BookOpen, Circle } from 'lucide-react';
import { useForceLightMode } from '@/hooks/useForceLightMode';

interface TrustAllocation {
  trustId: string;
  trustName: string;
  unitsOfInterest: string;
}

interface LessonProgress {
  lessonId: string;
  lessonTitle: string;
  moduleName: string;
  completed: boolean;
  completedAt: string | null;
}

export default function HeirwayBeneficiaryProfile() {
  useForceLightMode();
  const { beneficiaryName } = useParams();
  const navigate = useNavigate();
  const { clientId, planName, loading: profileLoading } = useClientProfile();
  const [loading, setLoading] = useState(true);
  const [allocations, setAllocations] = useState<TrustAllocation[]>([]);
  const [lessonProgress, setLessonProgress] = useState<LessonProgress[]>([]);
  const [totalLessons, setTotalLessons] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);

  const decodedName = decodeURIComponent(beneficiaryName || '');

  useEffect(() => {
    if (!clientId || profileLoading || !decodedName) return;
    loadProfile();
  }, [clientId, profileLoading, decodedName]);

  const loadProfile = async () => {
    setLoading(true);

    // Get trusts and find this beneficiary's allocations
    const { data: trusts } = await supabase
      .from('heirway_trust_progress')
      .select('id, trust_name, beneficiaries')
      .eq('client_id', clientId!);

    const allocs: TrustAllocation[] = [];
    (trusts || []).forEach((trust: any) => {
      const benefs = (trust.beneficiaries as any[]) || [];
      const match = benefs.find((b: any) => b.name === decodedName);
      if (match) {
        allocs.push({
          trustId: trust.id,
          trustName: trust.trust_name,
          unitsOfInterest: match.units_of_interest || '0',
        });
      }
    });
    setAllocations(allocs);

    // Find trust member user_id
    const trustIds = allocs.map(a => a.trustId);
    let userId: string | null = null;

    if (trustIds.length > 0) {
      const { data: members } = await supabase
        .from('trust_members')
        .select('user_id')
        .in('trust_id', trustIds)
        .eq('member_type', 'beneficiary')
        .eq('invite_status', 'accepted')
        .not('user_id', 'is', null)
        .limit(1);

      userId = members?.[0]?.user_id || null;
    }

    // Get lessons accessible to the client's plan
    const effectivePlan = planName || 'free';
    const { data: allLessons } = await supabase
      .from('heirway_learning_content')
      .select('id, title, module_ref_id, sort_order')
      .eq('is_active', true)
      .contains('allowed_plans', [effectivePlan])
      .order('sort_order', { ascending: true });

    const { data: allModules } = await supabase
      .from('heirway_learning_modules')
      .select('id, title, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    const moduleMap: Record<string, { title: string; order: number }> = {};
    (allModules || []).forEach((m: any) => { moduleMap[m.id] = { title: m.title, order: m.sort_order }; });

    const lessonList = allLessons || [];
    setTotalLessons(lessonList.length);

    // Get progress
    let userProgressMap: Record<string, any> = {};
    if (userId) {
      const { data: progress } = await supabase
        .from('heirway_learning_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('completed', true);

      (progress || []).forEach((p: any) => {
        userProgressMap[p.lesson_id] = p;
      });
    }

    const progressList: LessonProgress[] = lessonList.map((lesson: any) => ({
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      moduleName: moduleMap[lesson.module_ref_id]?.title || 'Unknown Module',
      completed: !!userProgressMap[lesson.id],
      completedAt: userProgressMap[lesson.id]?.completed_at || null,
    }));

    setLessonProgress(progressList);
    setCompletedCount(progressList.filter(p => p.completed).length);
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

  const pct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  // Group lessons by module
  const byModule: Record<string, LessonProgress[]> = {};
  lessonProgress.forEach(lp => {
    if (!byModule[lp.moduleName]) byModule[lp.moduleName] = [];
    byModule[lp.moduleName].push(lp);
  });

  return (
    <HeirwayLayout>
      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/heirway/family-governance')}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Family Governance
        </Button>

        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <span className="text-xl font-bold text-primary">
              {decodedName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">{decodedName}</h1>
            <p className="text-sm text-muted-foreground">Beneficiary Profile</p>
          </div>
        </div>

        {/* Units of Beneficial Interest */}
        <Card className="glass-panel">
          <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Coins className="w-4 h-4 text-primary" />
              Units of Beneficial Interest
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allocations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No trust allocations found.</p>
            ) : (
              <div className="space-y-2">
                {allocations.map((a, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                    <p className="text-sm font-medium text-foreground">{a.trustName}</p>
                    <Badge variant="default" className="text-sm font-semibold">
                      {Number(a.unitsOfInterest).toFixed(2)} units
                    </Badge>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t border-border mt-2">
                  <p className="text-sm font-semibold text-foreground">Total</p>
                  <p className="text-sm font-bold text-primary">
                    {allocations.reduce((s, a) => s + Number(a.unitsOfInterest || 0), 0).toFixed(2)} units
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Learning Journey */}
        <Card className="glass-panel">
          <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-primary" />
              Learning Journey
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Overall progress */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Overall Progress</span>
                <Badge variant={pct === 100 ? 'default' : pct > 0 ? 'secondary' : 'outline'}>
                  {pct === 100 ? (
                    <><CheckCircle2 className="w-3 h-3 mr-1" /> Complete</>
                  ) : pct > 0 ? (
                    <><BookOpen className="w-3 h-3 mr-1" /> In Progress</>
                  ) : 'Not Started'}
                </Badge>
              </div>
              <Progress value={pct} className="h-2.5 mb-1" />
              <p className="text-xs text-muted-foreground">{completedCount} of {totalLessons} lessons completed ({pct}%)</p>
            </div>

            {/* Module-by-module breakdown */}
            {Object.entries(byModule).map(([moduleName, lessons]) => {
              const modCompleted = lessons.filter(l => l.completed).length;
              return (
                <div key={moduleName} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">{moduleName}</p>
                    <span className="text-xs text-muted-foreground">{modCompleted}/{lessons.length}</span>
                  </div>
                  <div className="space-y-1">
                    {lessons.map(lesson => (
                      <div key={lesson.lessonId} className="flex items-center gap-2 pl-2">
                        {lesson.completed ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
                        )}
                        <span className={`text-xs ${lesson.completed ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {lesson.lessonTitle}
                        </span>
                        {lesson.completedAt && (
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            {new Date(lesson.completedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {totalLessons === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No learning content available yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </HeirwayLayout>
  );
}
