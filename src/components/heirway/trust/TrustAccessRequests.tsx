import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Clock, Send, Loader2, FileText, FolderOpen, Building2, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  trustId: string;
  userId: string;
  memberType: 'trustee' | 'beneficiary';
}

interface AccessRequest {
  id: string;
  resource_type: string;
  description: string;
  status: string;
  created_at: string;
  approvals?: { trustee_user_id: string; approved: boolean }[];
  totalTrustees?: number;
  approvedCount?: number;
}

const RESOURCE_TYPES = [
  { value: 'meeting_minutes', label: 'Meeting Minutes', icon: FileText },
  { value: 'documents', label: 'Documents', icon: FolderOpen },
  { value: 'trust_details', label: 'Trust Details', icon: Building2 },
  { value: 'asset_tracker', label: 'Asset Tracker', icon: BarChart3 },
];

export default function TrustAccessRequests({ trustId, userId, memberType }: Props) {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [resourceType, setResourceType] = useState('meeting_minutes');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRequests();

    // Realtime subscription for approval updates
    const channel = supabase
      .channel(`access-requests-${trustId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trust_access_requests', filter: `trust_id=eq.${trustId}` }, () => fetchRequests())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trust_access_approvals' }, () => fetchRequests())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [trustId]);

  const fetchRequests = async () => {
    const { data: reqs } = await supabase
      .from('trust_access_requests')
      .select('*')
      .eq('trust_id', trustId)
      .order('created_at', { ascending: false });

    if (reqs) {
      // Fetch approvals for each request
      const enriched = await Promise.all(reqs.map(async (r: any) => {
        const { data: approvals } = await supabase
          .from('trust_access_approvals')
          .select('trustee_user_id, approved')
          .eq('request_id', r.id);

        // Count total trustees for this trust
        const { count } = await supabase
          .from('trust_members')
          .select('id', { count: 'exact', head: true })
          .eq('trust_id', trustId)
          .in('member_type', ['trustee_manager', 'trustee']);

        return {
          ...r,
          approvals: approvals || [],
          totalTrustees: count || 0,
          approvedCount: (approvals || []).filter((a: any) => a.approved).length,
        };
      }));

      setRequests(enriched);
    }
    setLoading(false);
  };

  const submitRequest = async () => {
    if (!description.trim()) { toast.error('Please add a description'); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('trust_access_requests')
        .insert({
          trust_id: trustId,
          requested_by: userId,
          resource_type: resourceType,
          description: description.trim(),
        });
      if (error) throw error;
      toast.success('Access request submitted');
      setDescription('');
      fetchRequests();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproval = async (requestId: string) => {
    try {
      // Get caller's trust member record
      const { data: myMember } = await supabase
        .from('trust_members')
        .select('id')
        .eq('trust_id', trustId)
        .eq('user_id', userId)
        .in('member_type', ['trustee_manager', 'trustee'])
        .maybeSingle();

      if (!myMember) { toast.error('You are not a trustee on this trust'); return; }

      // Check if already approved
      const { data: existing } = await supabase
        .from('trust_access_approvals')
        .select('id')
        .eq('request_id', requestId)
        .eq('trustee_user_id', userId)
        .maybeSingle();

      if (existing) { toast.info('You have already approved this request'); return; }

      const { error } = await supabase
        .from('trust_access_approvals')
        .insert({
          request_id: requestId,
          trustee_member_id: myMember.id,
          trustee_user_id: userId,
          approved: true,
          approved_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Check if all trustees have approved
      const req = requests.find(r => r.id === requestId);
      if (req && (req.approvedCount || 0) + 1 >= (req.totalTrustees || 1)) {
        await supabase
          .from('trust_access_requests')
          .update({ status: 'approved' })
          .eq('id', requestId);
      }

      toast.success('Approved!');
      fetchRequests();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const isTrustee = memberType === 'trustee';
  const resourceIcon = (type: string) => {
    const found = RESOURCE_TYPES.find(r => r.value === type);
    return found ? <found.icon className="w-4 h-4" /> : null;
  };

  if (loading) return <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />;

  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle className="text-lg">
          {isTrustee ? 'Pending Access Requests' : 'Request Access'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Beneficiaries can submit requests */}
        {!isTrustee && (
          <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/30">
            <Select value={resourceType} onValueChange={setResourceType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RESOURCE_TYPES.map(rt => (
                  <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Describe what you'd like to access and why..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
            />
            <Button onClick={submitRequest} disabled={submitting} size="sm">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
              Submit Request
            </Button>
          </div>
        )}

        {/* Request list */}
        {requests.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No access requests yet.</p>
        ) : (
          <div className="space-y-3">
            {requests.map(r => {
              const allApproved = r.status === 'approved';
              const myApproval = r.approvals?.find(a => a.trustee_user_id === userId);
              return (
                <div key={r.id} className="p-3 rounded-lg border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {resourceIcon(r.resource_type)}
                      <span className="text-sm font-medium capitalize">{r.resource_type.replace(/_/g, ' ')}</span>
                    </div>
                    <Badge variant={allApproved ? 'default' : 'secondary'}>
                      {allApproved ? <><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</> : <><Clock className="w-3 h-3 mr-1" /> {r.approvedCount}/{r.totalTrustees} approved</>}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{r.description}</p>
                  <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>

                  {isTrustee && !allApproved && !myApproval && (
                    <Button size="sm" variant="outline" onClick={() => handleApproval(r.id)}>
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
                    </Button>
                  )}
                  {isTrustee && myApproval?.approved && (
                    <p className="text-xs text-primary">✓ You approved this request</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
