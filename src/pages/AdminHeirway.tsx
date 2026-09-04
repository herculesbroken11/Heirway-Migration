import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GoldHeaderCard } from '@/components/ui/gold-header-card';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TRUST_TYPES, getTrustLabel, getTrustBgClass, trustHasBankAccount } from '@/lib/trustTypes';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Users, Shield, FileText, ClipboardList, Settings, Plus, Search,
  ChevronDown, ChevronUp, Eye, Edit, Trash2, Check, X, DollarSign,
  Building2, User, Briefcase, AlertTriangle, Clock, RefreshCw, Landmark, Coins, Pencil,
  ExternalLink, Crown, Heart, Bell, Send, BookOpen, Video, BarChart3, Download, Sparkles, Settings2,
} from 'lucide-react';
import LearningContentManager from '@/components/heirway/admin/LearningContentManager';
import AdminUsersManager from '@/components/heirway/admin/AdminUsersManager';
import IntakeVideoManager from '@/components/heirway/admin/IntakeVideoManager';
import KnowledgebaseManager from '@/components/heirway/admin/KnowledgebaseManager';
import PlanConfigurationManager from '@/components/heirway/admin/PlanConfigurationManager';
import PlanEntitlementEditor from '@/components/heirway/admin/PlanEntitlementEditor';
import PlanPricesViewer from '@/components/heirway/admin/PlanPricesViewer';
import ConsentLogViewer from '@/components/heirway/admin/ConsentLogViewer';
import ContactMessagesViewer from '@/components/heirway/admin/ContactMessagesViewer';
import { usePlanDisplayLabels, withCurrentPlanOption } from '@/hooks/usePlanDisplayLabels';

import { UserBehaviorAnalytics } from '@/components/dashboard/UserBehaviorAnalytics';

// ─── Types ───────────────────────────────────────────────
interface HeirwayClient {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  state: string;
  selected_plan: string | null;
  plan_status: string;
  is_married: boolean;
  has_children: boolean;
  owns_real_estate: boolean;
  over_1m_assets: boolean;
  business_ownership: string;
  employment_type: string;
  recommended_plan: string;
  miro_board_url: string | null;
  created_at: string;
}

interface AdminRequest {
  id: string;
  user_id: string;
  client_id: string;
  request_type: string;
  description: string;
  status: string;
  admin_notes: string | null;
  ticket_number: number;
  created_at: string;
  client?: HeirwayClient;
}

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
  beneficiaries: { name: string; units_of_interest: string }[];
}

const TRUST_STAGES = ['assigning_creator', 'processing_documents', 'ready_to_sign', 'trusts_complete'];

export default function AdminHeirway() {
  const navigate = useNavigate();
  const { planLabel, assignmentOptions, catalog } = usePlanDisplayLabels();
  const [clients, setClients] = useState<HeirwayClient[]>([]);
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [trusts, setTrusts] = useState<TrustRecord[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [intakes, setIntakes] = useState<any[]>([]);
  const [prospects, setProspects] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedClient, setSelectedClient] = useState<HeirwayClient | null>(null);
  const [clientDetailOpen, setClientDetailOpen] = useState(false);
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [editPlanOpen, setEditPlanOpen] = useState(false);
  const [requestNotesDialog, setRequestNotesDialog] = useState<AdminRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [newClient, setNewClient] = useState({
    email: '', full_name: '', phone: '', state: '', selected_plan: 'free',
    is_married: false, has_children: false, owns_real_estate: false,
    over_1m_assets: false, business_ownership: 'none', employment_type: 'w2',
  });

  // Silver spot price
  const [silverSpotInput, setSilverSpotInput] = useState('');

  // Trust add/edit
  const [addTrustOpen, setAddTrustOpen] = useState(false);
  const [addTrustClient, setAddTrustClient] = useState<HeirwayClient | null>(null);
  const [editingTrust, setEditingTrust] = useState<TrustRecord | null>(null);
  const [trustForm, setTrustForm] = useState({
    trust_name: '', trust_type: 'revocable', creator_name: '', stage: 'assigning_creator', stage_notes: '',
    annual_meeting_date: '',
    trustees: [{ name: '', role: 'Managing Trustee' }] as { name: string; role: string }[],
    beneficiaries: [{ name: '', units: '' }] as { name: string; units: string }[],
  });

  const [addingClient, setAddingClient] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);

  // Notifications
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifForm, setNotifForm] = useState({ title: '', message: '', target_client_id: '', target_plans: [] as string[], expires_at: '' });
  const [clientSearch, setClientSearch] = useState('');
  const [notifTargetMode, setNotifTargetMode] = useState<'all' | 'plans' | 'individual'>('all');
  const [notifDialogOpen, setNotifDialogOpen] = useState(false);

  useEffect(() => { loadAllData(); }, []);

  const loadAllData = async () => {
    setLoading(true);
    const [clientsRes, requestsRes, trustsRes, assetsRes, intakesRes, notifsRes, prospectsRes] = await Promise.all([
      supabase.from('heirway_clients').select('*').order('created_at', { ascending: false }),
      supabase.from('heirway_admin_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('heirway_trust_progress').select('*'),
      supabase.from('heirway_assets').select('*'),
      supabase.from('heirway_intake').select('*'),
      supabase.from('heirway_admin_notifications' as any).select('*').order('created_at', { ascending: false }),
      supabase.from('prospects').select('*').order('created_at', { ascending: false }),
    ]);
    const clientsData = (clientsRes.data as any[]) || [];
    setClients(clientsData);
    const reqs = (requestsRes.data as AdminRequest[]) || [];
    const clientMap = new Map(clientsData.map((c: any) => [c.id, c]));
    reqs.forEach(r => { r.client = clientMap.get(r.client_id) as HeirwayClient; });
    setRequests(reqs);
    setTrusts((trustsRes.data as any[]) || []);
    setAssets(assetsRes.data || []);
    setIntakes(intakesRes.data || []);
    setNotifications((notifsRes.data as any[]) || []);
    setProspects((prospectsRes.data as any[]) || []);

    // Set silver spot from first client that has it
    const firstWithPrice = clientsData.find((c: any) => c.silver_spot_price > 0);
    if (firstWithPrice) setSilverSpotInput(String(firstWithPrice.silver_spot_price));

    setLoading(false);
  };

  // ─── Helpers ────────────────────────────────────────────
  const getClientTrusts = (clientId: string) => trusts.filter(t => t.client_id === clientId);
  const getClientAssets = (clientId: string) => assets.filter(a => a.client_id === clientId);
  const getClientIntake = (clientId: string) => intakes.find((i: any) => i.client_id === clientId);
  const getClientRequests = (clientId: string) => requests.filter(r => r.client_id === clientId);

  const getClientTotalAssetValue = (clientId: string) =>
    getClientAssets(clientId).reduce((sum: number, a: any) => sum + (a.estimated_value || 0), 0);

  const filteredClients = clients.filter(c => {
    const q = searchQuery.toLowerCase();
    return !q ||
      (c.full_name || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.state || '').toLowerCase().includes(q) ||
      (c.selected_plan || '').toLowerCase().includes(q);
  });

  const pendingRequests = requests.filter(r => r.status === 'pending');

  // ─── Actions ────────────────────────────────────────────
  const handleUpdatePlan = async (clientId: string, plan: string) => {
    const targetClient = clients.find(c => c.id === clientId);
    const updateData: any = {
      selected_plan: plan === 'free' ? null : plan,
      plan_status: 'active',
    };
    // Set plan_started_at when upgrading from free to a paid plan
    if (plan !== 'free' && (!targetClient?.selected_plan || targetClient?.selected_plan === null)) {
      updateData.plan_started_at = new Date().toISOString();
    }
    const { error } = await supabase.from('heirway_clients').update(updateData).eq('id', clientId);
    if (error) { toast.error('Failed to update plan'); return; }
    toast.success('Plan updated');
    loadAllData();
    setEditPlanOpen(false);
  };

  const handleUpdateMiroUrl = async (clientId: string, url: string) => {
    const { error } = await supabase.from('heirway_clients').update({ miro_board_url: url }).eq('id', clientId);
    if (error) { toast.error('Failed to update'); return; }
    toast.success('Miro URL updated');
    loadAllData();
  };

  const handleRequestAction = async (requestId: string, status: 'approved' | 'denied') => {
    const request = requests.find((r: any) => r.id === requestId);
    const { error } = await supabase.from('heirway_admin_requests').update({
      status, admin_notes: adminNotes || null,
    }).eq('id', requestId);
    if (error) { toast.error('Failed to update request'); return; }

    // Send notification to client when a delete_meeting_minute request is approved
    if (status === 'approved' && request?.request_type === 'delete_meeting_minute') {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('heirway_admin_notifications').insert({
        title: 'Deletion Request Approved',
        message: `Your request to delete a meeting minute has been approved. You can now delete it from your Meeting Minutes section.`,
        notification_type: 'alert',
        target_client_id: request.client_id,
        created_by: user?.id || '',
        is_active: true,
      });
    }

    toast.success(`Request ${status}`);
    setRequestNotesDialog(null);
    setAdminNotes('');
    loadAllData();
  };

  const handleUpdateSilverGlobal = async () => {
    const price = Number(silverSpotInput);
    if (isNaN(price) || price < 0) { toast.error('Invalid price'); return; }
    // Update each client individually
    const promises = clients.map(c =>
      supabase.from('heirway_clients').update({ silver_spot_price: price } as any).eq('id', c.id)
    );
    const results = await Promise.all(promises);
    const hasError = results.some(r => r.error);
    if (hasError) { toast.error('Failed to update some clients'); return; }
    toast.success(`Silver spot price updated to $${price} for all ${clients.length} clients`);
    loadAllData();
  };

  const handleAddClient = async () => {
    if (!newClient.email || !newClient.state) { toast.error('Email and state required'); return; }
    if (!newClient.full_name) { toast.error('Full name required'); return; }
    setAddingClient(true);
    try {
      const res = await supabase.functions.invoke('admin-create-client', { body: newClient });
      const payload: any = res.data || {};
      if (res.error || payload.ok === false || payload.error) {
        toast.error(payload.error || res.error?.message || 'Failed to create client');
        return;
      }
      setTempPassword('invitation_sent');
      toast.success('Client created — invitation email sent!');
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create client');
    } finally {
      setAddingClient(false);
    }
  };

  // ─── Trust CRUD ─────────────────────────────────────────
  const resetTrustForm = () => setTrustForm({
    trust_name: '', trust_type: 'revocable', creator_name: '', stage: 'assigning_creator', stage_notes: '',
    annual_meeting_date: '',
    trustees: [{ name: '', role: 'Managing Trustee' }],
    beneficiaries: [{ name: '', units: '' }],
  });

  const openAddTrustForClient = (client: HeirwayClient) => {
    setAddTrustClient(client);
    setEditingTrust(null);
    resetTrustForm();
    setAddTrustOpen(true);
  };

  const openEditTrust = (trust: TrustRecord) => {
    setEditingTrust(trust);
    const client = clients.find(c => c.id === trust.client_id);
    setAddTrustClient(client || null);
    setTrustForm({
      trust_name: trust.trust_name,
      trust_type: trust.trust_type || 'revocable',
      creator_name: trust.creator_name || '',
      stage: trust.stage,
      stage_notes: trust.stage_notes || '',
      annual_meeting_date: (trust as any).annual_meeting_date || '',
      trustees: (trust.trustees || []).length > 0
        ? (trust.trustees as any[]).map(t => ({ name: t.name, role: t.role }))
        : [{ name: '', role: 'Managing Trustee' }],
      beneficiaries: (trust.beneficiaries || []).length > 0
        ? (trust.beneficiaries as any[]).map(b => ({ name: b.name, units: b.units_of_interest || '' }))
        : [{ name: '', units: '' }],
    });
    setAddTrustOpen(true);
  };

  const handleSaveTrust = async () => {
    if (!addTrustClient || !trustForm.trust_name.trim()) { toast.error('Trust name is required'); return; }
    if (!trustForm.creator_name.trim()) { toast.error('Creator name is required'); return; }

    const hasBankAccount = trustHasBankAccount(trustForm.trust_type);
    const trusteesClean = trustForm.trustees.filter(t => t.name.trim());
    const beneficiariesClean = trustForm.beneficiaries.filter(b => b.name.trim()).map(b => ({
      name: b.name.trim(),
      units_of_interest: (Number(b.units) || 0).toFixed(2),
    }));

    // Validate total units = 200
    const totalUnits = beneficiariesClean.reduce((sum, b) => sum + Number(b.units_of_interest), 0);
    if (beneficiariesClean.length > 0 && totalUnits !== 200) {
      toast.error(`Total units must equal 200 (currently ${totalUnits})`);
      return;
    }

    const payload: any = {
      client_id: addTrustClient.id,
      user_id: addTrustClient.user_id,
      trust_name: trustForm.trust_name.trim(),
      trust_type: trustForm.trust_type,
      has_bank_account: hasBankAccount,
      stage: trustForm.stage,
      stage_notes: trustForm.stage_notes.trim() || null,
      creator_name: trustForm.creator_name.trim(),
      trustees: trusteesClean,
      beneficiaries: beneficiariesClean,
      annual_meeting_date: trustForm.annual_meeting_date || null,
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
    setAddTrustOpen(false);
    resetTrustForm();
    setEditingTrust(null);
    loadAllData();
  };

  const handleDeleteClient = async (client: HeirwayClient) => {
    setDeletingClientId(client.id);
    try {
      await Promise.all([
        supabase.from('heirway_intake').delete().eq('client_id', client.id),
        supabase.from('heirway_assets').delete().eq('client_id', client.id),
        supabase.from('heirway_documents').delete().eq('client_id', client.id),
        supabase.from('heirway_admin_requests').delete().eq('client_id', client.id),
        supabase.from('heirway_meeting_minutes').delete().eq('client_id', client.id),
        supabase.from('heirway_trust_progress').delete().eq('client_id', client.id),
      ]);
      const { error } = await supabase.from('heirway_clients').delete().eq('id', client.id);
      if (error) { toast.error('Failed to delete client'); return; }
      toast.success(`${client.full_name || client.email || 'Client'} deleted`);
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete client');
    } finally {
      setDeletingClientId(null);
    }
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

  // ─── User vs Client distinction ─────────────────────────
  // Users tab: Free & Essentials (self-serve subscription tiers, no trust package).
  // Clients tab: Steward/Gold subscribers and all trust-package/legacy paying tiers.
  const USER_PLANS = new Set([null, undefined, '', 'free', 'essentials', 'education']);
  const userRecords = clients.filter(c => USER_PLANS.has((c.selected_plan || '') as any) || !c.selected_plan);
  const clientRecords = clients.filter(c => c.selected_plan && !USER_PLANS.has(c.selected_plan as any));



  // ─── CSV Export ─────────────────────────────────────────
  const exportClientsCSV = (records: HeirwayClient[], filename: string) => {
    const headers = ['Name', 'Email', 'Phone', 'State', 'Plan', 'Married', 'Children', 'Real Estate', 'Over $1M', 'Business', 'Employment', 'Created'];
    const rows = records.map(c => [
      c.full_name || '',
      c.email || '',
      c.phone || '',
      c.state,
      c.selected_plan || 'Free',
      c.is_married ? 'Yes' : 'No',
      c.has_children ? 'Yes' : 'No',
      c.owns_real_estate ? 'Yes' : 'No',
      c.over_1m_assets ? 'Yes' : 'No',
      c.business_ownership,
      c.employment_type,
      new Date(c.created_at).toLocaleDateString(),
    ]);
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${records.length} records`);
  };

  // ─── Stats ──────────────────────────────────────────────
  // Calculate silver value across all clients (silver spot price * number of trusts per client)
  const totalSilverValue = clients.reduce((sum: number, c: any) => {
    const clientTrustCount = trusts.filter(t => t.client_id === c.id).length;
    return sum + ((c.silver_spot_price || 0) * clientTrustCount);
  }, 0);

  const allAssetsTotal = assets.reduce((sum: number, a: any) => sum + (Number(a.estimated_value) || 0), 0) + totalSilverValue;
  const protectedAssetsValue = assets.filter((a: any) => a.entity_type === 'private_trust').reduce((sum: number, a: any) => sum + (Number(a.estimated_value) || 0), 0) + totalSilverValue;
  const exposedValue = allAssetsTotal - protectedAssetsValue;
  const fmtCurrency = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

  const protectedAssetCount = assets.filter((a: any) => a.entity_type === 'private_trust').length + (totalSilverValue > 0 ? clients.filter((c: any) => trusts.some(t => t.client_id === c.id)).length : 0);
  const exposedAssetCount = assets.filter((a: any) => a.entity_type !== 'private_trust').length;

  const trustsInProgress = trusts.filter(t => t.stage !== 'trusts_complete').length;
  const trustsCompleted = trusts.filter(t => t.stage === 'trusts_complete').length;

  const stats = [
    { label: 'Total Users', value: String(userRecords.length), icon: User, sub: 'Free & Essentials' },
    { label: 'Total Clients', value: String(clientRecords.length), icon: Users, sub: 'Steward, Gold & Trust Packages' },
    { label: 'Pending Requests', value: String(pendingRequests.length), icon: ClipboardList },
    { label: 'Trusts In Progress', value: String(trustsInProgress), icon: Shield, sub: `${trustsCompleted} completed` },
    { label: 'Assets Protected', value: fmtCurrency(protectedAssetsValue), icon: DollarSign, sub: `${protectedAssetCount} assets (incl. silver)` },
  ];

  return (
    <AppLayout>
      <div className="min-h-screen gradient-bg">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 p-4 md:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 md:mb-6 animate-fade-in flex-wrap gap-3">
            <div>
              <h1 className="text-xl md:text-2xl font-display font-bold text-foreground">Heirway Admin Console</h1>
              <p className="text-sm text-muted-foreground">Manage clients, requests, trusts, and access</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Silver Spot Price Global Control */}
              <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-muted/30 border border-border/40">
                <Coins className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground whitespace-nowrap">Silver $/oz</span>
                <Input
                  type="number"
                  value={silverSpotInput}
                  onChange={e => setSilverSpotInput(e.target.value)}
                  className="glass-input w-20 h-7 text-xs"
                  placeholder="0.00"
                />
                <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={handleUpdateSilverGlobal}>
                  Set All
                </Button>
              </div>
              <Button onClick={loadAllData} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-1" /> Refresh
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4 md:mb-6 animate-fade-in">
            {stats.map((s, i) => (
              <Card key={i} className="glass-card animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-2xl font-display font-bold text-foreground">{s.value}</p>
                    {'sub' in s && s.sub && <p className="text-xs text-muted-foreground">{s.sub}</p>}
                  </div>
                  <div className="p-2 rounded-lg bg-primary/10">
                    <s.icon className="w-5 h-5 text-primary" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Main Tabs */}
          <Tabs defaultValue="users" className="animate-fade-in">
            <div className="mb-6 space-y-3">
              {/* People */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">People</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <TabsList className="w-full justify-start h-auto gap-1 bg-transparent p-0 flex-wrap">
                <TabsTrigger value="users" className="gap-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 rounded-lg"><User className="w-3.5 h-3.5" /> Users <Badge variant="outline" className="ml-1 text-[9px] px-1">{userRecords.length}</Badge></TabsTrigger>
                
                <TabsTrigger value="clients" className="gap-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 rounded-lg"><Users className="w-3.5 h-3.5" /> Clients <Badge variant="outline" className="ml-1 text-[9px] px-1">{clientRecords.length}</Badge></TabsTrigger>
                <TabsTrigger value="requests" className="gap-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 rounded-lg"><ClipboardList className="w-3.5 h-3.5" /> Requests {pendingRequests.length > 0 && <Badge variant="destructive" className="ml-1 text-[10px] px-1.5">{pendingRequests.length}</Badge>}</TabsTrigger>
                <TabsTrigger value="trusts" className="gap-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 rounded-lg"><Shield className="w-3.5 h-3.5" /> Trusts In Progress</TabsTrigger>
                <TabsTrigger value="completed" className="gap-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 rounded-lg"><Check className="w-3.5 h-3.5" /> Completed</TabsTrigger>
                <TabsTrigger value="creators" className="gap-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 rounded-lg"><Crown className="w-3.5 h-3.5" /> Creators</TabsTrigger>
              </TabsList>

              {/* Content Management */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Content</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <TabsList className="w-full justify-start h-auto gap-1 bg-transparent p-0 flex-wrap">
                <TabsTrigger value="learning" className="gap-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 rounded-lg"><BookOpen className="w-3.5 h-3.5" /> Learning</TabsTrigger>
                <TabsTrigger value="knowledgebase" className="gap-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 rounded-lg"><BookOpen className="w-3.5 h-3.5" /> Knowledge Base</TabsTrigger>
                <TabsTrigger value="plan_config" className="gap-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 rounded-lg"><Settings2 className="w-3.5 h-3.5" /> Plan Config</TabsTrigger>
                <TabsTrigger value="intake_videos" className="gap-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 rounded-lg"><Video className="w-3.5 h-3.5" /> Intake Videos</TabsTrigger>
                <TabsTrigger value="notifications" className="gap-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 rounded-lg"><Bell className="w-3.5 h-3.5" /> Notifications</TabsTrigger>
              </TabsList>

              {/* System */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">System</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <TabsList className="w-full justify-start h-auto gap-1 bg-transparent p-0 flex-wrap">
                <TabsTrigger value="analytics" className="gap-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 rounded-lg"><BarChart3 className="w-3.5 h-3.5" /> Analytics</TabsTrigger>
                <TabsTrigger value="consent_log" className="gap-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 rounded-lg"><FileText className="w-3.5 h-3.5" /> Consent Log</TabsTrigger>
                <TabsTrigger value="contact_messages" className="gap-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 rounded-lg"><Send className="w-3.5 h-3.5" /> Contact Inbox</TabsTrigger>
                <TabsTrigger value="admin_users" className="gap-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 rounded-lg"><Settings className="w-3.5 h-3.5" /> Admin Users</TabsTrigger>
              </TabsList>
            </div>

            {/* ═══ USERS TAB (Free & Essentials) ═══ */}
            <TabsContent value="users">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users by name, email, state..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-10 glass-input"
                  />
                </div>
                <Button onClick={() => exportClientsCSV(userRecords, 'heirway_users')} size="sm" variant="outline">
                  <Download className="w-4 h-4 mr-1" /> Export
                </Button>
                <Button onClick={() => { setAddClientOpen(true); setTempPassword(null); setNewClient({ email: '', full_name: '', phone: '', state: '', selected_plan: 'free', is_married: false, has_children: false, owns_real_estate: false, over_1m_assets: false, business_ownership: 'none', employment_type: 'w2' }); }} size="sm">
                  <Plus className="w-4 h-4 mr-1" /> Add User
                </Button>
              </div>

              <div className="space-y-2">
                {userRecords.filter(c => {
                  const q = searchQuery.toLowerCase();
                  return !q ||
                    (c.full_name || '').toLowerCase().includes(q) ||
                    (c.email || '').toLowerCase().includes(q) ||
                    (c.state || '').toLowerCase().includes(q);
                }).map(client => {
                  const assetVal = getClientTotalAssetValue(client.id);
                  return (
                    <div
                      key={client.id}
                      className="glass-panel p-4 hover:border-primary/20 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/admin/heirway/client/${client.id}`)}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="w-10 h-10 border border-border/40">
                            {(client as any).avatar_url ? (
                              <AvatarImage src={(client as any).avatar_url} alt={client.full_name || ''} />
                            ) : null}
                            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold">
                              {(client.full_name || client.email || '?').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{client.full_name || client.email || 'Unnamed'}</p>
                            <p className="text-xs text-muted-foreground">{client.email} · {client.state}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap" onClick={e => e.stopPropagation()}>
                          <Badge variant="outline" className={`text-[10px] ${planBadgeColor(client.selected_plan)}`}>
                            {planLabel(client.selected_plan)}
                          </Badge>
                          {assetVal > 0 && (
                            <Badge variant="outline" className="text-[10px]">
                              ${(assetVal / 1000).toFixed(0)}k assets
                            </Badge>
                          )}
                          <Button size="sm" variant="outline" onClick={() => navigate(`/admin/heirway/client/${client.id}`)}>
                            <ExternalLink className="w-3.5 h-3.5 mr-1" /> Open
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete <strong>{client.full_name || client.email || 'this user'}</strong> and all their associated data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => handleDeleteClient(client)}
                                  disabled={deletingClientId === client.id}
                                >
                                  {deletingClientId === client.id ? 'Deleting...' : 'Delete'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {userRecords.length === 0 && (
                  <div className="text-center py-12">
                    <User className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No users found.</p>
                  </div>
                )}
              </div>
            </TabsContent>


            {/* ═══ CLIENTS TAB (Steward, Gold, Trust Package holders) ═══ */}
            <TabsContent value="clients">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search clients by name, email, state, or plan..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-10 glass-input"
                  />
                </div>
                <Button onClick={() => exportClientsCSV(clientRecords, 'heirway_clients')} size="sm" variant="outline">
                  <Download className="w-4 h-4 mr-1" /> Export
                </Button>
                <Button onClick={() => { setAddClientOpen(true); setTempPassword(null); setNewClient({ email: '', full_name: '', phone: '', state: '', selected_plan: 'steward', is_married: false, has_children: false, owns_real_estate: false, over_1m_assets: false, business_ownership: 'none', employment_type: 'w2' }); }} size="sm">
                  <Plus className="w-4 h-4 mr-1" /> Add Client
                </Button>
              </div>

              <div className="space-y-2">
                {clientRecords.filter(c => {
                  const q = searchQuery.toLowerCase();
                  return !q ||
                    (c.full_name || '').toLowerCase().includes(q) ||
                    (c.email || '').toLowerCase().includes(q) ||
                    (c.state || '').toLowerCase().includes(q) ||
                    (c.selected_plan || '').toLowerCase().includes(q);
                }).map(client => {
                  const clientTrusts = getClientTrusts(client.id);
                  const assetVal = getClientTotalAssetValue(client.id);
                  const isCreatorFriendly = (client as any).creator_available;
                  return (
                    <div
                      key={client.id}
                      className="glass-panel p-4 hover:border-primary/20 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/admin/heirway/client/${client.id}`)}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="w-10 h-10 border border-border/40">
                            {(client as any).avatar_url ? (
                              <AvatarImage src={(client as any).avatar_url} alt={client.full_name || ''} />
                            ) : null}
                            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold">
                              {(client.full_name || client.email || '?').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-foreground truncate">{client.full_name || client.email || 'Unnamed'}</p>
                              {isCreatorFriendly && (
                                <Badge variant="outline" className="text-[9px] bg-green-500/10 text-green-600 border-green-500/20">
                                  <Heart className="w-2.5 h-2.5 mr-0.5" /> Creator Friendly
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{client.email} · {client.state}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap" onClick={e => e.stopPropagation()}>
                          <Badge variant="outline" className={`text-[10px] ${planBadgeColor(client.selected_plan)}`}>
                            {planLabel(client.selected_plan)}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {clientTrusts.length} trust{clientTrusts.length !== 1 ? 's' : ''}
                          </Badge>
                          {assetVal > 0 && (
                            <Badge variant="outline" className="text-[10px]">
                              ${(assetVal / 1000).toFixed(0)}k assets
                            </Badge>
                          )}
                          <Button size="sm" variant="outline" onClick={() => navigate(`/admin/heirway/client/${client.id}`)}>
                            <ExternalLink className="w-3.5 h-3.5 mr-1" /> Open
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setSelectedClient(client); setClientDetailOpen(true); }}>
                            <Eye className="w-3.5 h-3.5 mr-1" /> Quick View
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Client</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete <strong>{client.full_name || client.email || 'this client'}</strong> and all their associated data. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => handleDeleteClient(client)}
                                  disabled={deletingClientId === client.id}
                                >
                                  {deletingClientId === client.id ? 'Deleting...' : 'Delete'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {clientRecords.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No clients found.</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ═══ REQUESTS TAB ═══ */}
            <TabsContent value="requests">
              <div className="space-y-2">
                {requests.length === 0 ? (
                  <div className="text-center py-12">
                    <ClipboardList className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No requests yet.</p>
                  </div>
                ) : requests.map(req => (
                  <div key={req.id} className="glass-panel p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-[10px] font-mono bg-primary/5 border-primary/20 text-primary">TKT-{String(req.ticket_number || 0).padStart(4, '0')}</Badge>
                          <Badge variant="outline" className="text-[10px] capitalize">{req.request_type.replace(/_/g, ' ')}</Badge>
                          <Badge variant="outline" className={`text-[10px] ${
                            req.status === 'pending' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' :
                            req.status === 'approved' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                            'bg-destructive/10 text-destructive border-destructive/20'
                          }`}>
                            {req.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-foreground">{req.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          From: {req.client?.full_name || req.client?.email || 'Unknown'} · {new Date(req.created_at).toLocaleDateString()}
                        </p>
                        {req.admin_notes && (
                          <p className="text-xs text-primary mt-1">Admin: {req.admin_notes}</p>
                        )}
                      </div>
                      {req.status === 'pending' && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="text-green-600" onClick={() => { setRequestNotesDialog(req); setAdminNotes(''); }}>
                            <Check className="w-3.5 h-3.5 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" className="text-destructive" onClick={() => { setRequestNotesDialog(req); setAdminNotes(''); }}>
                            <X className="w-3.5 h-3.5 mr-1" /> Deny
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* ═══ TRUSTS TAB (active only) ═══ */}
            <TabsContent value="trusts">
              <div className="flex justify-end mb-4">
                <Select onValueChange={(clientId) => {
                  const c = clients.find(cl => cl.id === clientId);
                  if (c) openAddTrustForClient(c);
                }}>
                  <SelectTrigger className="w-[250px] h-8 text-xs">
                    <SelectValue placeholder="Add trust for client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">{c.full_name || c.email || 'Unnamed'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                {(() => {
                  const activeTrusts = trusts.filter(t => t.stage !== 'trusts_complete');
                  return activeTrusts.length === 0 ? (
                    <div className="text-center py-12">
                      <Shield className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No active trusts.</p>
                    </div>
                  ) : activeTrusts.map(trust => {
                    const client = clients.find(c => c.id === trust.client_id);
                    const stageIdx = TRUST_STAGES.indexOf(trust.stage);
                    const percent = ((stageIdx + 1) / TRUST_STAGES.length) * 100;
                    return (
                      <div key={trust.id} className="glass-panel p-4">
                        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-[10px] ${getTrustBgClass(trust.trust_type || 'revocable')}`}>
                              {getTrustLabel(trust.trust_type || 'revocable')}
                            </Badge>
                            <div>
                              <p className="text-sm font-semibold text-foreground">{trust.trust_name}</p>
                              <p className="text-xs text-muted-foreground">{client?.full_name || client?.email || 'Unknown client'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {trustHasBankAccount(trust.trust_type || '') && (
                              <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20">
                                <Landmark className="w-2.5 h-2.5 mr-0.5" /> Bank
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-[10px] capitalize">{trust.stage.replace(/_/g, ' ')}</Badge>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEditTrust(trust)}>
                              <Pencil className="w-3 h-3 mr-1" /> Edit
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mb-2 text-xs text-muted-foreground flex-wrap">
                          {trust.creator_name && (
                            <span>Creator: <span className="text-foreground font-medium">{trust.creator_name}</span></span>
                          )}
                          {(trust.trustees || []).length > 0 && (
                            <span>{(trust.trustees as any[]).length} trustee{(trust.trustees as any[]).length > 1 ? 's' : ''}</span>
                          )}
                          {(trust.beneficiaries || []).length > 0 && (
                            <span>{(trust.beneficiaries as any[]).length} beneficiar{(trust.beneficiaries as any[]).length > 1 ? 'ies' : 'y'}</span>
                          )}
                        </div>
                        <Progress value={percent} className="h-1.5" />
                      </div>
                    );
                  });
                })()}
              </div>
            </TabsContent>

            {/* ═══ COMPLETED TRUSTS TAB ═══ */}
            <TabsContent value="completed">
              <div className="space-y-2">
                {(() => {
                  const completedTrusts = trusts.filter(t => t.stage === 'trusts_complete');
                  return completedTrusts.length === 0 ? (
                    <div className="text-center py-12">
                      <Check className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No completed trusts yet.</p>
                    </div>
                  ) : completedTrusts.map(trust => {
                    const client = clients.find(c => c.id === trust.client_id);
                    return (
                      <div key={trust.id} className="glass-panel p-4 border-green-500/20">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                              <Check className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-foreground">{trust.trust_name}</p>
                              <p className="text-xs text-muted-foreground">{client?.full_name || client?.email || 'Unknown client'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-[10px] ${getTrustBgClass(trust.trust_type || 'revocable')}`}>
                              {getTrustLabel(trust.trust_type || 'revocable')}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20">
                              Complete
                            </Badge>
                            {trust.creator_name && (
                              <span className="text-xs text-muted-foreground">Creator: <span className="text-foreground font-medium">{trust.creator_name}</span></span>
                            )}
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEditTrust(trust)}>
                              <Pencil className="w-3 h-3 mr-1" /> Edit
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </TabsContent>

            {/* ═══ CREATORS TAB ═══ */}
            <TabsContent value="creators">
              {(() => {
                // Build unique creators list with their trusts
                const [creatorSearch, setCreatorSearch] = [searchQuery, setSearchQuery];
                const creatorMap = new Map<string, { name: string; trusts: { trust_name: string; trust_type: string; client_name: string; client_id: string }[] }>();
                trusts.forEach(trust => {
                  if (!trust.creator_name) return;
                  const key = trust.creator_name.toLowerCase().trim();
                  const client = clients.find(c => c.id === trust.client_id);
                  if (!creatorMap.has(key)) {
                    creatorMap.set(key, { name: trust.creator_name, trusts: [] });
                  }
                  creatorMap.get(key)!.trusts.push({
                    trust_name: trust.trust_name,
                    trust_type: trust.trust_type,
                    client_name: client?.full_name || client?.email || 'Unknown',
                    client_id: trust.client_id,
                  });
                });
                const creators = Array.from(creatorMap.values());
                const q = creatorSearch.toLowerCase();
                const filtered = q ? creators.filter(c => c.name.toLowerCase().includes(q)) : creators;

                // Creator-friendly volunteers
                const volunteers = clients.filter((c: any) => c.creator_available);
                const filteredVolunteers = q ? volunteers.filter(v => (v.full_name || '').toLowerCase().includes(q) || (v.email || '').toLowerCase().includes(q)) : volunteers;

                return (
                  <div>
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search creators by name..."
                        value={creatorSearch}
                        onChange={e => setCreatorSearch(e.target.value)}
                        className="pl-10 glass-input"
                      />
                    </div>

                    {/* Creator Friendly Volunteers */}
                    {filteredVolunteers.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                          <Heart className="w-4 h-4 text-green-600" /> Creator Friendly Members ({filteredVolunteers.length})
                        </h3>
                        <div className="space-y-2 mb-4">
                          {filteredVolunteers.map(v => (
                            <div key={v.id} className="glass-panel p-3 border-green-500/10 cursor-pointer hover:border-primary/20 transition-colors" onClick={() => navigate(`/admin/heirway/client/${v.id}`)}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Avatar className="w-7 h-7 border border-green-500/20">
                                    {(v as any).avatar_url ? (
                                      <AvatarImage src={(v as any).avatar_url} alt={v.full_name || ''} />
                                    ) : null}
                                    <AvatarFallback className="text-xs bg-green-500/10 text-green-600">
                                      {(v.full_name || '?').charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="text-xs font-semibold text-foreground">{v.full_name || v.email}</p>
                                    <p className="text-[10px] text-muted-foreground">{planLabel(v.selected_plan)} plan · {v.state}</p>
                                  </div>
                                </div>
                                <Badge variant="outline" className="text-[9px] bg-green-500/10 text-green-600 border-green-500/20">
                                  <Heart className="w-2.5 h-2.5 mr-0.5" /> Available
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Trust Creators */}
                    <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                      <Crown className="w-4 h-4 text-primary" /> Trust Creators ({filtered.length})
                    </h3>
                    {filtered.length === 0 && filteredVolunteers.length === 0 ? (
                      <div className="text-center py-12">
                        <Crown className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">
                          {q ? 'No creators match your search.' : 'No creators found in any trusts.'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filtered.map(creator => (
                          <div key={creator.name} className="glass-panel p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Crown className="w-4 h-4 text-primary" />
                                <p className="text-sm font-bold text-foreground">{creator.name}</p>
                              </div>
                              <Badge variant="outline" className="text-[10px]">
                                {creator.trusts.length} trust{creator.trusts.length !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                            <div className="space-y-1.5">
                              {creator.trusts.map((t, i) => (
                                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/40">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className={`text-[9px] ${getTrustBgClass(t.trust_type)}`}>
                                      {getTrustLabel(t.trust_type)}
                                    </Badge>
                                    <span className="text-xs text-foreground">{t.trust_name}</span>
                                  </div>
                                  <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => navigate(`/admin/heirway/client/${t.client_id}`)}>
                                    {t.client_name} →
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </TabsContent>

            {/* ═══ NOTIFICATIONS TAB ═══ */}
            <TabsContent value="notifications">
              <div className="flex justify-end mb-4">
                <Button size="sm" onClick={() => { setNotifDialogOpen(true); setNotifForm({ title: '', message: '', target_client_id: '', target_plans: [], expires_at: '' }); setNotifTargetMode('all'); setClientSearch(''); }}>
                  <Send className="w-3.5 h-3.5 mr-1" /> Push Notification
                </Button>
              </div>

              <div className="space-y-2">
                {notifications.length === 0 ? (
                  <div className="text-center py-12">
                    <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No notifications sent yet.</p>
                  </div>
                ) : notifications.map((n: any) => {
                  const targetClient = n.target_client_id ? clients.find(c => c.id === n.target_client_id) : null;
                  return (
                    <div key={n.id} className="glass-panel p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold text-foreground">{n.title}</p>
                            {n.is_active ? (
                              <Badge variant="outline" className="text-[9px] bg-green-500/10 text-green-600 border-green-500/20">Active</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[9px]">Inactive</Badge>
                            )}
                          </div>
                          {n.message && <p className="text-xs text-muted-foreground">{n.message}</p>}
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                            <span>{new Date(n.created_at).toLocaleDateString()}</span>
                            {targetClient && <span>→ {targetClient.full_name || targetClient.email}</span>}
                            {n.target_plans && n.target_plans.length > 0 && <span>→ Plans: {n.target_plans.map((p: string) => p.replace('_', ' ')).join(', ')}</span>}
                            {!n.target_client_id && (!n.target_plans || n.target_plans.length === 0) && <span>→ All Clients</span>}
                            {n.expires_at && <span>Expires: {new Date(n.expires_at).toLocaleDateString()}</span>}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={async () => {
                            await supabase.from('heirway_admin_notifications' as any).update({ is_active: !n.is_active } as any).eq('id', n.id);
                            toast.success(n.is_active ? 'Notification deactivated' : 'Notification reactivated');
                            loadAllData();
                          }}>
                            {n.is_active ? 'Deactivate' : 'Reactivate'}
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs text-destructive hover:bg-destructive/10" onClick={async () => {
                            await supabase.from('heirway_admin_notifications' as any).delete().eq('id', n.id);
                            toast.success('Notification deleted');
                            loadAllData();
                          }}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* ═══ LEARNING TAB ═══ */}
            <TabsContent value="learning">
              <LearningContentManager clients={clients.map(c => ({ id: c.id, user_id: c.user_id, full_name: c.full_name }))} />
            </TabsContent>

            {/* ═══ PLAN CONFIG TAB ═══ */}
            <TabsContent value="plan_config" className="space-y-8">
              <PlanConfigurationManager />
              <PlanEntitlementEditor />
              <PlanPricesViewer />
            </TabsContent>

            {/* ═══ INTAKE VIDEOS TAB ═══ */}
            <TabsContent value="intake_videos">
              <IntakeVideoManager />
            </TabsContent>

            {/* ═══ KNOWLEDGEBASE TAB ═══ */}
            <TabsContent value="knowledgebase">
              <KnowledgebaseManager />
            </TabsContent>

            {/* ═══ ANALYTICS TAB ═══ */}
            <TabsContent value="analytics">
              <UserBehaviorAnalytics />
            </TabsContent>

            {/* ═══ CONSENT LOG TAB ═══ */}
            <TabsContent value="consent_log">
              <ConsentLogViewer />
            </TabsContent>

            <TabsContent value="contact_messages">
              <ContactMessagesViewer />
            </TabsContent>

            {/* ═══ ADMIN USERS TAB ═══ */}
            <TabsContent value="admin_users">
              <AdminUsersManager />
            </TabsContent>

          </Tabs>
        </div>
      </div>

      {/* ═══ CLIENT DETAIL DIALOG ═══ */}
      {selectedClient && (
        <Dialog open={clientDetailOpen} onOpenChange={setClientDetailOpen}>
          <DialogContent className="glass-panel border-primary/20 max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                {selectedClient.full_name || selectedClient.email}
              </DialogTitle>
              <DialogDescription>Client profile and management</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Profile Info */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Email', value: selectedClient.email },
                  { label: 'Phone', value: selectedClient.phone || 'N/A' },
                  { label: 'State', value: selectedClient.state },
                  { label: 'Plan', value: planLabel(selectedClient.selected_plan) },
                  { label: 'Married', value: selectedClient.is_married ? 'Yes' : 'No' },
                  { label: 'Children', value: selectedClient.has_children ? 'Yes' : 'No' },
                  { label: 'Real Estate', value: selectedClient.owns_real_estate ? 'Yes' : 'No' },
                  { label: 'Over $1M Assets', value: selectedClient.over_1m_assets ? 'Yes' : 'No' },
                  { label: 'Business', value: selectedClient.business_ownership === 'none' ? 'None' : selectedClient.business_ownership },
                  { label: 'Employment', value: selectedClient.employment_type },
                  { label: 'Joined', value: new Date(selectedClient.created_at).toLocaleDateString() },
                  { label: 'Recommended Plan', value: selectedClient.recommended_plan },
                ].map((item, i) => (
                  <div key={i} className="p-2 rounded-lg bg-muted/30 border border-border/40">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
                    <p className="text-sm font-medium text-foreground capitalize">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Plan Management */}
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-foreground">Plan Management</p>
                </div>
                <div className="flex items-center gap-2">
                  <Select defaultValue={selectedClient.selected_plan || 'free'} onValueChange={(val) => handleUpdatePlan(selectedClient.id, val)}>
                    <SelectTrigger className="w-[180px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {withCurrentPlanOption(assignmentOptions, selectedClient.selected_plan, catalog).map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Miro Board URL */}
              <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
                <Label className="text-xs">Miro Board URL</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    defaultValue={selectedClient.miro_board_url || ''}
                    placeholder="https://miro.com/app/board/..."
                    className="glass-input text-xs h-8"
                    id={`miro-${selectedClient.id}`}
                  />
                  <Button size="sm" variant="outline" className="h-8" onClick={() => {
                    const input = document.getElementById(`miro-${selectedClient.id}`) as HTMLInputElement;
                    handleUpdateMiroUrl(selectedClient.id, input.value);
                  }}>
                    Save
                  </Button>
                </div>
              </div>

              {/* Trusts */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-foreground">Trusts ({getClientTrusts(selectedClient.id).length})</p>
                  <Button size="sm" variant="outline" onClick={() => openAddTrustForClient(selectedClient)}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Trust
                  </Button>
                </div>
                {getClientTrusts(selectedClient.id).map(trust => (
                  <div key={trust.id} className="p-2 rounded-lg bg-muted/30 border border-border/40 mb-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[9px] ${getTrustBgClass(trust.trust_type || 'revocable')}`}>
                          {getTrustLabel(trust.trust_type || 'revocable')}
                        </Badge>
                        <p className="text-xs font-medium text-foreground">{trust.trust_name}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-[10px] capitalize">{trust.stage.replace(/_/g, ' ')}</Badge>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => openEditTrust(trust)}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {getClientTrusts(selectedClient.id).length === 0 && (
                  <p className="text-xs text-muted-foreground">No trusts yet.</p>
                )}
              </div>

              {/* Assets */}
              <div>
                <p className="text-sm font-semibold text-foreground mb-2">
                  Assets ({getClientAssets(selectedClient.id).length}) · Total: ${getClientTotalAssetValue(selectedClient.id).toLocaleString()}
                </p>
                <div className="space-y-1">
                  {getClientAssets(selectedClient.id).map((asset: any) => (
                    <div key={asset.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/40">
                      <div>
                        <p className="text-xs font-medium text-foreground">{asset.name}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{asset.asset_type} · {asset.entity_type !== 'none' ? asset.entity_type : 'No entity'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-foreground">${(asset.estimated_value || 0).toLocaleString()}</p>
                        {asset.in_private_trust ? (
                          <Badge variant="outline" className="text-[9px] bg-green-500/10 text-green-600 border-green-500/20">Protected</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] bg-destructive/10 text-destructive border-destructive/20">At Risk</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  {getClientAssets(selectedClient.id).length === 0 && (
                    <p className="text-xs text-muted-foreground">No assets tracked.</p>
                  )}
                </div>
              </div>

              {/* Intake Data */}
              {(() => {
                const intake = getClientIntake(selectedClient.id);
                if (!intake) return <p className="text-xs text-muted-foreground">No intake data submitted.</p>;
                return (
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">Intake Data</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Name', value: `${intake.first_name || ''} ${intake.last_name || ''}`.trim() || 'N/A' },
                        { label: 'DOB', value: intake.date_of_birth || 'N/A' },
                        { label: 'Phone', value: intake.mobile_phone || 'N/A' },
                        { label: 'Spouse', value: intake.spouse_full_name || 'N/A' },
                        { label: 'Trust Name', value: intake.trust_name || 'N/A' },
                        { label: 'Trust State', value: intake.trust_domicile_state || 'N/A' },
                        { label: 'Income', value: intake.estimated_current_income ? `$${intake.estimated_current_income.toLocaleString()}` : 'N/A' },
                        { label: 'Completed', value: intake.completed ? 'Yes' : 'No' },
                      ].map((item, i) => (
                        <div key={i} className="p-2 rounded bg-muted/20 border border-border/30">
                          <p className="text-[10px] text-muted-foreground uppercase">{item.label}</p>
                          <p className="text-xs font-medium text-foreground">{item.value}</p>
                        </div>
                      ))}
                    </div>
                    {intake.trustees && (intake.trustees as any[]).length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-semibold text-foreground mb-1">Trustees</p>
                        {(intake.trustees as any[]).map((t: any, i: number) => (
                          <p key={i} className="text-xs text-muted-foreground">{t.name || t.full_name || JSON.stringify(t)}</p>
                        ))}
                      </div>
                    )}
                    {intake.beneficiaries && (intake.beneficiaries as any[]).length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-semibold text-foreground mb-1">Beneficiaries</p>
                        {(intake.beneficiaries as any[]).map((b: any, i: number) => (
                          <p key={i} className="text-xs text-muted-foreground">{b.name || b.full_name || JSON.stringify(b)}</p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Client Requests */}
              <div>
                <p className="text-sm font-semibold text-foreground mb-2">Requests ({getClientRequests(selectedClient.id).length})</p>
                {getClientRequests(selectedClient.id).map(req => (
                  <div key={req.id} className="p-2 rounded-lg bg-muted/30 border border-border/40 mb-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-mono text-primary">TKT-{String(req.ticket_number || 0).padStart(4, '0')}</span>
                          <p className="text-xs font-medium text-foreground capitalize">{req.request_type.replace(/_/g, ' ')}</p>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{req.description}</p>
                      </div>
                      <Badge variant="outline" className={`text-[9px] ${
                        req.status === 'pending' ? 'bg-yellow-500/10 text-yellow-600' :
                        req.status === 'approved' ? 'bg-green-500/10 text-green-600' :
                        'bg-destructive/10 text-destructive'
                      }`}>{req.status}</Badge>
                    </div>
                  </div>
                ))}
                {getClientRequests(selectedClient.id).length === 0 && (
                  <p className="text-xs text-muted-foreground">No requests.</p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ═══ REQUEST NOTES DIALOG ═══ */}
      {requestNotesDialog && (
        <Dialog open={!!requestNotesDialog} onOpenChange={() => setRequestNotesDialog(null)}>
          <DialogContent className="glass-panel border-primary/20 max-w-sm">
            <DialogHeader>
              <DialogTitle>Review Request</DialogTitle>
              <DialogDescription>TKT-{String(requestNotesDialog.ticket_number || 0).padStart(4, '0')} · {requestNotesDialog.request_type.replace(/_/g, ' ')} — {requestNotesDialog.description}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Admin Notes (optional)</Label>
                <Textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} placeholder="Notes for the client..." className="glass-input mt-1" />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" variant="outline" onClick={() => handleRequestAction(requestNotesDialog.id, 'approved')}>
                  <Check className="w-4 h-4 mr-1" /> Approve
                </Button>
                <Button className="flex-1" variant="destructive" onClick={() => handleRequestAction(requestNotesDialog.id, 'denied')}>
                  <X className="w-4 h-4 mr-1" /> Deny
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ═══ PUSH NOTIFICATION DIALOG ═══ */}
      <Dialog open={notifDialogOpen} onOpenChange={setNotifDialogOpen}>
        <DialogContent className="glass-panel border-primary/20 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Send className="w-5 h-5 text-primary" /> Push Notification</DialogTitle>
            <DialogDescription>Send a reminder or notice to clients. Shows as a banner on their dashboard.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Title *</Label>
              <Input className="glass-input mt-1 h-8 text-xs" value={notifForm.title}
                onChange={e => setNotifForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Annual Meeting Reminder" />
            </div>
            <div>
              <Label className="text-xs">Message</Label>
              <Textarea className="glass-input mt-1 text-xs" value={notifForm.message}
                onChange={e => setNotifForm(p => ({ ...p, message: e.target.value }))} placeholder="Details..." />
            </div>
            <div>
              <Label className="text-xs">Target</Label>
              <div className="flex gap-2 mt-1">
                {(['all', 'plans', 'individual'] as const).map(mode => (
                  <Button key={mode} type="button" size="sm" variant={notifTargetMode === mode ? 'default' : 'outline'} className="h-7 text-xs capitalize"
                    onClick={() => { setNotifTargetMode(mode); setNotifForm(p => ({ ...p, target_client_id: '', target_plans: [] })); setClientSearch(''); }}>
                    {mode === 'all' ? 'All Clients' : mode === 'plans' ? 'By Plan' : 'Individual'}
                  </Button>
                ))}
              </div>

              {notifTargetMode === 'plans' && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {['essentials', 'steward', 'gold', 'education', 'foundation', 'business', 'wealth_builder'].map(plan => (
                    <label key={plan} className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input type="checkbox" className="rounded border-border"
                        checked={notifForm.target_plans.includes(plan)}
                        onChange={e => {
                          setNotifForm(p => ({
                            ...p,
                            target_plans: e.target.checked ? [...p.target_plans, plan] : p.target_plans.filter(tp => tp !== plan),
                          }));
                        }} />
                      <span>{planLabel(plan)}</span>
                    </label>
                  ))}
                </div>
              )}

              {notifTargetMode === 'individual' && (
                <div className="mt-2 space-y-1">
                  <Input className="glass-input h-8 text-xs" placeholder="Search clients..." value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)} />
                  <div className="max-h-32 overflow-y-auto border border-border/40 rounded-md">
                    {clients
                      .filter(c => {
                        const q = clientSearch.toLowerCase();
                        return !q || (c.full_name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q);
                      })
                      .map(c => (
                        <button key={c.id} type="button"
                          className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 transition-colors ${notifForm.target_client_id === c.id ? 'bg-primary/10 text-primary font-medium' : 'text-foreground'}`}
                          onClick={() => setNotifForm(p => ({ ...p, target_client_id: c.id }))}>
                          {c.full_name || c.email || 'Unnamed'}
                          {c.selected_plan && <span className="ml-1 text-muted-foreground">({planLabel(c.selected_plan)})</span>}
                        </button>
                      ))}
                    {clients.filter(c => {
                      const q = clientSearch.toLowerCase();
                      return !q || (c.full_name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q);
                    }).length === 0 && (
                      <p className="px-3 py-2 text-xs text-muted-foreground">No clients found</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs">Expires (optional)</Label>
              <Input type="date" className="glass-input mt-1 h-8 text-xs" value={notifForm.expires_at}
                onChange={e => setNotifForm(p => ({ ...p, expires_at: e.target.value }))} />
            </div>
            <Button className="w-full" onClick={async () => {
              if (!notifForm.title.trim()) { toast.error('Title is required'); return; }
              if (notifTargetMode === 'plans' && notifForm.target_plans.length === 0) { toast.error('Select at least one plan'); return; }
              if (notifTargetMode === 'individual' && !notifForm.target_client_id) { toast.error('Select a client'); return; }
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) { toast.error('Not authenticated'); return; }
              const payload: any = {
                title: notifForm.title.trim(),
                message: notifForm.message.trim(),
                created_by: user.id,
                target_client_id: notifTargetMode === 'individual' ? notifForm.target_client_id : null,
                target_plans: notifTargetMode === 'plans' ? notifForm.target_plans : null,
                expires_at: notifForm.expires_at || null,
              };
              const { error } = await supabase.from('heirway_admin_notifications' as any).insert(payload as any);
              if (error) { toast.error('Failed to send notification'); return; }
              toast.success('Notification sent');
              setNotifDialogOpen(false);
              loadAllData();
            }}>
              <Send className="w-4 h-4 mr-1" /> Send Notification
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ ADD CLIENT DIALOG ═══ */}
      <Dialog open={addClientOpen} onOpenChange={setAddClientOpen}>
        <DialogContent className="glass-panel border-primary/20 max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" /> Add New Client
            </DialogTitle>
            <DialogDescription>Create a new user account and client profile.</DialogDescription>
          </DialogHeader>

          {tempPassword ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-sm font-semibold text-foreground mb-1">✓ Client Created Successfully</p>
                <p className="text-xs text-muted-foreground mb-3">An invitation email has been sent to:</p>
                <div className="p-2 rounded bg-muted/30 border border-border/40">
                  <p className="text-[10px] text-muted-foreground uppercase">Email</p>
                  <p className="text-sm font-mono text-foreground">{newClient.email}</p>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">The client will receive an email with a link to set up their password and access the portal.</p>
              </div>
              <Button className="w-full" onClick={() => setAddClientOpen(false)}>Done</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Full Name *</Label>
                  <Input className="glass-input mt-1 h-8 text-xs" value={newClient.full_name} onChange={e => setNewClient(p => ({ ...p, full_name: e.target.value }))} placeholder="John Smith" />
                </div>
                <div>
                  <Label className="text-xs">Email *</Label>
                  <Input type="email" className="glass-input mt-1 h-8 text-xs" value={newClient.email} onChange={e => setNewClient(p => ({ ...p, email: e.target.value }))} placeholder="john@example.com" />
                </div>
                <div>
                  <Label className="text-xs">Phone</Label>
                  <Input type="tel" className="glass-input mt-1 h-8 text-xs" value={newClient.phone} onChange={e => setNewClient(p => ({ ...p, phone: e.target.value }))} placeholder="(555) 123-4567" />
                </div>
                <div>
                  <Label className="text-xs">State *</Label>
                  <Input className="glass-input mt-1 h-8 text-xs" value={newClient.state} onChange={e => setNewClient(p => ({ ...p, state: e.target.value }))} placeholder="CA" maxLength={2} />
                </div>
              </div>

              <div>
                <Label className="text-xs">Subscription Plan</Label>
                <Select value={newClient.selected_plan} onValueChange={val => setNewClient(p => ({ ...p, selected_plan: val }))}>
                  <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {assignmentOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Employment Type</Label>
                <Select value={newClient.employment_type} onValueChange={val => setNewClient(p => ({ ...p, employment_type: val }))}>
                  <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="w2" className="text-xs">W-2 Employee</SelectItem>
                    <SelectItem value="1099" className="text-xs">1099 / Self-Employed</SelectItem>
                    <SelectItem value="business_owner" className="text-xs">Business Owner</SelectItem>
                    <SelectItem value="retired" className="text-xs">Retired</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Business Ownership</Label>
                <Select value={newClient.business_ownership} onValueChange={val => setNewClient(p => ({ ...p, business_ownership: val }))}>
                  <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">None</SelectItem>
                    <SelectItem value="sole_prop" className="text-xs">Sole Proprietorship</SelectItem>
                    <SelectItem value="llc" className="text-xs">LLC</SelectItem>
                    <SelectItem value="s_corp" className="text-xs">S-Corp</SelectItem>
                    <SelectItem value="c_corp" className="text-xs">C-Corp</SelectItem>
                    <SelectItem value="partnership" className="text-xs">Partnership</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'is_married', label: 'Married' },
                  { key: 'has_children', label: 'Has Children' },
                  { key: 'owns_real_estate', label: 'Owns Real Estate' },
                  { key: 'over_1m_assets', label: 'Over $1M Assets' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/40">
                    <Label className="text-xs">{item.label}</Label>
                    <Switch
                      checked={(newClient as any)[item.key]}
                      onCheckedChange={val => setNewClient(p => ({ ...p, [item.key]: val }))}
                    />
                  </div>
                ))}
              </div>

              <Button className="w-full" onClick={handleAddClient} disabled={addingClient}>
                {addingClient ? <><RefreshCw className="w-4 h-4 mr-1 animate-spin" /> Creating...</> : <><Plus className="w-4 h-4 mr-1" /> Create Client</>}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══ ADD/EDIT TRUST DIALOG ═══ */}
      <Dialog open={addTrustOpen} onOpenChange={setAddTrustOpen}>
        <DialogContent className="glass-panel border-primary/20 max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" /> {editingTrust ? 'Edit Trust' : 'Add Trust'}
            </DialogTitle>
            <DialogDescription>
              {editingTrust ? `Editing ${editingTrust.trust_name}` : `Create a trust for ${addTrustClient?.full_name || addTrustClient?.email || 'client'}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Trust Name *</Label>
                <Input
                  className="glass-input mt-1 h-8 text-xs"
                  value={trustForm.trust_name}
                  onChange={e => setTrustForm(p => ({ ...p, trust_name: e.target.value }))}
                  placeholder="e.g. Thompson Family Trust"
                />
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
            </div>

            {/* Progress Stage */}
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
                <Input
                  className="glass-input mt-1 h-8 text-xs"
                  value={trustForm.stage_notes}
                  onChange={e => setTrustForm(p => ({ ...p, stage_notes: e.target.value }))}
                  placeholder="Optional notes..."
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Annual Meeting Date</Label>
              <Input type="date" className="glass-input mt-1 h-8 text-xs" value={trustForm.annual_meeting_date}
                onChange={e => setTrustForm(p => ({ ...p, annual_meeting_date: e.target.value }))} />
              <p className="text-[10px] text-muted-foreground mt-1">Sets annual meeting minute reminder for foundation+ clients</p>
            </div>

            {trustHasBankAccount(trustForm.trust_type) && (
              <div className="p-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
                <p className="text-xs text-blue-600 flex items-center gap-1">
                  <Landmark className="w-3.5 h-3.5" /> This trust type includes a bank account
                </p>
              </div>
            )}

            {/* Creator */}
            <div>
              <Label className="text-xs">Creator (Grantor/Settlor) *</Label>
              <Input
                className="glass-input mt-1 h-8 text-xs"
                value={trustForm.creator_name}
                onChange={e => setTrustForm(p => ({ ...p, creator_name: e.target.value }))}
                placeholder="Full name of trust creator"
              />
            </div>

            {/* Trustees */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs">Trustees</Label>
                <Button type="button" size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() =>
                  setTrustForm(p => ({ ...p, trustees: [...p.trustees, { name: '', role: 'Trustee' }] }))
                }>
                  <Plus className="w-3 h-3 mr-0.5" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {trustForm.trustees.map((t, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      className="glass-input h-7 text-xs flex-1"
                      value={t.name}
                      onChange={e => {
                        const updated = [...trustForm.trustees];
                        updated[i] = { ...updated[i], name: e.target.value };
                        setTrustForm(p => ({ ...p, trustees: updated }));
                      }}
                      placeholder="Trustee name"
                    />
                    <Select value={t.role} onValueChange={val => {
                      const updated = [...trustForm.trustees];
                      updated[i] = { ...updated[i], role: val };
                      setTrustForm(p => ({ ...p, trustees: updated }));
                    }}>
                      <SelectTrigger className="w-[160px] h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Managing Trustee" className="text-xs">Managing Trustee</SelectItem>
                        <SelectItem value="Trustee" className="text-xs">Trustee</SelectItem>
                        <SelectItem value="Successor Trustee" className="text-xs">Successor Trustee</SelectItem>
                      </SelectContent>
                    </Select>
                    {trustForm.trustees.length > 1 && (
                      <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive/60 hover:text-destructive" onClick={() => {
                        setTrustForm(p => ({ ...p, trustees: p.trustees.filter((_, idx) => idx !== i) }));
                      }}>
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
                <Button type="button" size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() =>
                  setTrustForm(p => ({ ...p, beneficiaries: [...p.beneficiaries, { name: '', units: '' }] }))
                }>
                  <Plus className="w-3 h-3 mr-0.5" /> Add
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mb-2">Total units must equal 200</p>
              <div className="space-y-2">
                {trustForm.beneficiaries.map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      className="glass-input h-7 text-xs flex-1"
                      value={b.name}
                      onChange={e => {
                        const updated = [...trustForm.beneficiaries];
                        updated[i] = { ...updated[i], name: e.target.value };
                        setTrustForm(p => ({ ...p, beneficiaries: updated }));
                      }}
                      placeholder="Beneficiary name"
                    />
                    <Input
                      className="glass-input h-7 text-xs w-[100px]"
                      value={b.units}
                      onChange={e => {
                        const updated = [...trustForm.beneficiaries];
                        updated[i] = { ...updated[i], units: e.target.value };
                        setTrustForm(p => ({ ...p, beneficiaries: updated }));
                      }}
                      placeholder="Units"
                    />
                    {trustForm.beneficiaries.length > 1 && (
                      <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive/60 hover:text-destructive" onClick={() => {
                        setTrustForm(p => ({ ...p, beneficiaries: p.beneficiaries.filter((_, idx) => idx !== i) }));
                      }}>
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              {/* Units total indicator */}
              {(() => {
                const total = trustForm.beneficiaries.filter(b => b.name.trim()).reduce((sum, b) => sum + (Number(b.units) || 0), 0);
                return total > 0 ? (
                  <p className={`text-[11px] mt-1 font-medium ${total === 200 ? 'text-green-600' : 'text-destructive'}`}>
                    Total: {total} / 200 units {total === 200 ? '✓' : `(${200 - total} remaining)`}
                  </p>
                ) : null;
              })()}
            </div>

            <Button className="w-full" onClick={handleSaveTrust}>
              {editingTrust ? (
                <><Pencil className="w-4 h-4 mr-1" /> Update Trust</>
              ) : (
                <><Plus className="w-4 h-4 mr-1" /> Create Trust</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}