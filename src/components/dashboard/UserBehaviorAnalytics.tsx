import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, TrendingUp, Users, BookOpen, FileText, Shield, ClipboardList, Gift, BarChart3 } from 'lucide-react';

interface LearnerRow {
  userId: string;
  name: string;
  email: string;
  plan: string;
  viewed: number;
  completed: number;
  lastActivity: string | null;
}

interface AnalyticsData {
  totalUsers: number;
  activeUsers30d: number;
  planDistribution: Record<string, number>;
  intakeCompletionRate: number;
  intakeStarted: number;
  intakeCompleted: number;
  totalTrusts: number;
  totalAssets: number;
  totalDocuments: number;
  totalRequests: number;
  totalReferrals: number;
  learningProgress: { totalLessonsCompleted: number; uniqueLearners: number };
  learnerLeaderboard: LearnerRow[];
  trustStageDistribution: Record<string, number>;
  recentSignups7d: number;
  recentSignups30d: number;
  featureUsage: { feature: string; count: number; icon: any }[];
}

export function UserBehaviorAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [
        clientsRes, intakesRes, trustsRes, assetsRes,
        documentsRes, requestsRes, referralsRes, progressRes,
      ] = await Promise.all([
        supabase.from('heirway_clients').select('*'),
        supabase.from('heirway_intake').select('id, completed, created_at'),
        supabase.from('heirway_trust_progress').select('id, stage, created_at'),
        supabase.from('heirway_assets').select('id'),
        supabase.from('heirway_documents').select('id'),
        supabase.from('heirway_admin_requests').select('id, request_type, created_at'),
        supabase.from('heirway_referrals').select('id, created_at'),
        supabase.from('heirway_learning_progress').select('id, user_id, completed, completed_at, created_at'),
      ]);

      const clients = clientsRes.data || [];
      const intakes = intakesRes.data || [];
      const trusts = trustsRes.data || [];
      const assets = assetsRes.data || [];
      const documents = documentsRes.data || [];
      const requests = requestsRes.data || [];
      const referrals = referralsRes.data || [];
      const progress = progressRes.data || [];

      const now = new Date();
      const d7 = new Date(now.getTime() - 7 * 86400000);
      const d30 = new Date(now.getTime() - 30 * 86400000);

      // Plan distribution
      const planDist: Record<string, number> = {};
      clients.forEach((c: any) => {
        const plan = c.selected_plan || 'free';
        planDist[plan] = (planDist[plan] || 0) + 1;
      });

      // Active users (clients updated in last 30 days)
      const active30d = clients.filter((c: any) => new Date(c.updated_at) >= d30).length;

      // Intake stats
      const intakeStarted = intakes.length;
      const intakeCompleted = intakes.filter((i: any) => i.completed).length;

      // Trust stage distribution
      const trustStageDist: Record<string, number> = {};
      trusts.forEach((t: any) => {
        trustStageDist[t.stage] = (trustStageDist[t.stage] || 0) + 1;
      });

      // Recent signups
      const recent7d = clients.filter((c: any) => new Date(c.created_at) >= d7).length;
      const recent30d = clients.filter((c: any) => new Date(c.created_at) >= d30).length;

      // Learning
      const completedLessons = progress.filter((p: any) => p.completed).length;
      const uniqueLearners = new Set(progress.map((p: any) => p.user_id)).size;

      // Per-learner leaderboard
      const learnerMap = new Map<string, LearnerRow>();
      const clientByUser = new Map(clients.map((c: any) => [c.user_id, c]));
      progress.forEach((p: any) => {
        const c: any = clientByUser.get(p.user_id);
        const existing = learnerMap.get(p.user_id) || {
          userId: p.user_id,
          name: c?.full_name || 'Unknown',
          email: c?.email || '—',
          plan: c?.selected_plan || 'free',
          viewed: 0,
          completed: 0,
          lastActivity: null,
        };
        existing.viewed += 1;
        if (p.completed) existing.completed += 1;
        const ts = p.completed_at || p.created_at;
        if (ts && (!existing.lastActivity || ts > existing.lastActivity)) {
          existing.lastActivity = ts;
        }
        learnerMap.set(p.user_id, existing);
      });
      const learnerLeaderboard = Array.from(learnerMap.values())
        .sort((a, b) => b.completed - a.completed || b.viewed - a.viewed);

      // Feature usage ranking
      const featureUsage = [
        { feature: 'Trust Management', count: trusts.length, icon: Shield },
        { feature: 'Asset Tracking', count: assets.length, icon: TrendingUp },
        { feature: 'Document Vault', count: documents.length, icon: FileText },
        { feature: 'Learning Center', count: completedLessons, icon: BookOpen },
        { feature: 'Admin Requests', count: requests.length, icon: ClipboardList },
        { feature: 'Referrals', count: referrals.length, icon: Gift },
        { feature: 'Intake Forms', count: intakes.length, icon: Users },
      ].sort((a, b) => b.count - a.count);

      setData({
        totalUsers: clients.length,
        activeUsers30d: active30d,
        planDistribution: planDist,
        intakeCompletionRate: intakeStarted > 0 ? (intakeCompleted / intakeStarted) * 100 : 0,
        intakeStarted,
        intakeCompleted,
        totalTrusts: trusts.length,
        totalAssets: assets.length,
        totalDocuments: documents.length,
        totalRequests: requests.length,
        totalReferrals: referrals.length,
        learningProgress: { totalLessonsCompleted: completedLessons, uniqueLearners },
        learnerLeaderboard,
        trustStageDistribution: trustStageDist,
        recentSignups7d: recent7d,
        recentSignups30d: recent30d,
        featureUsage,
      });
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) return null;

  const planColors: Record<string, string> = {
    free: 'bg-muted text-muted-foreground',
    education: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    foundation: 'bg-green-500/10 text-green-600 border-green-500/20',
    business: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    wealth_builder: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  };

  return (
    <div className="space-y-4">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Users', value: data.totalUsers, sub: `${data.recentSignups7d} this week` },
          { label: 'Active (30d)', value: data.activeUsers30d, sub: `${data.totalUsers > 0 ? ((data.activeUsers30d / data.totalUsers) * 100).toFixed(0) : 0}% of total` },
          { label: 'New (30d)', value: data.recentSignups30d, sub: `${data.recentSignups7d} this week` },
          { label: 'Total Referrals', value: data.totalReferrals, sub: 'all time' },
        ].map((s, i) => (
          <Card key={i} className="glass-card">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-display font-bold text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Plan Distribution */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Plan Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(data.planDistribution).sort((a, b) => b[1] - a[1]).map(([plan, count]) => (
              <div key={plan} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-[10px] capitalize ${planColors[plan] || ''}`}>
                    {plan.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 flex-1 ml-3">
                  <div className="flex-1 h-2 bg-border/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/60 rounded-full"
                      style={{ width: `${data.totalUsers > 0 ? (count / data.totalUsers) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-foreground w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Feature Usage Ranking */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Feature Usage
            </CardTitle>
            <CardDescription className="text-xs">Most to least used features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.featureUsage.map((f, i) => {
              const maxCount = data.featureUsage[0]?.count || 1;
              return (
                <div key={f.feature} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-4 text-right">{i + 1}.</span>
                  <f.icon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-foreground flex-shrink-0">{f.feature}</span>
                  <div className="flex-1 h-1.5 bg-border/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                      style={{ width: `${maxCount > 0 ? (f.count / maxCount) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold w-6 text-right">{f.count}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Intake Funnel */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" /> Intake Funnel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Completion Rate</span>
                <span className="font-semibold">{data.intakeCompletionRate.toFixed(0)}%</span>
              </div>
              <Progress value={data.intakeCompletionRate} className="h-2" />
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Started</span>
              <span className="font-semibold">{data.intakeStarted}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Completed</span>
              <span className="font-semibold text-success">{data.intakeCompleted}</span>
            </div>
          </CardContent>
        </Card>

        {/* Trust Pipeline */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" /> Trust Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(data.trustStageDistribution).map(([stage, count]) => (
              <div key={stage} className="flex justify-between text-xs">
                <span className="text-muted-foreground capitalize">{stage.replace(/_/g, ' ')}</span>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
            {Object.keys(data.trustStageDistribution).length === 0 && (
              <p className="text-xs text-muted-foreground">No trusts yet</p>
            )}
          </CardContent>
        </Card>

        {/* Learning Engagement */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" /> Learning Engagement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Unique Learners</span>
              <span className="font-semibold">{data.learningProgress.uniqueLearners}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Lessons Completed</span>
              <span className="font-semibold">{data.learningProgress.totalLessonsCompleted}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Avg per Learner</span>
              <span className="font-semibold">
                {data.learningProgress.uniqueLearners > 0
                  ? (data.learningProgress.totalLessonsCompleted / data.learningProgress.uniqueLearners).toFixed(1)
                  : '0'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Learner Leaderboard */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" /> Learner Activity
          </CardTitle>
          <CardDescription className="text-xs">
            Every member who has viewed or completed lessons, ranked by completions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.learnerLeaderboard.length === 0 ? (
            <p className="text-xs text-muted-foreground">No learning activity yet.</p>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border/40">
                    <th className="py-2 px-3 font-medium">Member</th>
                    <th className="py-2 px-3 font-medium">Plan</th>
                    <th className="py-2 px-3 font-medium text-right">Viewed</th>
                    <th className="py-2 px-3 font-medium text-right">Completed</th>
                    <th className="py-2 px-3 font-medium">Last Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {data.learnerLeaderboard.map((l) => (
                    <tr key={l.userId} className="border-b border-border/20 hover:bg-muted/20">
                      <td className="py-2 px-3">
                        <div className="font-medium text-foreground">{l.name}</div>
                        <div className="text-[10px] text-muted-foreground">{l.email}</div>
                      </td>
                      <td className="py-2 px-3">
                        <Badge variant="outline" className={`text-[10px] capitalize ${planColors[l.plan] || ''}`}>
                          {l.plan.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-right font-semibold">{l.viewed}</td>
                      <td className="py-2 px-3 text-right font-semibold text-success">{l.completed}</td>
                      <td className="py-2 px-3 text-muted-foreground">
                        {l.lastActivity ? new Date(l.lastActivity).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
