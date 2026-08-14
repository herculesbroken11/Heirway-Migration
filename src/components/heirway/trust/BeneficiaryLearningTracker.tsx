import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, GraduationCap, CheckCircle2, BookOpen } from 'lucide-react';

interface BeneficiaryProgress {
  userId: string;
  email: string;
  name: string;
  completedLessons: number;
  totalLessons: number;
  completedModules: string[];
  lastActivity: string | null;
}

interface Props {
  trustId: string;
}

export default function BeneficiaryLearningTracker({ trustId }: Props) {
  const [loading, setLoading] = useState(true);
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryProgress[]>([]);
  const [totalLessons, setTotalLessons] = useState(0);

  useEffect(() => {
    loadData();
  }, [trustId]);

  const loadData = async () => {
    setLoading(true);

    // Get trust details to check trust type and passive beneficiaries
    const { data: trust } = await supabase
      .from('heirway_trust_progress')
      .select('trust_type, beneficiaries')
      .eq('id', trustId)
      .single();

    // Only show learning tracker for beneficiary trusts
    if (!trust || trust.trust_type !== 'beneficiary') {
      setBeneficiaries([]);
      setLoading(false);
      return;
    }

    // Get passive beneficiary names from JSONB
    const passiveNames = new Set(
      ((trust.beneficiaries as any[]) || [])
        .filter((b: any) => b.is_passive)
        .map((b: any) => (b.name || '').toLowerCase())
    );

    // Get beneficiary members for this trust
    const { data: members } = await supabase
      .from('trust_members')
      .select('user_id, invite_email, member_type')
      .eq('trust_id', trustId)
      .eq('member_type', 'beneficiary')
      .eq('invite_status', 'accepted');

    // Get total active lessons count
    const { data: lessons } = await supabase
      .from('heirway_learning_content')
      .select('id')
      .eq('is_active', true);

    const total = lessons?.length || 0;
    setTotalLessons(total);

    // Filter out passive beneficiaries by matching invite_email against passive names
    const activeMembers = (members || []).filter(m => {
      const memberName = (m.invite_email?.split('@')[0] || '').toLowerCase();
      return !passiveNames.has(memberName);
    });

    if (!activeMembers || activeMembers.length === 0) {
      setBeneficiaries([]);
      setLoading(false);
      return;
    }

    const userIds = activeMembers.filter(m => m.user_id).map(m => m.user_id!);

    if (userIds.length === 0) {
      setBeneficiaries(activeMembers.map(m => ({
        userId: m.user_id || '',
        email: m.invite_email || 'Unknown',
        name: m.invite_email?.split('@')[0] || 'Unknown',
        completedLessons: 0,
        totalLessons: total,
        completedModules: [],
        lastActivity: null,
      })));
      setLoading(false);
      return;
    }

    const { data: progress } = await supabase
      .from('heirway_learning_progress')
      .select('*')
      .in('user_id', userIds)
      .eq('completed', true);

    // Group progress by user
    const progressByUser: Record<string, any[]> = {};
    (progress || []).forEach((p: any) => {
      if (!progressByUser[p.user_id]) progressByUser[p.user_id] = [];
      progressByUser[p.user_id].push(p);
    });

    const result: BeneficiaryProgress[] = activeMembers.map(m => {
      const userProgress = m.user_id ? (progressByUser[m.user_id] || []) : [];
      const completedModules = [...new Set(userProgress.map((p: any) => p.module_id))];
      const lastActivity = userProgress.length > 0
        ? userProgress.sort((a: any, b: any) => new Date(b.completed_at || b.created_at).getTime() - new Date(a.completed_at || a.created_at).getTime())[0]?.completed_at || null
        : null;

      return {
        userId: m.user_id || '',
        email: m.invite_email || 'Unknown',
        name: m.invite_email?.split('@')[0] || 'Unknown',
        completedLessons: userProgress.length,
        totalLessons: total,
        completedModules,
        lastActivity,
      };
    });

    setBeneficiaries(result);
    setLoading(false);
  };

  if (loading) {
    return (
      <Card className="glass-panel">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (beneficiaries.length === 0) {
    return (
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-primary" />
            Beneficiary Learning Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No active beneficiaries to track yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-primary" />
          Beneficiary Learning Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {beneficiaries.map((b, i) => {
          const pct = totalLessons > 0 ? Math.round((b.completedLessons / totalLessons) * 100) : 0;
          return (
            <div key={i} className="p-3 rounded-lg bg-muted/30 border border-border space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{b.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.lastActivity
                      ? `Last active: ${new Date(b.lastActivity).toLocaleDateString()}`
                      : 'No activity yet'}
                  </p>
                </div>
                <Badge variant={pct === 100 ? 'default' : pct > 0 ? 'secondary' : 'outline'} className="text-xs">
                  {pct === 100 ? (
                    <><CheckCircle2 className="w-3 h-3 mr-1" /> Complete</>
                  ) : pct > 0 ? (
                    <><BookOpen className="w-3 h-3 mr-1" /> In Progress</>
                  ) : (
                    'Not Started'
                  )}
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{b.completedLessons} of {totalLessons} lessons</span>
                  <span>{pct}%</span>
                </div>
                <Progress value={pct} className="h-2" />
              </div>
              {b.completedModules.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {b.completedModules.map((modId, j) => (
                    <Badge key={j} variant="outline" className="text-[10px]">{modId}</Badge>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
