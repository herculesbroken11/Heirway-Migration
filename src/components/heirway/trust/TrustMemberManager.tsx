import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTrustMembers, TrustMemberWithAssignments } from '@/hooks/useTrustMembers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserPlus, Shield, ShieldCheck, Eye, Mail, Loader2, Copy, Check, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { SEAT_LIMITS } from '@/lib/stripePrices';

interface TrustOption {
  id: string;
  trust_name: string;
  trust_code?: string | null;
}

interface Props {
  /** All trusts owned by this client (for assignment selection) */
  allClientTrusts: TrustOption[];
  /** Currently focused trust (for default selection) */
  focusedTrustId?: string;
  clientId: string;
  trustName: string; // header label
}

type MemberType = 'trustee' | 'trustee_manager' | 'beneficiary';
type PowerLevel = 'full' | 'limited';

export default function TrustMemberManager({ allClientTrusts, focusedTrustId, clientId, trustName }: Props) {
  const { members, loading, refetch } = useTrustMembers(clientId);
  const [inviteOpen, setInviteOpen] = useState(false);

  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [memberType, setMemberType] = useState<MemberType>('trustee');
  // For trustees: per-trust assignment with power level
  const [trustAssignments, setTrustAssignments] = useState<Record<string, PowerLevel | null>>(
    focusedTrustId ? { [focusedTrustId]: 'limited' } : {}
  );

  const [sending, setSending] = useState(false);
  const [lastCredentials, setLastCredentials] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const trustees = members.filter(m => m.member_type === 'trustee_manager' || m.member_type === 'trustee');
  const beneficiaries = members.filter(m => m.member_type === 'beneficiary');
  const paidTrustees = trustees.filter(m => m.is_billable).length;
  const paidBeneficiaries = beneficiaries.filter(m => m.is_billable).length;

  const isTrusteeType = memberType === 'trustee' || memberType === 'trustee_manager';
  const selectedTrustIds = Object.keys(trustAssignments).filter(id => trustAssignments[id] !== null);

  const wouldBeBillable = isTrusteeType
    ? trustees.length >= SEAT_LIMITS.FREE_TRUSTEES
    : beneficiaries.length >= SEAT_LIMITS.FREE_BENEFICIARIES;

  const toggleTrust = (trustId: string, checked: boolean) => {
    setTrustAssignments(prev => {
      const next = { ...prev };
      if (checked) next[trustId] = next[trustId] || 'limited';
      else delete next[trustId];
      return next;
    });
  };

  const setPower = (trustId: string, power: PowerLevel) => {
    setTrustAssignments(prev => ({ ...prev, [trustId]: power }));
  };

  const handleInvite = async () => {
    if (!inviteEmail) { toast.error('Email is required'); return; }
    if (!inviteName) { toast.error('Name is required'); return; }

    let assignments: { trust_id: string; power_level: PowerLevel | 'none' }[] = [];

    if (isTrusteeType) {
      if (selectedTrustIds.length === 0) {
        toast.error('Select at least one trust this trustee will have access to');
        return;
      }
      assignments = selectedTrustIds.map(id => ({
        trust_id: id,
        power_level: (trustAssignments[id] || 'limited') as PowerLevel,
      }));
    } else {
      // Beneficiary: backend auto-assigns to all trusts
      assignments = allClientTrusts.map(t => ({ trust_id: t.id, power_level: 'none' as const }));
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-trust-member', {
        body: {
          client_id: clientId,
          email: inviteEmail,
          name: inviteName,
          member_type: memberType,
          assignments,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.temp_password) {
        setLastCredentials({ email: inviteEmail, password: data.temp_password });
      }

      const billNote = data?.member?.is_billable ? ' (paid seat: $10/mo)' : '';
      toast.success(`Invite sent to ${inviteName}${billNote}`);

      // reset
      setInviteName('');
      setInviteEmail('');
      setMemberType('trustee');
      setTrustAssignments(focusedTrustId ? { [focusedTrustId]: 'limited' } : {});
      setInviteOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send invite');
    } finally {
      setSending(false);
    }
  };

  const copyCredentials = () => {
    if (!lastCredentials) return;
    navigator.clipboard.writeText(`Email: ${lastCredentials.email}\nTemporary Password: ${lastCredentials.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getMemberIcon = (m: TrustMemberWithAssignments) => {
    if (m.member_type === 'trustee_manager') return <ShieldCheck className="w-4 h-4 text-primary" />;
    if (m.member_type === 'trustee') return <Shield className="w-4 h-4 text-amber-500" />;
    return <Eye className="w-4 h-4 text-muted-foreground" />;
  };

  const trustNameById = (id: string) => allClientTrusts.find(t => t.id === id)?.trust_name || 'Unknown Trust';

  if (loading) return <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />;

  return (
    <Card className="glass-panel">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Trust Members</CardTitle>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <UserPlus className="w-4 h-4 mr-1" /> Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Invite a Trust Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Full Name *</Label>
                  <Input className="mt-1" value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="Jane Doe" />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input className="mt-1" type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="jane@example.com" />
                </div>
              </div>

              <div>
                <Label>Role</Label>
                <Select value={memberType} onValueChange={v => setMemberType(v as MemberType)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trustee_manager">Trustee Manager</SelectItem>
                    <SelectItem value="trustee">Trustee</SelectItem>
                    <SelectItem value="beneficiary">Beneficiary</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isTrusteeType && (
                <div>
                  <Label>Trust Access & Power Level</Label>
                  <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                    Select which trusts this person can access and their authority on each.
                  </p>
                  <div className="space-y-2 max-h-56 overflow-y-auto rounded-md border border-border p-3">
                    {allClientTrusts.length === 0 && (
                      <p className="text-xs text-muted-foreground">No trusts available.</p>
                    )}
                    {allClientTrusts.map(t => {
                      const checked = trustAssignments[t.id] !== undefined && trustAssignments[t.id] !== null;
                      return (
                        <div key={t.id} className="flex items-center justify-between gap-2">
                          <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
                            <Checkbox checked={checked} onCheckedChange={c => toggleTrust(t.id, !!c)} />
                            <span className="text-sm truncate">{t.trust_name}{t.trust_code ? ` (${t.trust_code})` : ''}</span>
                          </label>
                          {checked && (
                            <Select value={trustAssignments[t.id] || 'limited'} onValueChange={v => setPower(t.id, v as PowerLevel)}>
                              <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="limited">Limited</SelectItem>
                                <SelectItem value="full">Full Power</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {memberType === 'beneficiary' && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Inviting a beneficiary grants them visibility into <strong>all {allClientTrusts.length} trust{allClientTrusts.length !== 1 ? 's' : ''}</strong> per the terms of the indenture. They will be able to view trust information they are entitled to as a beneficiary.
                  </p>
                </div>
              )}

              {wouldBeBillable && (
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-sm text-foreground">
                    This seat exceeds the free limit ({isTrusteeType ? SEAT_LIMITS.FREE_TRUSTEES : SEAT_LIMITS.FREE_BENEFICIARIES}). An additional <strong>$10/mo</strong> will be added to your bill. This applies even if the invitee has their own Heirway plan, since they will be accessing trust information outside the scope of their own plan.
                  </p>
                </div>
              )}

              <Button onClick={handleInvite} disabled={sending} className="w-full">
                {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
                Send Invite
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent className="space-y-3">
        {lastCredentials && (
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 space-y-2">
            <p className="text-sm font-medium text-primary">New account credentials created:</p>
            <p className="text-sm text-foreground">Email: <strong>{lastCredentials.email}</strong></p>
            <p className="text-sm text-foreground">Temp Password: <strong>{lastCredentials.password}</strong></p>
            <Button size="sm" variant="outline" onClick={copyCredentials}>
              {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
              {copied ? 'Copied!' : 'Copy Credentials'}
            </Button>
            <p className="text-xs text-muted-foreground">Share these credentials with the invited member so they can log in.</p>
          </div>
        )}

        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No members invited yet. Click "Invite Member" to get started.</p>
        ) : (
          <div className="divide-y divide-border">
            {members.map(m => (
              <div key={m.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {getMemberIcon(m)}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{m.invite_email}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <Badge variant="secondary" className="text-xs">
                          {m.member_type === 'trustee_manager' ? 'Trustee Manager' : m.member_type === 'trustee' ? 'Trustee' : 'Beneficiary'}
                        </Badge>
                        <Badge variant={m.invite_status === 'accepted' ? 'default' : (m.expires_at && new Date(m.expires_at) < new Date() ? 'destructive' : 'outline')} className="text-xs">
                          {m.invite_status === 'accepted' ? '✓ Active' : (m.expires_at && new Date(m.expires_at) < new Date() ? '⏰ Expired' : '⏳ Pending')}
                        </Badge>
                        {m.is_billable ? (
                          <Badge variant="secondary" className="text-xs">$10/mo</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-600/30">Free seat</Badge>
                        )}
                      </div>
                      {/* Per-trust assignments list */}
                      {m.assignments.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {m.assignments.map(a => (
                            <Badge key={a.id} variant="outline" className="text-[10px] font-normal">
                              {trustNameById(a.trust_id)}
                              {m.member_type !== 'beneficiary' && ` · ${a.power_level === 'full' ? 'Full' : 'Limited'}`}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="pt-2 border-t border-border space-y-1">
          <p className="text-xs text-muted-foreground">
            Trustees: {trustees.length}/{SEAT_LIMITS.FREE_TRUSTEES} free • 
            Beneficiaries: {beneficiaries.length}/{SEAT_LIMITS.FREE_BENEFICIARIES} free
            {(paidTrustees > 0 || paidBeneficiaries > 0) && ` • ${paidTrustees + paidBeneficiaries} paid seats`}
          </p>
          <p className="text-[10px] text-muted-foreground italic">
            Seats above the free limit are billed at $10/mo each, regardless of whether the invitee has their own Heirway plan.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
