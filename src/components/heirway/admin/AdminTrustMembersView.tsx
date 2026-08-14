import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShieldCheck, Shield, Eye, Mail, AlertCircle } from 'lucide-react';

interface Props {
  clientId: string;
}

interface MemberRow {
  id: string;
  invite_email: string | null;
  member_type: string;
  invite_status: string;
  is_billable: boolean;
  user_id: string | null;
  expires_at: string | null;
  accepted_at: string | null;
  created_at: string;
  assignments: { id: string; trust_id: string; power_level: string }[];
  trust_names: string[];
  has_own_paid_plan: boolean;
}

export default function AdminTrustMembersView({ clientId }: Props) {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: m } = await supabase
          .from('trust_members')
          .select('*')
          .eq('client_id', clientId)
          .order('created_at', { ascending: true });

        const memberList = (m as any[]) || [];
        const memberIds = memberList.map(x => x.id);
        const userIds = memberList.map(x => x.user_id).filter(Boolean);

        const [aRes, tRes, planRes] = await Promise.all([
          memberIds.length
            ? supabase.from('trust_member_assignments').select('*').in('member_id', memberIds)
            : Promise.resolve({ data: [] }),
          supabase.from('heirway_trust_progress').select('id, trust_name').eq('client_id', clientId),
          userIds.length
            ? supabase.from('heirway_clients').select('user_id, selected_plan, plan_status').in('user_id', userIds)
            : Promise.resolve({ data: [] }),
        ]);

        const assignmentsAll = (aRes.data as any[]) || [];
        const trustsAll = (tRes.data as any[]) || [];
        const plansAll = (planRes.data as any[]) || [];
        const trustNameById = new Map(trustsAll.map(t => [t.id, t.trust_name]));
        const paidPlanUserIds = new Set(
          plansAll
            .filter(p => ['steward', 'gold', 'foundation', 'business', 'wealth_builder'].includes(p.selected_plan))
            .map(p => p.user_id)
        );

        const enriched: MemberRow[] = memberList.map(x => {
          const myAssignments = assignmentsAll.filter(a => a.member_id === x.id);
          return {
            ...x,
            assignments: myAssignments,
            trust_names: myAssignments.map(a => trustNameById.get(a.trust_id) || 'Unknown'),
            has_own_paid_plan: x.user_id ? paidPlanUserIds.has(x.user_id) : false,
          };
        });

        setMembers(enriched);
      } finally {
        setLoading(false);
      }
    })();
  }, [clientId]);

  if (loading) return <div className="py-4 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  if (members.length === 0) {
    return <p className="text-sm text-muted-foreground py-2">No trust members invited yet.</p>;
  }

  const billableCount = members.filter(m => m.is_billable).length;
  const linkedCount = members.filter(m => m.user_id).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span><strong className="text-foreground">{members.length}</strong> total</span>
        <span>·</span>
        <span><strong className="text-foreground">{linkedCount}</strong> with logins</span>
        <span>·</span>
        <span><strong className="text-foreground">{billableCount}</strong> billable seat{billableCount !== 1 ? 's' : ''}</span>
      </div>

      <div className="divide-y divide-border">
        {members.map(m => {
          const icon = m.member_type === 'trustee_manager' ? <ShieldCheck className="w-4 h-4 text-primary" /> :
            m.member_type === 'trustee' ? <Shield className="w-4 h-4 text-amber-500" /> :
            <Eye className="w-4 h-4 text-muted-foreground" />;

          const expired = m.expires_at && new Date(m.expires_at) < new Date() && m.invite_status === 'pending';

          return (
            <div key={m.id} className="py-3">
              <div className="flex items-start gap-3">
                {icon}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground truncate">
                      <Mail className="w-3 h-3 inline mr-1 text-muted-foreground" />
                      {m.invite_email}
                    </p>
                    <Badge variant="secondary" className="text-[10px] capitalize">
                      {m.member_type.replace(/_/g, ' ')}
                    </Badge>
                    <Badge variant={m.invite_status === 'accepted' ? 'default' : (expired ? 'destructive' : 'outline')} className="text-[10px]">
                      {m.invite_status === 'accepted' ? '✓ Active login' : (expired ? '⏰ Expired' : '⏳ Pending')}
                    </Badge>
                    {m.is_billable ? (
                      <Badge variant="secondary" className="text-[10px]">$10/mo seat</Badge>
                    ) : m.has_own_paid_plan ? (
                      <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-600/30">
                        Free · own paid plan
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-600/30">
                        Free seat
                      </Badge>
                    )}
                  </div>

                  {m.assignments.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {m.assignments.map(a => (
                        <Badge key={a.id} variant="outline" className="text-[10px] font-normal">
                          {trustNameOrFallback(m.trust_names, m.assignments, a.id)}
                          {m.member_type !== 'beneficiary' && ` · ${a.power_level === 'full' ? 'Full' : 'Limited'}`}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {!m.user_id && (
                    <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> No linked login account
                    </p>
                  )}

                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Invited {new Date(m.created_at).toLocaleDateString()}
                    {m.accepted_at && ` · accepted ${new Date(m.accepted_at).toLocaleDateString()}`}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function trustNameOrFallback(trustNames: string[], assignments: any[], assignmentId: string): string {
  const idx = assignments.findIndex(a => a.id === assignmentId);
  return trustNames[idx] || 'Unknown Trust';
}
