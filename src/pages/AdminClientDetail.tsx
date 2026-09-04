import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { GoldHeaderCard } from '@/components/ui/gold-header-card';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TRUST_TYPES, getTrustLabel, getTrustBgClass, getTrustColor, trustHasBankAccount } from '@/lib/trustTypes';
import { EditableClientProfile } from '@/components/heirway/admin/EditableClientProfile';
import AdminTrustMembersView from '@/components/heirway/admin/AdminTrustMembersView';
import ClientLearningProgress from '@/components/heirway/admin/ClientLearningProgress';
import { usePlanDisplayLabels, withCurrentPlanOption } from '@/hooks/usePlanDisplayLabels';

import {
  ChevronLeft, User, Shield, Plus, Pencil, Trash2, X, DollarSign,
  Landmark, RefreshCw, Building2, FileText, Package, AlertTriangle,
  Crown, Users, Check, Camera, Heart, Gift, ClipboardList, MessageCircleQuestion,
  BookOpen, KeyRound,
} from 'lucide-react';

// Current subscription tiers + legacy plans preserved for grandfathered clients.
const TRUST_STAGES = ['assigning_creator', 'processing_documents', 'ready_to_sign', 'trusts_complete'];

interface TrustRecord {
  id: string;
  user_id: string;
  client_id: string;
  trust_name: string;
  trust_type: string;
  stage: string;
  stage_notes: string | null;
  has_bank_account: boolean;
  creator_name: string | null;
  trustees: { name: string; role: string }[];
  beneficiaries: { name: string; units_of_interest: string; is_passive?: boolean }[];
  created_at?: string;
  updated_at?: string;
}

export default function AdminClientDetail() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { planLabel, assignmentOptions, catalog } = usePlanDisplayLabels();
  const [client, setClient] = useState<any>(null);
  const [trusts, setTrusts] = useState<TrustRecord[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [intake, setIntake] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [prospect, setProspect] = useState<any>(null);
  const [intakeQuestions, setIntakeQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const trustFormRef = useRef<HTMLDivElement>(null);

  // Trust editing
  const [editingTrust, setEditingTrust] = useState<TrustRecord | null>(null);
  const [trustForm, setTrustForm] = useState({
    trust_name: '', trust_type: 'revocable', creator_name: '', stage: 'assigning_creator', stage_notes: '',
    annual_meeting_date: '', trust_code: '',
    creator_address_street: '', creator_address_city: '', creator_address_state: '', creator_address_zip: '',
    trustees: [{ name: '', role: 'Managing Trustee' }] as { name: string; role: string }[],
    beneficiaries: [{ name: '', units: '', is_passive: false, address_street: '', address_city: '', address_state: '', address_zip: '' }] as { name: string; units: string; is_passive: boolean; address_street: string; address_city: string; address_state: string; address_zip: string }[],
  });
  const [showTrustForm, setShowTrustForm] = useState(false);
  const [adminOverride, setAdminOverride] = useState(false);

  useEffect(() => { if (clientId) loadData(); }, [clientId]);

  useEffect(() => {
    if (showTrustForm && trustFormRef.current) {
      trustFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showTrustForm]);

  const loadData = async () => {
    setLoading(true);
    const [clientRes, trustsRes, assetsRes, intakeRes, reqsRes] = await Promise.all([
      supabase.from('heirway_clients').select('*').eq('id', clientId!).single(),
      supabase.from('heirway_trust_progress').select('*').eq('client_id', clientId!),
      supabase.from('heirway_assets').select('*').eq('client_id', clientId!),
      supabase.from('heirway_intake').select('*').eq('client_id', clientId!).maybeSingle(),
      supabase.from('heirway_admin_requests').select('*').eq('client_id', clientId!).order('created_at', { ascending: false }),
    ]);
    setClient(clientRes.data);
    setTrusts((trustsRes.data as any[]) || []);
    setAssets(assetsRes.data || []);
    setIntake(intakeRes.data);
    setRequests(reqsRes.data || []);

    // Load prospect data (Get Started quiz answers) by matching email
    if (clientRes.data?.email) {
      const { data: prospectData } = await supabase
        .from('prospects')
        .select('*')
        .eq('email', clientRes.data.email)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setProspect(prospectData);
    }

    // Load intake questions submitted by this user
    if (clientRes.data?.user_id) {
      const { data: questionsData } = await supabase
        .from('heirway_intake_questions')
        .select('*')
        .eq('user_id', clientRes.data.user_id)
        .order('created_at', { ascending: false });
      setIntakeQuestions(questionsData || []);
    }

    setLoading(false);
  };

  const fmtCurrency = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

  const silverSpotPrice = client?.silver_spot_price || 0;
  const silverTotalValue = silverSpotPrice * trusts.length;
  const totalAssetValue = assets.reduce((s: number, a: any) => s + (Number(a.estimated_value) || 0), 0) + silverTotalValue;
  const protectedValue = assets.filter((a: any) => a.entity_type === 'private_trust').reduce((s: number, a: any) => s + (Number(a.estimated_value) || 0), 0) + silverTotalValue;

  const handleUpdatePlan = async (plan: string) => {
    const updateData: any = {
      selected_plan: plan === 'free' ? null : plan,
      plan_status: 'active',
    };
    // Set plan_started_at when upgrading from free to a paid plan
    if (plan !== 'free' && (!client?.selected_plan || client?.selected_plan === null)) {
      updateData.plan_started_at = new Date().toISOString();
    }
    await supabase.from('heirway_clients').update(updateData).eq('id', clientId!);
    toast.success('Plan updated');
    loadData();
  };

  const handleUpdateMiroUrl = async (url: string) => {
    await supabase.from('heirway_clients').update({ miro_board_url: url }).eq('id', clientId!);
    toast.success('Miro URL updated');
    loadData();
  };

  // ─── Trust form ─────────────────────────────────────────
  const resetTrustForm = () => {
    setTrustForm({
      trust_name: '', trust_type: 'revocable', creator_name: '', stage: 'assigning_creator', stage_notes: '',
      annual_meeting_date: '', trust_code: '',
      creator_address_street: '', creator_address_city: '', creator_address_state: '', creator_address_zip: '',
      trustees: [{ name: '', role: 'Managing Trustee' }],
      beneficiaries: [{ name: '', units: '', is_passive: false, address_street: '', address_city: '', address_state: '', address_zip: '' }],
    });
    setEditingTrust(null);
  };

  const openAddTrust = () => {
    resetTrustForm();
    setShowTrustForm(true);
  };

  const openEditTrust = (trust: TrustRecord) => {
    setEditingTrust(trust);
    setTrustForm({
      trust_name: trust.trust_name,
      trust_type: trust.trust_type || 'revocable',
      creator_name: trust.creator_name || '',
      stage: trust.stage,
      stage_notes: trust.stage_notes || '',
      annual_meeting_date: (trust as any).annual_meeting_date || '',
      trust_code: (trust as any).trust_code || '',
      creator_address_street: (trust as any).creator_address_street || '',
      creator_address_city: (trust as any).creator_address_city || '',
      creator_address_state: (trust as any).creator_address_state || '',
      creator_address_zip: (trust as any).creator_address_zip || '',
      trustees: (trust.trustees || []).length > 0
        ? (trust.trustees as any[]).map(t => ({ name: t.name, role: t.role }))
        : [{ name: '', role: 'Managing Trustee' }],
      beneficiaries: (trust.beneficiaries || []).length > 0
        ? (trust.beneficiaries as any[]).map(b => ({ name: b.name, units: b.units_of_interest || '', is_passive: b.is_passive || false, address_street: b.address_street || '', address_city: b.address_city || '', address_state: b.address_state || '', address_zip: b.address_zip || '' }))
        : [{ name: '', units: '', is_passive: false, address_street: '', address_city: '', address_state: '', address_zip: '' }],
    });
    setShowTrustForm(true);
  };

  const handleSaveTrust = async () => {
    if (!client || !trustForm.trust_name.trim()) { toast.error('Trust name is required'); return; }

    if (!adminOverride) {
      if (!trustForm.creator_name.trim()) { toast.error('Creator name is required. Enable "Admin Override" to save anyway.'); return; }
    } else if (!trustForm.creator_name.trim()) {
      toast.warning('Saving without creator name (admin override)');
    }

    const hasBankAccount = trustHasBankAccount(trustForm.trust_type);
    const trusteesClean = trustForm.trustees.filter(t => t.name.trim());
    const beneficiariesClean = trustForm.beneficiaries.filter(b => b.name.trim()).map(b => ({
      name: b.name.trim(), units_of_interest: (Number(b.units) || 0).toFixed(2), is_passive: b.is_passive || false,
      address_street: b.address_street?.trim() || '', address_city: b.address_city?.trim() || '',
      address_state: b.address_state || '', address_zip: b.address_zip?.trim() || '',
    }));

    const totalUnits = beneficiariesClean.reduce((sum, b) => sum + Number(b.units_of_interest), 0);
    if (beneficiariesClean.length > 0 && totalUnits !== 200) {
      if (!adminOverride) {
        toast.error(`Total units must equal 200 (currently ${totalUnits}). Enable "Admin Override" to save anyway.`);
        return;
      }
      toast.warning(`Saving with ${totalUnits} total units instead of 200 (admin override)`);
    }

    const payload: any = {
      client_id: client.id, user_id: client.user_id,
      trust_name: trustForm.trust_name.trim(), trust_type: trustForm.trust_type,
      has_bank_account: hasBankAccount, stage: trustForm.stage,
      stage_notes: trustForm.stage_notes.trim() || null,
      creator_name: trustForm.creator_name.trim(),
      creator_address_street: trustForm.creator_address_street.trim() || null,
      creator_address_city: trustForm.creator_address_city.trim() || null,
      creator_address_state: trustForm.creator_address_state || null,
      creator_address_zip: trustForm.creator_address_zip.trim() || null,
      trustees: trusteesClean, beneficiaries: beneficiariesClean,
      annual_meeting_date: trustForm.annual_meeting_date || null,
      trust_code: trustForm.trust_code.trim() || null,
    };

    if (editingTrust) {
      const { error } = await supabase.from('heirway_trust_progress').update(payload as any).eq('id', editingTrust.id);
      if (error) { toast.error('Failed to update trust'); return; }
      toast.success('Trust updated');
    } else {
      const { error } = await supabase.from('heirway_trust_progress').insert(payload as any);
      if (error) { toast.error('Failed to add trust'); return; }
      toast.success('Trust added');
    }

    // Auto-update silver spot price when a trust is marked as complete
    if (trustForm.stage === 'trusts_complete') {
      try {
        const res = await fetch('https://api.metals.dev/v1/latest?api_key=demo&currency=USD&unit=toz');
        const data = await res.json();
        const silverPrice = data?.metals?.silver;
        if (silverPrice && silverPrice > 0) {
          await supabase.from('heirway_clients').update({ silver_spot_price: silverPrice } as any).eq('id', client.id);
          toast.success(`Silver spot price auto-updated to $${silverPrice.toFixed(2)}/oz`);
        }
      } catch {
        // Silently fail — price can be updated manually
      }
    }

    setShowTrustForm(false);
    resetTrustForm();
    loadData();
  };

  const handleDeleteTrust = async (trustId: string) => {
    const trust = trusts.find(t => t.id === trustId);
    const trustName = trust?.trust_name?.trim();
    const confirmed = window.confirm(
      trustName
        ? `Delete trust "${trustName}"?\n\nThe name will be moved back into this member's Trust Naming Pool. Any assets currently linked to this trust will be unlinked.`
        : 'Delete this trust? Any linked assets will be unlinked.'
    );
    if (!confirmed) return;

    await supabase.from('heirway_assets').update({ trust_id: null, entity_type: 'none', in_private_trust: false } as any).eq('trust_id', trustId);
    const { error } = await supabase.from('heirway_trust_progress').delete().eq('id', trustId);
    if (error) { toast.error('Failed to delete trust'); return; }

    // Return the name to the client's Trust Naming Pool so it can be re-promoted later.
    if (trustName && client) {
      const currentPool = ((client as any).trust_name_pool as string[] | undefined) || [];
      if (!currentPool.includes(trustName)) {
        const nextPool = [...currentPool, trustName];
        await supabase.from('heirway_clients').update({ trust_name_pool: nextPool } as any).eq('id', client.id);
      }
    }

    toast.success(trustName ? `Deleted "${trustName}" — name returned to Naming Pool` : 'Trust deleted');
    loadData();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !client) return;
    const ext = file.name.split('.').pop();
    const path = `${client.user_id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (uploadError) { toast.error('Failed to upload photo'); return; }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
    await supabase.from('heirway_clients').update({ avatar_url: publicUrl } as any).eq('id', client.id);
    toast.success('Photo updated');
    loadData();
  };

  const planBadgeColor = (plan: string | null) => {
    switch (plan) {
      case 'wealth_builder': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'gold': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'steward': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'essentials': return 'bg-primary/10 text-primary border-primary/20';
      case 'business': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'foundation': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'education': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen gradient-bg flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!client) {
    return (
      <AppLayout>
        <div className="min-h-screen gradient-bg flex items-center justify-center">
          <p className="text-muted-foreground">Client not found.</p>
        </div>
      </AppLayout>
    );
  }

  const getAssetsForTrust = (trustId: string) => assets.filter((a: any) => a.trust_id === trustId);
  const activeTrusts = trusts.filter(t => t.stage !== 'trusts_complete');
  const completedTrusts = trusts.filter(t => t.stage === 'trusts_complete');

  return (
    <AppLayout>
      <div className="min-h-screen gradient-bg">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 p-4 md:p-6">
          {/* Back + Header */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => navigate('/admin/heirway')}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <div className="relative group">
                <Avatar className="w-12 h-12 border-2 border-primary/20">
                  {client.avatar_url ? (
                    <AvatarImage src={client.avatar_url} alt={client.full_name || 'Client'} />
                  ) : null}
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold">
                    {(client.full_name || client.email || '?').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera className="w-4 h-4 text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </label>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl md:text-2xl font-display font-bold text-foreground">{client.full_name || client.email}</h1>
                  {client.creator_available && (
                    <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20">
                      <Heart className="w-3 h-3 mr-0.5" /> Creator Friendly
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{client.email} · {client.state}</p>
                <p className="text-xs text-muted-foreground">Member since {new Date(client.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} at {new Date(client.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`${planBadgeColor(client.selected_plan)}`}>
                {planLabel(client.selected_plan)}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (!client.email) { toast.error('No email on file'); return; }
                  if (!confirm(`Send a password reset email to ${client.email}?`)) return;
                  const { data, error } = await supabase.functions.invoke('admin-resend-verification', {
                    body: { email: client.email },
                  });
                  if (error || data?.error || data?.ok === false) {
                    toast.error(data?.error || error?.message || 'Failed to send reset');
                    return;
                  }
                  const action = data?.action;
                  if (action === 'recovery_sent') toast.success(`Password reset link sent to ${client.email}`);
                  else if (action === 'verification_resent') toast.success(`Verification email resent to ${client.email}`);
                  else if (action === 'invited') toast.success(`Invite sent to ${client.email}`);
                  else toast.success('Email sent');
                }}
              >
                <KeyRound className="w-4 h-4 mr-1" /> Send Password Reset
              </Button>
              <Button variant="outline" size="sm" onClick={loadData}>
                <RefreshCw className="w-4 h-4 mr-1" /> Refresh
              </Button>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Trusts', value: String(trusts.length), icon: Shield },
              { label: 'Assets', value: String(assets.length), icon: Package },
              { label: 'Total Value', value: fmtCurrency(totalAssetValue), icon: DollarSign },
              { label: 'Protected', value: fmtCurrency(protectedValue), icon: Shield },
            ].map((s, i) => (
              <Card key={i} className="glass-card">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-xl font-display font-bold text-foreground">{s.value}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-primary/10">
                    <s.icon className="w-5 h-5 text-primary" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {/* Profile Info - Editable */}
            <GoldHeaderCard title="Profile" icon={<User className="w-4 h-4 text-primary" />} description="Client details (click Save to update)">
              <EditableClientProfile client={client} onSave={async (updates) => {
                // If email changed, sync auth email too
                if (updates.email && updates.email !== client.email) {
                  const { data, error: emailError } = await supabase.functions.invoke('update-user-email', {
                    body: { user_id: client.user_id, new_email: updates.email },
                  });
                  if (emailError || data?.error) {
                    toast.error(data?.error || 'Failed to update login email');
                    return;
                  }
                }
                // If name changed, sync to auth metadata and profiles table
                if (updates.full_name && updates.full_name !== client.full_name) {
                  await supabase.functions.invoke('update-user-profile', {
                    body: { user_id: client.user_id, full_name: updates.full_name },
                  });
                }
                const { error } = await supabase.from('heirway_clients').update(updates as any).eq('id', client.id);
                if (error) { toast.error('Failed to update profile'); return; }
                toast.success('Profile updated');
                loadData();
              }} />

              {/* Plan */}
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 mb-3 mt-3">
                <Label className="text-xs">Plan</Label>
                <Select defaultValue={client.selected_plan || 'free'} onValueChange={handleUpdatePlan}>
                  <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {withCurrentPlanOption(assignmentOptions, client.selected_plan, catalog).map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Plan Status */}
              <div className="p-3 rounded-lg bg-muted/30 border border-border/40 mb-3">
                <Label className="text-xs">Plan Status</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={`text-[10px] capitalize ${
                    client.plan_status === 'paid_off' ? 'bg-primary/10 text-primary border-primary/20' :
                    client.plan_status === 'active' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {client.plan_status?.replace(/_/g, ' ') || 'none'}
                  </Badge>
                  {client.plan_started_at && (
                    <span className="text-[10px] text-muted-foreground">
                      since {new Date(client.plan_started_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Premium Subscription Access */}
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 mb-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label className="text-xs">Premium Subscription Access</Label>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Unlocks Steward & Gold subscriptions without a trust package purchase.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={!!(client as any).premium_access_granted}
                    onChange={async (e) => {
                      const { error } = await supabase
                        .from('heirway_clients')
                        .update({ premium_access_granted: e.target.checked } as any)
                        .eq('id', client.id);
                      if (error) { toast.error('Failed to update access'); return; }
                      toast.success(e.target.checked ? 'Premium access granted' : 'Premium access revoked');
                      loadData();
                    }}
                  />
                </div>
              </div>


              {/* Miro URL */}
              <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
                <Label className="text-xs">Miro Board URL</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    defaultValue={client.miro_board_url || ''}
                    placeholder="https://miro.com/app/board/..."
                    className="glass-input text-xs h-8"
                    id="miro-url-input"
                  />
                  <Button size="sm" variant="outline" className="h-8" onClick={() => {
                    const input = document.getElementById('miro-url-input') as HTMLInputElement;
                    handleUpdateMiroUrl(input.value);
                  }}>
                    Save
                  </Button>
                </div>
              </div>
            </GoldHeaderCard>

            {/* Assets */}
            <GoldHeaderCard title={`Assets (${assets.length})`} icon={<Package className="w-4 h-4 text-primary" />} description={`Total: ${fmtCurrency(totalAssetValue)}`}>
              {assets.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No assets tracked.</p>
              ) : (
                <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                  {assets.map((asset: any) => (
                    <div key={asset.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/40">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{asset.name}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{asset.asset_type.replace(/_/g, ' ')}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-medium text-foreground">{fmtCurrency(asset.estimated_value || 0)}</p>
                        {asset.in_private_trust ? (
                          <Badge variant="outline" className="text-[9px] bg-green-500/10 text-green-600 border-green-500/20">Protected</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] bg-destructive/10 text-destructive border-destructive/20">At Risk</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GoldHeaderCard>

            {/* Requests */}
            <GoldHeaderCard title={`Requests (${requests.length})`} icon={<FileText className="w-4 h-4 text-primary" />} description="Client requests">
              {requests.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No requests.</p>
              ) : (
                <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                  {requests.map((req: any) => (
                    <div key={req.id} className="p-2 rounded-lg bg-muted/30 border border-border/40">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="text-[10px] capitalize">{req.request_type.replace(/_/g, ' ')}</Badge>
                        <Badge variant="outline" className={`text-[9px] ${
                          req.status === 'pending' ? 'bg-yellow-500/10 text-yellow-600' :
                          req.status === 'approved' ? 'bg-green-500/10 text-green-600' :
                          'bg-destructive/10 text-destructive'
                        }`}>{req.status}</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{req.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </GoldHeaderCard>
          </div>

          {/* Trust Members (logins, assignments, billing visibility) */}
          <div className="mb-6">
            <GoldHeaderCard
              title="Trust Members & Logins"
              icon={<User className="w-4 h-4 text-primary" />}
              description="People with portal access tied to this client — trustees, beneficiaries, and their per-trust authority"
            >
              <AdminTrustMembersView clientId={client.id} />
            </GoldHeaderCard>
          </div>

          {/* Learning Progress */}
          <div className="mb-6">
            <GoldHeaderCard
              title="Learning Progress"
              icon={<BookOpen className="w-4 h-4 text-primary" />}
              description="Lessons this client has watched and completed"
            >
              <ClientLearningProgress userId={client.user_id} />
            </GoldHeaderCard>
          </div>

          {/* ═══ TRUST NAMING POOL (overflow names captured at intake) ═══ */}
          {Array.isArray((client as any).trust_name_pool) && (client as any).trust_name_pool.length > 0 && (
            <div className="mb-6">
              <GoldHeaderCard
                title="Trust Naming Pool"
                icon={<Shield className="w-4 h-4 text-primary" />}
                description="Extra trust names this member entered at intake beyond their plan's allotment. Click to promote a name into the Add Trust form, or remove it."
              >
                <div className="flex flex-wrap gap-2">
                  {(client as any).trust_name_pool.map((name: string, idx: number) => (
                    <div key={`${name}-${idx}`} className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/40 border border-border/40">
                      <button
                        type="button"
                        className="text-xs font-medium text-foreground hover:text-primary"
                        onClick={() => {
                          setTrustForm(p => ({ ...p, trust_name: name }));
                          setShowTrustForm(true);
                          setTimeout(() => trustFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                        }}
                      >
                        {name}
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${name} from pool`}
                        className="text-muted-foreground hover:text-destructive"
                        onClick={async () => {
                          const next = ((client as any).trust_name_pool as string[]).filter((_, i) => i !== idx);
                          const { error } = await supabase.from('heirway_clients').update({ trust_name_pool: next } as any).eq('id', client.id);
                          if (error) { toast.error('Failed to update pool'); return; }
                          setClient({ ...client, trust_name_pool: next } as any);
                          toast.success('Removed from pool');
                        }}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </GoldHeaderCard>
            </div>
          )}

          {/* ═══ TRUST FORM (shown above trusts list when editing) ═══ */}
          {showTrustForm && (
            <div ref={trustFormRef} className="glass-panel p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-foreground">{editingTrust ? 'Edit Trust' : 'Add Trust'}</h3>
                <Button size="sm" variant="ghost" onClick={() => { setShowTrustForm(false); resetTrustForm(); }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Trust Name *</Label>
                    <Input className="glass-input mt-1 h-8 text-xs" value={trustForm.trust_name}
                      onChange={e => setTrustForm(p => ({ ...p, trust_name: e.target.value }))}
                      placeholder="e.g. Thompson Family Trust" />
                  </div>
                  <div>
                    <Label className="text-xs">Trust Type *</Label>
                    <Select value={trustForm.trust_type} onValueChange={val => setTrustForm(p => ({ ...p, trust_type: val }))}>
                      <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TRUST_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value} className="text-xs">
                            <span className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                              {t.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Trust Code</Label>
                    <Input className="glass-input mt-1 h-8 text-xs" value={trustForm.trust_code}
                      onChange={e => setTrustForm(p => ({ ...p, trust_code: e.target.value }))}
                      placeholder="e.g. 1, 1a, 2b" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Progress Stage</Label>
                    <Select value={trustForm.stage} onValueChange={val => setTrustForm(p => ({ ...p, stage: val }))}>
                      <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TRUST_STAGES.map(s => (
                          <SelectItem key={s} value={s} className="text-xs capitalize">{s.replace(/_/g, ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Stage Notes</Label>
                    <Input className="glass-input mt-1 h-8 text-xs" value={trustForm.stage_notes}
                      onChange={e => setTrustForm(p => ({ ...p, stage_notes: e.target.value }))}
                      placeholder="Optional notes..." />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Annual Meeting Date</Label>
                  <Input type="date" className="glass-input mt-1 h-8 text-xs" value={trustForm.annual_meeting_date}
                    onChange={e => setTrustForm(p => ({ ...p, annual_meeting_date: e.target.value }))} />
                  <p className="text-[10px] text-muted-foreground mt-1">Sets the annual meeting minute reminder for foundation+ clients</p>
                </div>

                {trustHasBankAccount(trustForm.trust_type) && (
                  <div className="p-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
                    <p className="text-xs text-blue-600 flex items-center gap-1">
                      <Landmark className="w-3.5 h-3.5" /> This trust type includes a bank account
                    </p>
                  </div>
                )}

                <div>
                  <Label className="text-xs">Creator (Grantor/Settlor) *</Label>
                  <Input className="glass-input mt-1 h-8 text-xs" value={trustForm.creator_name}
                    onChange={e => setTrustForm(p => ({ ...p, creator_name: e.target.value }))}
                    placeholder="Full name of trust creator" />
                </div>

                {/* Creator Address */}
                <div className="p-3 rounded-lg bg-muted/20 border border-border/30 space-y-2">
                  <Label className="text-xs font-semibold">Creator Address</Label>
                  <Input className="glass-input h-7 text-xs" value={trustForm.creator_address_street}
                    onChange={e => setTrustForm(p => ({ ...p, creator_address_street: e.target.value }))}
                    placeholder="Street address" />
                  <div className="grid grid-cols-3 gap-2">
                    <Input className="glass-input h-7 text-xs" value={trustForm.creator_address_city}
                      onChange={e => setTrustForm(p => ({ ...p, creator_address_city: e.target.value }))}
                      placeholder="City" />
                    <Select value={trustForm.creator_address_state} onValueChange={v => setTrustForm(p => ({ ...p, creator_address_state: v }))}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="State" /></SelectTrigger>
                      <SelectContent>
                        {['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia',
                          'Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland',
                          'Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey',
                          'New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina',
                          'South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming'
                        ].map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input className="glass-input h-7 text-xs" value={trustForm.creator_address_zip}
                      onChange={e => setTrustForm(p => ({ ...p, creator_address_zip: e.target.value }))}
                      placeholder="ZIP" />
                  </div>
                </div>

                {/* Trustees */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs">Trustees</Label>
                    <div className="flex items-center gap-1">
                      {intake?.trustees && (intake.trustees as any[]).length > 0 && (
                        <Select onValueChange={val => {
                          const intakeTrustees = intake.trustees as any[];
                          const selected = intakeTrustees[Number(val)];
                          if (!selected) return;
                          const alreadyAdded = trustForm.trustees.some(t => t.name.trim().toLowerCase() === (selected.full_name || selected.name || '').trim().toLowerCase());
                          if (alreadyAdded) { toast.info('This trustee is already added'); return; }
                          const newTrustee = { name: selected.full_name || selected.name || '', role: 'Trustee' };
                          setTrustForm(p => ({ ...p, trustees: [...p.trustees.filter(t => t.name.trim()), newTrustee] }));
                        }}>
                          <SelectTrigger className="h-6 text-[10px] px-2 w-auto min-w-[140px] bg-primary/5 border-primary/20">
                            <Users className="w-3 h-3 mr-1 text-primary" />
                            <span className="text-primary">Import from Intake</span>
                          </SelectTrigger>
                          <SelectContent>
                            {(intake.trustees as any[]).map((t: any, idx: number) => (
                              <SelectItem key={idx} value={String(idx)} className="text-xs">
                                {t.full_name || t.name || `Trustee ${idx + 1}`}
                                {t.relationship ? ` (${t.relationship})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <Button type="button" size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() =>
                        setTrustForm(p => ({ ...p, trustees: [...p.trustees, { name: '', role: 'Trustee' }] }))
                      }>
                        <Plus className="w-3 h-3 mr-0.5" /> Add New
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {trustForm.trustees.map((t, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input className="glass-input h-7 text-xs flex-1" value={t.name}
                          onChange={e => {
                            const u = [...trustForm.trustees]; u[i] = { ...u[i], name: e.target.value };
                            setTrustForm(p => ({ ...p, trustees: u }));
                          }} placeholder="Trustee name" />
                        <Select value={t.role} onValueChange={val => {
                          const u = [...trustForm.trustees]; u[i] = { ...u[i], role: val };
                          setTrustForm(p => ({ ...p, trustees: u }));
                        }}>
                          <SelectTrigger className="w-[160px] h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Managing Trustee" className="text-xs">Managing Trustee</SelectItem>
                            <SelectItem value="Full Power Trustee" className="text-xs">Full Power Trustee</SelectItem>
                            <SelectItem value="Limited Power Trustee" className="text-xs">Limited Power Trustee</SelectItem>
                            <SelectItem value="Successor Trustee" className="text-xs">Successor Trustee</SelectItem>
                          </SelectContent>
                        </Select>
                        {trustForm.trustees.length > 1 && (
                          <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive/60 hover:text-destructive"
                            onClick={() => setTrustForm(p => ({ ...p, trustees: p.trustees.filter((_, idx) => idx !== i) }))}>
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Beneficiaries */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs">Beneficiaries & Units of Interest</Label>
                    <div className="flex items-center gap-1">
                      {intake?.beneficiaries && (intake.beneficiaries as any[]).length > 0 && (
                        <Select onValueChange={val => {
                          const intakeBens = intake.beneficiaries as any[];
                          const selected = intakeBens[Number(val)];
                          if (!selected) return;
                          const alreadyAdded = trustForm.beneficiaries.some(b => b.name.trim().toLowerCase() === (selected.name || '').trim().toLowerCase());
                          if (alreadyAdded) { toast.info('This beneficiary is already added'); return; }
                          const newBen = {
                            name: selected.name || '', units: selected.units || '', is_passive: selected.is_passive || false,
                            address_street: selected.address_street || '', address_city: selected.address_city || '',
                            address_state: selected.address_state || '', address_zip: selected.address_zip || '',
                          };
                          setTrustForm(p => ({ ...p, beneficiaries: [...p.beneficiaries.filter(b => b.name.trim()), newBen] }));
                        }}>
                          <SelectTrigger className="h-6 text-[10px] px-2 w-auto min-w-[140px] bg-primary/5 border-primary/20">
                            <Gift className="w-3 h-3 mr-1 text-primary" />
                            <span className="text-primary">Import from Intake</span>
                          </SelectTrigger>
                          <SelectContent>
                            {(intake.beneficiaries as any[]).map((b: any, idx: number) => (
                              <SelectItem key={idx} value={String(idx)} className="text-xs">
                                {b.name || `Beneficiary ${idx + 1}`}
                                {b.relationship ? ` (${b.relationship})` : ''}
                                {b.units ? ` — ${b.units} units` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <Button type="button" size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() =>
                        setTrustForm(p => ({ ...p, beneficiaries: [...p.beneficiaries, { name: '', units: '', is_passive: false, address_street: '', address_city: '', address_state: '', address_zip: '' }] }))
                      }>
                        <Plus className="w-3 h-3 mr-0.5" /> Add New
                      </Button>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-2">Total units must equal 200</p>
                  <div className="space-y-2">
                    {trustForm.beneficiaries.map((b, i) => (
                      <div key={i} className="p-2 rounded-lg bg-muted/10 border border-border/30 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Input className="glass-input h-7 text-xs flex-1" value={b.name}
                            onChange={e => {
                              const u = [...trustForm.beneficiaries]; u[i] = { ...u[i], name: e.target.value };
                              setTrustForm(p => ({ ...p, beneficiaries: u }));
                            }} placeholder="Beneficiary name" />
                          <Input className="glass-input h-7 text-xs w-[100px]" value={b.units}
                            onChange={e => {
                              const u = [...trustForm.beneficiaries]; u[i] = { ...u[i], units: e.target.value };
                              setTrustForm(p => ({ ...p, beneficiaries: u }));
                            }} placeholder="Units" />
                          <label className="flex items-center gap-1 text-[10px] text-muted-foreground whitespace-nowrap cursor-pointer">
                            <input type="checkbox" checked={b.is_passive || false}
                              onChange={e => {
                                const u = [...trustForm.beneficiaries]; u[i] = { ...u[i], is_passive: e.target.checked };
                                setTrustForm(p => ({ ...p, beneficiaries: u }));
                              }}
                              className="w-3 h-3 rounded border-border" />
                            Passive
                          </label>
                          {trustForm.beneficiaries.length > 1 && (
                            <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive/60 hover:text-destructive"
                              onClick={() => setTrustForm(p => ({ ...p, beneficiaries: p.beneficiaries.filter((_, idx) => idx !== i) }))}>
                              <X className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                        {/* Beneficiary Address */}
                        <Input className="glass-input h-7 text-xs" value={b.address_street}
                          onChange={e => {
                            const u = [...trustForm.beneficiaries]; u[i] = { ...u[i], address_street: e.target.value };
                            setTrustForm(p => ({ ...p, beneficiaries: u }));
                          }} placeholder="Street address" />
                        <div className="grid grid-cols-3 gap-1.5">
                          <Input className="glass-input h-7 text-xs" value={b.address_city}
                            onChange={e => {
                              const u = [...trustForm.beneficiaries]; u[i] = { ...u[i], address_city: e.target.value };
                              setTrustForm(p => ({ ...p, beneficiaries: u }));
                            }} placeholder="City" />
                          <Select value={b.address_state} onValueChange={v => {
                            const u = [...trustForm.beneficiaries]; u[i] = { ...u[i], address_state: v };
                            setTrustForm(p => ({ ...p, beneficiaries: u }));
                          }}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="State" /></SelectTrigger>
                            <SelectContent>
                              {['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia',
                                'Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland',
                                'Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey',
                                'New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina',
                                'South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming'
                              ].map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Input className="glass-input h-7 text-xs" value={b.address_zip}
                            onChange={e => {
                              const u = [...trustForm.beneficiaries]; u[i] = { ...u[i], address_zip: e.target.value };
                              setTrustForm(p => ({ ...p, beneficiaries: u }));
                            }} placeholder="ZIP" />
                        </div>
                      </div>
                    ))}
                  </div>
                  {(() => {
                    const total = trustForm.beneficiaries.filter(b => b.name.trim()).reduce((s, b) => s + (Number(b.units) || 0), 0);
                    return total > 0 ? (
                      <p className={`text-[11px] mt-1 font-medium ${total === 200 ? 'text-green-600' : 'text-destructive'}`}>
                        Total: {total.toFixed(2)} / 200.00 units {total === 200 ? '✓' : `(${(200 - total).toFixed(2)} remaining)`}
                      </p>
                    ) : null;
                  })()}
                </div>

                <div className="flex items-center gap-3 mb-3 p-2 rounded-md bg-muted/50 border border-border/50">
                  <Switch checked={adminOverride} onCheckedChange={setAdminOverride} id="admin-override" />
                  <Label htmlFor="admin-override" className="text-sm cursor-pointer">Admin Override <span className="text-muted-foreground">(skip validation)</span></Label>
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1" onClick={handleSaveTrust}>
                    {editingTrust ? <><Pencil className="w-4 h-4 mr-1" /> Update Trust</> : <><Plus className="w-4 h-4 mr-1" /> Create Trust</>}
                  </Button>
                  <Button variant="outline" onClick={() => { setShowTrustForm(false); resetTrustForm(); setAdminOverride(false); }}>Cancel</Button>
                </div>
              </div>
            </div>
          )}

          {/* ═══ ACTIVE TRUSTS SECTION ═══ */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-display font-bold text-foreground">Trusts In Progress ({activeTrusts.length})</h2>
              <Button size="sm" onClick={openAddTrust}>
                <Plus className="w-4 h-4 mr-1" /> Add Trust
              </Button>
            </div>

            {activeTrusts.length === 0 && !showTrustForm ? (
              <div className="glass-panel p-8 text-center">
                <Shield className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No active trusts.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeTrusts.map(trust => {
                  const trustAssets = getAssetsForTrust(trust.id);
                  const trustAssetVal = trustAssets.reduce((s, a: any) => s + (Number(a.estimated_value) || 0), 0);
                  const trustVal = trustAssetVal + silverSpotPrice; // 1 oz silver per trust
                  const stageIdx = TRUST_STAGES.indexOf(trust.stage);
                  const percent = ((stageIdx + 1) / TRUST_STAGES.length) * 100;

                  return (
                    <div key={trust.id} className="glass-panel p-5">
                      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center border"
                            style={{
                              backgroundColor: `${getTrustColor(trust.trust_type)}15`,
                              borderColor: `${getTrustColor(trust.trust_type)}30`,
                            }}
                          >
                            <Shield className="w-5 h-5" style={{ color: getTrustColor(trust.trust_type) }} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground">{trust.trust_name} {(trust as any).trust_code && <span className="text-xs text-muted-foreground font-mono ml-1">[{(trust as any).trust_code}]</span>}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className={`text-[10px] ${getTrustBgClass(trust.trust_type)}`}>
                                {getTrustLabel(trust.trust_type)}
                              </Badge>
                              {trustHasBankAccount(trust.trust_type) && (
                                <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20">
                                  <Landmark className="w-2.5 h-2.5 mr-0.5" /> Bank
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] capitalize">{trust.stage.replace(/_/g, ' ')}</Badge>
                          <Button size="sm" variant="outline" onClick={() => openEditTrust(trust)}>
                            <Pencil className="w-3 h-3 mr-1" /> Edit
                          </Button>
                          <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteTrust(trust.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground capitalize">{trust.stage.replace(/_/g, ' ')}</span>
                          <span className="text-xs font-medium text-primary">{percent}%</span>
                        </div>
                        <Progress value={percent} className="h-1.5" />
                        {trust.stage_notes && (
                          <p className="text-[11px] text-muted-foreground mt-1">{trust.stage_notes}</p>
                        )}
                      </div>

                      {/* People */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                        <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
                          <div className="flex items-center gap-1 mb-1">
                            <Crown className="w-3.5 h-3.5 text-primary" />
                            <p className="text-[10px] font-semibold text-foreground uppercase tracking-wider">Creator</p>
                          </div>
                          <p className="text-xs text-foreground">{trust.creator_name || 'Not specified'}</p>
                          {((trust as any).creator_address_street || (trust as any).creator_address_city) && (
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {(trust as any).creator_address_street}
                              {(trust as any).creator_address_street && ((trust as any).creator_address_city || (trust as any).creator_address_state) && ', '}
                              {(trust as any).creator_address_city}{(trust as any).creator_address_city && (trust as any).creator_address_state && ', '}{(trust as any).creator_address_state} {(trust as any).creator_address_zip}
                            </p>
                          )}
                        </div>
                        <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
                          <div className="flex items-center gap-1 mb-1">
                            <User className="w-3.5 h-3.5 text-primary" />
                            <p className="text-[10px] font-semibold text-foreground uppercase tracking-wider">Trustees</p>
                          </div>
                          {(trust.trustees || []).length === 0 ? (
                            <p className="text-[11px] text-muted-foreground">None</p>
                          ) : (
                            <div className="space-y-0.5">
                              {(trust.trustees as any[]).map((t, i) => (
                                <div key={i} className="flex items-center gap-1.5">
                                  <p className="text-xs text-foreground">{t.name}</p>
                                  <Badge variant={
                                    t.role === 'Managing Trustee' ? 'default' :
                                    t.role === 'Full Power Trustee' ? 'secondary' :
                                    'outline'
                                  } className="text-[9px] px-1.5 py-0">
                                    {t.role}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
                          <div className="flex items-center gap-1 mb-1">
                            <Users className="w-3.5 h-3.5 text-primary" />
                            <p className="text-[10px] font-semibold text-foreground uppercase tracking-wider">Beneficiaries</p>
                          </div>
                          {(trust.beneficiaries || []).length === 0 ? (
                            <p className="text-[11px] text-muted-foreground">None</p>
                          ) : (
                            <div className="space-y-1.5">
                              {(trust.beneficiaries as any[]).map((b, i) => (
                                <div key={i}>
                                  <div className="flex items-center justify-between gap-1">
                                    <p className="text-xs text-foreground truncate">{b.name}{b.is_passive && <span className="text-[9px] text-muted-foreground ml-1">(passive)</span>}</p>
                                    <Badge variant="outline" className="text-[9px] flex-shrink-0">{Number(b.units_of_interest).toFixed(2)} units</Badge>
                                  </div>
                                  {(b.address_street || b.address_city) && (
                                    <p className="text-[10px] text-muted-foreground">
                                      {b.address_street}{b.address_street && (b.address_city || b.address_state) && ', '}
                                      {b.address_city}{b.address_city && b.address_state && ', '}{b.address_state} {b.address_zip}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Trust meta */}
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        {(trust as any).annual_meeting_date && (
                          <Badge variant="outline" className="text-[10px]">Annual meeting: {new Date((trust as any).annual_meeting_date).toLocaleDateString()}</Badge>
                        )}
                        <Badge variant="outline" className="text-[10px]">Created {new Date(trust.created_at).toLocaleDateString()}</Badge>
                        <Badge variant="outline" className="text-[10px]">
                          Units: {(trust.beneficiaries as any[] || []).reduce((s, b) => s + (Number(b.units_of_interest) || 0), 0).toFixed(2)} / 200
                        </Badge>
                      </div>

                      {/* Assets in this trust */}
                      <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
                          Assets in Trust ({trustAssets.length + 1}) · {fmtCurrency(trustVal)}
                        </p>
                        <div className="space-y-1">
                          {/* Silver holding */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-foreground">Silver (1 oz)</span>
                            <span className="text-xs text-muted-foreground">{fmtCurrency(silverSpotPrice)}</span>
                          </div>
                          {trustAssets.map((a: any) => (
                            <div key={a.id} className="flex items-center justify-between">
                              <span className="text-xs text-foreground">{a.name}</span>
                              <span className="text-xs text-muted-foreground">{fmtCurrency(a.estimated_value || 0)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ═══ COMPLETED TRUSTS SECTION ═══ */}
          {completedTrusts.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-display font-bold text-foreground mb-4">Trusts Completed ({completedTrusts.length})</h2>
              <div className="space-y-4">
                {completedTrusts.map(trust => {
                  const trustAssets = getAssetsForTrust(trust.id);
                  const trustAssetVal = trustAssets.reduce((s, a: any) => s + (Number(a.estimated_value) || 0), 0);
                  const trustTotalVal = trustAssetVal + silverSpotPrice; // 1 oz silver per trust
                  return (
                    <div key={trust.id} className="glass-panel p-5 border-green-500/20">
                      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                            <Check className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground">{trust.trust_name} {(trust as any).trust_code && <span className="text-xs text-muted-foreground font-mono ml-1">[{(trust as any).trust_code}]</span>}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className={`text-[10px] ${getTrustBgClass(trust.trust_type)}`}>
                                {getTrustLabel(trust.trust_type)}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20">
                                Complete
                              </Badge>
                              {trustHasBankAccount(trust.trust_type) && (
                                <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20">
                                  <Landmark className="w-2.5 h-2.5 mr-0.5" /> Bank
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEditTrust(trust)}>
                            <Pencil className="w-3 h-3 mr-1" /> Edit
                          </Button>
                        </div>
                      </div>

                      {/* People */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                        <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
                          <div className="flex items-center gap-1 mb-1">
                            <Crown className="w-3.5 h-3.5 text-primary" />
                            <p className="text-[10px] font-semibold text-foreground uppercase tracking-wider">Creator</p>
                          </div>
                          <p className="text-xs text-foreground">{trust.creator_name || 'Not specified'}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
                          <div className="flex items-center gap-1 mb-1">
                            <User className="w-3.5 h-3.5 text-primary" />
                            <p className="text-[10px] font-semibold text-foreground uppercase tracking-wider">Trustees</p>
                          </div>
                          {(trust.trustees || []).length === 0 ? (
                            <p className="text-[11px] text-muted-foreground">None</p>
                          ) : (
                            <div className="space-y-0.5">
                              {(trust.trustees as any[]).map((t, i) => (
                                <div key={i} className="flex items-center gap-1.5">
                                  <p className="text-xs text-foreground">{t.name}</p>
                                  <Badge variant={
                                    t.role === 'Managing Trustee' ? 'default' :
                                    t.role === 'Full Power Trustee' ? 'secondary' :
                                    'outline'
                                  } className="text-[9px] px-1.5 py-0">
                                    {t.role}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
                          <div className="flex items-center gap-1 mb-1">
                            <Users className="w-3.5 h-3.5 text-primary" />
                            <p className="text-[10px] font-semibold text-foreground uppercase tracking-wider">Beneficiaries</p>
                          </div>
                          {(trust.beneficiaries || []).length === 0 ? (
                            <p className="text-[11px] text-muted-foreground">None</p>
                          ) : (
                            <div className="space-y-0.5">
                              {(trust.beneficiaries as any[]).map((b, i) => (
                                <div key={i} className="flex items-center justify-between">
                                  <p className="text-xs text-foreground">{b.name}</p>
                                  <Badge variant="outline" className="text-[9px]">{Number(b.units_of_interest).toFixed(2)} units</Badge>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Assets in this trust (including silver) */}
                      <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
                          Assets in Trust ({trustAssets.length + 1} incl. silver) · {fmtCurrency(trustTotalVal)}
                        </p>
                        {/* Silver holding */}
                        <div className="flex items-center justify-between py-1 border-b border-border/20 mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded bg-amber-500/10 flex items-center justify-center">
                              <DollarSign className="w-3 h-3 text-amber-600" />
                            </div>
                            <span className="text-xs text-foreground font-medium">Silver (1 oz)</span>
                          </div>
                          <span className="text-xs font-medium text-foreground">{fmtCurrency(silverSpotPrice)}</span>
                        </div>
                        {trustAssets.length === 0 ? (
                          <p className="text-[11px] text-muted-foreground mt-1">No additional assets assigned</p>
                        ) : (
                          <div className="space-y-1">
                            {trustAssets.map((a: any) => (
                              <div key={a.id} className="flex items-center justify-between">
                                <span className="text-xs text-foreground">{a.name}</span>
                                <span className="text-xs text-muted-foreground">{fmtCurrency(a.estimated_value || 0)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}


          {/* ═══ ALL FORM/QUIZ/QUESTIONNAIRE ANSWERS ═══ */}

          {/* Get Started Quiz Answers (from prospects) */}
          {prospect?.quiz_answers && (
            <GoldHeaderCard title="Get Started Quiz Answers" icon={<ClipboardList className="w-4 h-4 text-primary" />} description="Answers from the initial Get Started form">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { label: 'Current Plan', key: 'current_plan', map: { yes_fully: 'Yes, fully set up', kind_of: 'Kind of / Not sure', no: 'No' } as Record<string, string> },
                  { label: 'Top Concern', key: 'top_concern', map: { protecting_assets: 'Protecting assets', avoiding_probate: 'Avoiding probate', tax_reduction: 'Tax reduction', family_future: 'Family future' } as Record<string, string> },
                  { label: 'Timeline', key: 'timeline', map: { immediately: 'Immediately', this_month: 'This month', this_year: 'This year', exploring: 'Just exploring' } as Record<string, string> },
                  { label: 'Walkthrough Interest', key: 'walkthrough_interest', map: { yes: 'Yes', maybe: 'Maybe later', no: 'No need' } as Record<string, string> },
                ].map(({ label, key, map }) => {
                  const val = (prospect.quiz_answers as any)?.[key];
                  if (!val) return null;
                  return (
                    <div key={key} className="p-2 rounded bg-muted/20 border border-border/30">
                      <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
                      <p className="text-xs font-medium text-foreground">{map[val] || val}</p>
                    </div>
                  );
                })}
              </div>
            </GoldHeaderCard>
          )}

          {/* Trust Questionnaire Answers */}
          {(client as any)?.questionnaire_answers && (
            <GoldHeaderCard title="Trust Questionnaire Answers" icon={<ClipboardList className="w-4 h-4 text-primary" />} description="10-question trust plan recommendation quiz">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  { label: 'Over 18', key: 'is_18_plus', format: (v: any) => v === true ? 'Yes' : v === false ? 'No' : 'N/A' },
                  { label: 'State', key: 'state' },
                  { label: 'Married', key: 'is_married', format: (v: any) => v === true ? 'Yes' : v === false ? 'No' : 'N/A' },
                  { label: 'Has Children', key: 'has_children', format: (v: any) => v === true ? 'Yes' : v === false ? 'No' : 'N/A' },
                  { label: 'Housing', key: 'housing_situation', format: (v: any) => ({ mortgage: 'Mortgage', paid_off: 'Paid Off', renting: 'Renting' }[v as string] || v || 'N/A') },
                  { label: 'Estate Purposes', key: 'estate_plan_purposes', format: (v: any) => Array.isArray(v) ? v.map((p: string) => ({ family_banking: 'Family Banking', life_insurance: 'Life Insurance', trust_fund: 'Trust Fund', none: 'None' }[p] || p)).join(', ') : 'N/A' },
                  { label: 'Special Needs', key: 'has_special_needs', format: (v: any) => v === true ? 'Yes' : v === false ? 'No' : 'N/A' },
                  { label: 'Over $1M Assets', key: 'over_1m_assets', format: (v: any) => v === true ? 'Yes' : v === false ? 'No' : 'N/A' },
                  { label: 'Business Ownership', key: 'business_ownership', format: (v: any) => ({ single: 'Yes — one', side_hustle: 'Side hustle', multiple: 'Multiple', none: 'None' }[v as string] || v || 'N/A') },
                  { label: 'Employment Type', key: 'employment_type', format: (v: any) => ({ w2: 'W2', '1099': '1099', both: 'Both' }[v as string] || v || 'N/A') },
                  { label: 'Recommended Plan', key: 'recommended_plan', format: (v: any) => (v || '').replace(/_/g, ' ') || 'N/A' },
                  { label: 'Completed At', key: 'completed_at', format: (v: any) => v ? new Date(v).toLocaleDateString() : 'N/A' },
                ].map(({ label, key, format }) => {
                  const qa = (client as any).questionnaire_answers;
                  const val = qa?.[key];
                  return (
                    <div key={key} className="p-2 rounded bg-muted/20 border border-border/30">
                      <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
                      <p className="text-xs font-medium text-foreground capitalize">{format ? format(val) : (val ?? 'N/A')}</p>
                    </div>
                  );
                })}
              </div>
            </GoldHeaderCard>
          )}

          {/* Full Intake Data */}
          {intake && (
            <GoldHeaderCard title="Intake Form Answers" icon={<FileText className="w-4 h-4 text-primary" />} description="Complete intake submission">
              <div className="space-y-4">
                {/* Basic Info */}
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Personal Information</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      { label: 'First Name', value: intake.first_name },
                      { label: 'Middle Name', value: intake.middle_name },
                      { label: 'Last Name', value: intake.last_name },
                      { label: 'Suffix', value: intake.suffix },
                      { label: 'Preferred Name', value: intake.preferred_name },
                      { label: 'Date of Birth', value: intake.date_of_birth },
                      { label: 'Phone', value: intake.mobile_phone },
                      { label: 'Trust Email', value: intake.trust_email },
                    ].map((item, i) => (
                      <div key={i} className="p-2 rounded bg-muted/20 border border-border/30">
                        <p className="text-[10px] text-muted-foreground uppercase">{item.label}</p>
                        <p className="text-xs font-medium text-foreground">{item.value || 'N/A'}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Spouse */}
                {(intake.spouse_full_name || client.is_married) && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Spouse Information</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {[
                        { label: 'Spouse Name', value: intake.spouse_full_name },
                        { label: 'Spouse Preferred', value: intake.spouse_preferred_name },
                        { label: 'Spouse DOB', value: intake.spouse_dob },
                        { label: 'Spouse Phone', value: intake.spouse_phone },
                      ].map((item, i) => (
                        <div key={i} className="p-2 rounded bg-muted/20 border border-border/30">
                          <p className="text-[10px] text-muted-foreground uppercase">{item.label}</p>
                          <p className="text-xs font-medium text-foreground">{item.value || 'N/A'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tax & Accounting */}
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Tax & Accounting</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      { label: 'CPA Name', value: intake.cpa_name },
                      { label: 'CPA Email', value: intake.cpa_email },
                      { label: 'CPA Phone', value: intake.cpa_phone },
                      { label: 'Income', value: intake.estimated_current_income ? `$${Number(intake.estimated_current_income).toLocaleString()}` : null },
                      { label: 'Last Tax Year', value: intake.last_tax_year },
                      { label: 'Tax Return Types', value: (intake.tax_return_types || []).join(', ') || null },
                      { label: 'Major Tax Events', value: intake.major_tax_events },
                      { label: 'Expects Inheritance', value: intake.expects_inheritance },
                    ].map((item, i) => (
                      <div key={i} className="p-2 rounded bg-muted/20 border border-border/30">
                        <p className="text-[10px] text-muted-foreground uppercase">{item.label}</p>
                        <p className="text-xs font-medium text-foreground">{item.value || 'N/A'}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Trust Structure */}
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Trust Structure</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      { label: 'Trust Name', value: intake.trust_name },
                      { label: 'Domicile State', value: intake.trust_domicile_state },
                      { label: 'Trust Address', value: [intake.trust_address_street, intake.trust_address_city, intake.trust_address_state, intake.trust_address_zip].filter(Boolean).join(', ') || null },
                      { label: 'Managing Trustee Phone', value: intake.managing_trustee_phone },
                      { label: 'Trust Names', value: (intake.trust_names || []).join(', ') || null },
                    ].map((item, i) => (
                      <div key={i} className="p-2 rounded bg-muted/20 border border-border/30">
                        <p className="text-[10px] text-muted-foreground uppercase">{item.label}</p>
                        <p className="text-xs font-medium text-foreground">{item.value || 'N/A'}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Goals & Priorities */}
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Goals & Priorities</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {[
                      { label: 'Top Priorities', value: (intake.top_priorities || []).join(', ') || null },
                      { label: 'Support Preference', value: intake.support_preference },
                      { label: 'Biggest Fear', value: intake.biggest_fear },
                      { label: 'Confident Plan Works', value: intake.confident_plan_works },
                      { label: 'Existing Documents', value: (intake.existing_documents || []).join(', ') || null },
                      { label: 'Estate Plan Last Reviewed', value: intake.estate_plan_last_reviewed },
                    ].map((item, i) => (
                      <div key={i} className="p-2 rounded bg-muted/20 border border-border/30">
                        <p className="text-[10px] text-muted-foreground uppercase">{item.label}</p>
                        <p className="text-xs font-medium text-foreground">{item.value || 'N/A'}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dependents */}
                {((intake.dependents as any[]) || []).length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Dependents</p>
                    <div className="space-y-1">
                      {(intake.dependents as any[]).map((d: any, i: number) => (
                        <div key={i} className="p-2 rounded bg-muted/20 border border-border/30 flex items-center justify-between">
                          <span className="text-xs text-foreground">{d.full_name || d.name || `Dependent ${i + 1}`}</span>
                          <span className="text-[10px] text-muted-foreground">{d.relationship || ''} {d.age ? `· Age ${d.age}` : ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trustees from intake */}
                {((intake.trustees as any[]) || []).length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Trustees (Intake)</p>
                    <div className="space-y-1">
                      {(intake.trustees as any[]).map((t: any, i: number) => (
                        <div key={i} className="p-2 rounded bg-muted/20 border border-border/30 flex items-center justify-between">
                          <span className="text-xs text-foreground">{t.full_name || t.name || `Trustee ${i + 1}`}</span>
                          <span className="text-[10px] text-muted-foreground">{t.relationship || ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Beneficiaries from intake */}
                {((intake.beneficiaries as any[]) || []).length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Beneficiaries (Intake)</p>
                    <div className="space-y-1">
                      {(intake.beneficiaries as any[]).map((b: any, i: number) => (
                        <div key={i} className="p-2 rounded bg-muted/20 border border-border/30 flex items-center justify-between">
                          <span className="text-xs text-foreground">{b.full_name || b.name || `Beneficiary ${i + 1}`}</span>
                          <span className="text-[10px] text-muted-foreground">{b.relationship || ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Business Info */}
                {intake.business_name && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Business Information</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {[
                        { label: 'Business Name', value: intake.business_name },
                        { label: 'Business Type', value: intake.business_type },
                        { label: 'Description', value: intake.business_description },
                        { label: 'Revenue', value: intake.business_revenue },
                      ].map((item, i) => (
                        <div key={i} className="p-2 rounded bg-muted/20 border border-border/30">
                          <p className="text-[10px] text-muted-foreground uppercase">{item.label}</p>
                          <p className="text-xs font-medium text-foreground">{item.value || 'N/A'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Completion Status */}
                <div className="flex items-center gap-3 pt-2 border-t border-border/30">
                  <Badge variant="outline" className={`text-[10px] ${intake.completed ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'}`}>
                    {intake.completed ? 'Completed' : `In Progress (Section ${intake.current_section || 1})`}
                  </Badge>
                  {intake.confirmed && (
                    <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20">Confirmed</Badge>
                  )}
                </div>
              </div>
            </GoldHeaderCard>
          )}

          {/* Intake Questions */}
          {intakeQuestions.length > 0 && (
            <GoldHeaderCard title={`Intake Questions (${intakeQuestions.length})`} icon={<MessageCircleQuestion className="w-4 h-4 text-primary" />} description="Questions submitted during intake">
              <div className="space-y-2">
                {intakeQuestions.map((q: any) => (
                  <div key={q.id} className="p-3 rounded-lg bg-muted/20 border border-border/30">
                    <p className="text-xs text-foreground mb-1">{q.question}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[9px] ${q.status === 'answered' ? 'bg-green-500/10 text-green-600' : 'bg-yellow-500/10 text-yellow-600'}`}>
                        {q.status}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{new Date(q.created_at).toLocaleDateString()}</span>
                    </div>
                    {q.admin_response && (
                      <p className="text-[11px] text-muted-foreground mt-1 border-t border-border/20 pt-1">
                        <strong>Response:</strong> {q.admin_response}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </GoldHeaderCard>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
