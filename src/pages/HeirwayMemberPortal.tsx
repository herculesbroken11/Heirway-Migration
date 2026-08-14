import { useEffect, useState } from 'react';
import { HeirwayLayout } from '@/components/heirway/HeirwayLayout';
import { useMyMemberships, TrustMember } from '@/hooks/useTrustMembers';
import { supabase } from '@/integrations/supabase/client';
import { GoldHeaderCard } from '@/components/ui/gold-header-card';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, ShieldCheck, Eye, BookOpen, FileText, Lock, Loader2, Building2 } from 'lucide-react';
import { getTrustLabel, getTrustBgClass, getTrustColor } from '@/lib/trustTypes';
import TrustAccessRequests from '@/components/heirway/trust/TrustAccessRequests';
import BeneficiaryLearningTracker from '@/components/heirway/trust/BeneficiaryLearningTracker';

interface TrustInfo {
  id: string;
  trust_name: string;
  trust_type: string;
  stage: string;
  creator_name: string | null;
  trustees: any[];
  beneficiaries: any[];
}

export default function HeirwayMemberPortal() {
  const { memberships, loading } = useMyMemberships();
  const [trusts, setTrusts] = useState<Record<string, TrustInfo>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedTrust, setSelectedTrust] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null));
  }, []);

  useEffect(() => {
    if (memberships.length === 0) return;
    const trustIds = [...new Set(memberships.map(m => m.trust_id))];
    Promise.all(trustIds.map(async id => {
      const { data } = await supabase
        .from('heirway_trust_progress')
        .select('*')
        .eq('id', id)
        .single();
      return data;
    })).then(results => {
      const map: Record<string, TrustInfo> = {};
      results.forEach((r: any) => { if (r) map[r.id] = r; });
      setTrusts(map);
    });
  }, [memberships]);

  // Get approved access for this user
  const [approvedAccess, setApprovedAccess] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from('trust_access_requests')
        .select('trust_id, resource_type')
        .eq('requested_by', userId)
        .eq('status', 'approved');
      if (data) {
        const map: Record<string, string[]> = {};
        data.forEach((r: any) => {
          if (!map[r.trust_id]) map[r.trust_id] = [];
          if (!map[r.trust_id].includes(r.resource_type)) map[r.trust_id].push(r.resource_type);
        });
        setApprovedAccess(map);
      }
    })();
  }, [userId]);

  if (loading) {
    return (
      <HeirwayLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </HeirwayLayout>
    );
  }

  const currentMembership = selectedTrust ? memberships.find(m => m.trust_id === selectedTrust) : null;
  const currentTrust = selectedTrust ? trusts[selectedTrust] : null;

  // Group memberships by trust
  const trustMemberships = memberships.reduce((acc, m) => {
    if (!acc[m.trust_id]) acc[m.trust_id] = [];
    acc[m.trust_id].push(m);
    return acc;
  }, {} as Record<string, TrustMember[]>);

  const getMemberTypeLabel = (m: TrustMember) => {
    if (m.member_type === 'trustee_manager') return 'Trustee Manager';
    if (m.member_type === 'trustee') return `${m.power_level === 'full' ? 'Full' : 'Limited'} Power Trustee`;
    return 'Beneficiary';
  };

  const getMemberIcon = (m: TrustMember) => {
    if (m.member_type === 'trustee_manager') return <ShieldCheck className="w-5 h-5 text-primary" />;
    if (m.member_type === 'trustee') return <Shield className="w-5 h-5 text-amber-500" />;
    return <Eye className="w-5 h-5 text-muted-foreground" />;
  };

  if (selectedTrust && currentTrust && currentMembership && userId) {
    const isTrustee = currentMembership.member_type === 'trustee_manager' || currentMembership.member_type === 'trustee';
    const approved = approvedAccess[selectedTrust] || [];

    return (
      <HeirwayLayout>
        <div className="min-h-screen gradient-bg p-4 md:p-6">
          <button
            onClick={() => setSelectedTrust(null)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            ← Back to My Trusts
          </button>

          <GoldHeaderCard
            title={currentTrust.trust_name}
            icon={getMemberIcon(currentMembership)}
            description={`Your role: ${getMemberTypeLabel(currentMembership)}`}
          >
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="default">{getMemberTypeLabel(currentMembership)}</Badge>
              <Badge variant="outline" className="capitalize">{currentTrust.stage.replace(/_/g, ' ')}</Badge>
            </div>

            {/* Trustees see everything */}
            {isTrustee && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/30 border border-border">
                  <h3 className="text-sm font-semibold mb-2">Trust Overview</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Creator</p>
                      <p className="text-sm text-foreground">{currentTrust.creator_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Trustees</p>
                      <p className="text-sm text-foreground">{(currentTrust.trustees || []).length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Beneficiaries</p>
                      <p className="text-sm text-foreground">{(currentTrust.beneficiaries || []).length}</p>
                    </div>
                  </div>
                  {currentMembership.power_level === 'limited' && (
                    <div className="mt-3 p-2 rounded bg-amber-500/10 border border-amber-500/20">
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        <strong>Limited Power:</strong> You can advise the board, fulfill documentation, and discuss trust matters. No signatory powers, nor the power to sell, convey, transfer, or mortgage trust assets.
                      </p>
                    </div>
                  )}
                </div>

                {/* Beneficiary Learning Tracker */}
                <div className="mt-4">
                  <BeneficiaryLearningTracker trustId={selectedTrust} />
                </div>
              </div>
            )}

            {/* Beneficiaries see restricted view */}
            {!isTrustee && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/30 border border-border">
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" /> Available to You
                  </h3>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm text-foreground">
                      <BookOpen className="w-4 h-4 text-primary" /> Training Videos
                      <Badge variant="default" className="text-xs">Always Available</Badge>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4" />
                      Meeting Minutes
                      {approved.includes('meeting_minutes')
                        ? <Badge variant="default" className="text-xs">Approved</Badge>
                        : <Badge variant="secondary" className="text-xs"><Lock className="w-3 h-3 mr-1" /> Request Required</Badge>
                      }
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Building2 className="w-4 h-4" />
                      Trust Details
                      {approved.includes('trust_details')
                        ? <Badge variant="default" className="text-xs">Approved</Badge>
                        : <Badge variant="secondary" className="text-xs"><Lock className="w-3 h-3 mr-1" /> Request Required</Badge>
                      }
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </GoldHeaderCard>

          {/* Access Requests */}
          <div className="mt-4">
            <TrustAccessRequests
              trustId={selectedTrust}
              userId={userId}
              memberType={isTrustee ? 'trustee' : 'beneficiary'}
            />
          </div>
        </div>
      </HeirwayLayout>
    );
  }

  return (
    <HeirwayLayout>
      <div className="min-h-screen gradient-bg p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-display font-bold text-foreground">My Trust Memberships</h1>
          <p className="text-sm text-muted-foreground">View trusts you've been invited to</p>
        </div>

        {Object.keys(trustMemberships).length === 0 ? (
          <Card className="glass-panel">
            <CardContent className="py-12 text-center">
              <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Trust Memberships</h3>
              <p className="text-sm text-muted-foreground">You haven't been invited to any trusts yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {Object.entries(trustMemberships).map(([trustId, members]) => {
              const trust = trusts[trustId];
              const primaryMember = members[0];
              return (
                <button
                  key={trustId}
                  onClick={() => setSelectedTrust(trustId)}
                  className="w-full p-4 rounded-xl border bg-card border-border hover:border-primary/30 hover:bg-muted/50 transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    {trust ? (
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center border flex-shrink-0"
                        style={{
                          backgroundColor: `${getTrustColor(trust.trust_type)}15`,
                          borderColor: `${getTrustColor(trust.trust_type)}30`,
                        }}
                      >
                        <Shield className="w-5 h-5" style={{ color: getTrustColor(trust.trust_type) }} />
                      </div>
                    ) : getMemberIcon(primaryMember)}
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">
                        {trust?.trust_name || 'Loading...'}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {trust && (
                          <Badge variant="outline" className={`text-[10px] ${getTrustBgClass(trust.trust_type)}`}>
                            {getTrustLabel(trust.trust_type)}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">{getMemberTypeLabel(primaryMember)}</Badge>
                        {trust && <Badge variant="outline" className="text-xs capitalize">{trust.stage.replace(/_/g, ' ')}</Badge>}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </HeirwayLayout>
  );
}
