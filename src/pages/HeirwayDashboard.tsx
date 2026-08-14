import { useEffect, useState, useCallback } from 'react';
import { HeirwayLayout } from '@/components/heirway/HeirwayLayout';
import PaymentGate from '@/components/heirway/PaymentGate';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { GoldHeaderCard } from '@/components/ui/gold-header-card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { HEIRWAY_PLANS } from '@/lib/heirwayPlans';
import { useClientProfile, type ClientTier } from '@/hooks/useClientProfile';
import AssetTracker from '@/components/heirway/dashboard/AssetTracker';
import TrustProgress from '@/components/heirway/dashboard/TrustProgress';
import MeetingMinutes from '@/components/heirway/dashboard/MeetingMinutes';
import AdminRequests from '@/components/heirway/dashboard/AdminRequests';
import { NotificationBanner } from '@/components/heirway/dashboard/NotificationBanner';
import { NotificationBell } from '@/components/heirway/dashboard/NotificationBell';
import {
  Shield, Home, Users, Building2, DollarSign, Briefcase, BookOpen, FileText,
  MapPin, Play, ChevronLeft, ChevronRight, CheckCircle, Clock, FileCheck,
  CalendarCheck, TrendingUp, Lock, AlertTriangle, RefreshCw, Coins, Heart, Camera,
  Bell, ShieldOff, X,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Link, useNavigate } from 'react-router-dom';
import { useUpgradeRoute } from '@/hooks/useUpgradeRoute';

const NEXT_STEPS = [
  { icon: FileCheck, title: 'Information Processing', description: 'Information submitted for each trust is processing and a Trust Specialist may reach out directly to verify submitted information.' },
  { icon: CalendarCheck, title: 'Trust Roadmap Preparation', description: 'A Trust Architect will review the trusts data and prepare the trust roadmap.' },
  { icon: Clock, title: 'Onboarding Meeting', description: 'Onboarding meeting will be scheduled.' },
  { icon: FileText, title: 'Trust Templates Processing', description: 'Once the roadmap is complete, your trust templates will begin processing.' },
];

interface AssetRecord {
  id: string;
  name: string;
  asset_type: string;
  estimated_value: number;
  entity_type: string;
  in_private_trust: boolean;
}

interface TrustRecord {
  id: string;
  trust_name: string;
  stage: string;
}

export default function HeirwayDashboard() {
  const navigate = useNavigate();
  const goToUpgrade = useUpgradeRoute();
  const { tier, client: profileClient, user, clientId, loading: profileLoading } = useClientProfile();
  const [client, setClient] = useState<any>(null);
  const [progress, setProgress] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [trusts, setTrusts] = useState<TrustRecord[]>([]);
  const [riskIndex, setRiskIndex] = useState(0);
  const [silverInput, setSilverInput] = useState('');
  const [dbModules, setDbModules] = useState<any[]>([]);
  const [dbLessons, setDbLessons] = useState<any[]>([]);
  const [showProtected, setShowProtected] = useState(false);
  const [showExposed, setShowExposed] = useState(false);
  const [gateResolved, setGateResolved] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  const needsPaymentGate = !profileLoading && profileClient && 
    profileClient.plan_status === 'intake_complete' && 
    profileClient.selected_plan !== 'free';

  useEffect(() => {
    if (profileLoading) return;
    if (!user) return;
    if (needsPaymentGate) return;

    // Auto-create a client record for free users who don't have one yet
    const ensureClientRecord = async () => {
      if (!profileClient) {
        const { data: newClient, error } = await supabase
          .from('heirway_clients')
          .insert({
            user_id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || null,
            state: 'N/A',
            recommended_plan: 'free',
            selected_plan: null,
            plan_status: 'active',
          })
          .select()
          .single();
        if (!error && newClient) {
          setClient(newClient);
        }
      } else {
        setClient(profileClient);
        setSilverInput(String((profileClient as any).silver_spot_price || 0));
      }
      loadUserData(user.id);
    };

    ensureClientRecord();
  }, [profileLoading, user, profileClient, needsPaymentGate]);

  const loadUserData = async (uid: string) => {
    const cid = profileClient?.id;
    const [progressRes, docsRes, assetsRes, trustsRes, modsRes, lessonsRes] = await Promise.all([
      supabase.from('heirway_learning_progress').select('*').eq('user_id', uid),
      supabase.from('heirway_documents').select('*').eq('user_id', uid),
      cid
        ? supabase.from('heirway_assets').select('*').eq('client_id', cid)
        : supabase.from('heirway_assets').select('*').eq('user_id', uid),
      cid
        ? supabase.from('heirway_trust_progress').select('*').eq('client_id', cid)
        : supabase.from('heirway_trust_progress').select('*').eq('user_id', uid),
      supabase.from('heirway_learning_modules' as any).select('*').eq('is_active', true).order('sort_order'),
      supabase.from('heirway_learning_content' as any).select('*').eq('is_active', true).order('sort_order'),
    ]);
    setProgress(progressRes.data || []);
    setDocuments(docsRes.data || []);
    setAssets((assetsRes.data as any[]) || []);
    setTrusts((trustsRes.data as any[]) || []);
    setDbModules((modsRes.data as any[]) || []);
    setDbLessons((lessonsRes.data as any[]) || []);
    setDataLoaded(true);
  };

  const plan = client?.selected_plan ? HEIRWAY_PLANS[client.selected_plan] : null;
  const effectiveTier: ClientTier = tier;
  const isTrustTier = effectiveTier === 'trust';
  const isEducationTier = effectiveTier === 'education';
  const isFreeTier = effectiveTier === 'free';

  // Learning progress from dynamic modules
  const totalLessons = dbLessons.length;
  const completedLessons = progress.filter(p => p.completed).length;
  const learningPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const displayName = user?.user_metadata?.full_name?.split(' ')[0] || client?.full_name?.split(' ')[0] || 'there';

  // ─── Real data from assets ─────────────────────────────
  const silverSpotPrice = (client as any)?.silver_spot_price || 0;
  const silverTotalValue = silverSpotPrice * trusts.length;
  const totalAssetValue = assets.reduce((sum, a) => sum + (Number(a.estimated_value) || 0), 0) + silverTotalValue;
  const protectedAssets = assets.filter(a => a.entity_type === 'private_trust');
  const protectedValue = protectedAssets.reduce((sum, a) => sum + (Number(a.estimated_value) || 0), 0) + silverTotalValue;
  const unprotectedAssets = assets.filter(a => a.entity_type !== 'private_trust');
  const protectionPercent = totalAssetValue > 0 ? Math.round((protectedValue / totalAssetValue) * 100) : 0;

  const formatCurrency = (val: number) =>
    val > 0 ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val) : '$0';

  // Is foundation or above?
  const isFoundationPlus = client?.selected_plan === 'foundation' || client?.selected_plan === 'business' || client?.selected_plan === 'wealth_builder';
  const isCreatorAvailable = (client as any)?.creator_available || false;

  // Should show What's Next? Only for foundation+ and trusts not yet in documents_processing stage
  const hasDocumentsProcessing = trusts.some(t => t.stage === 'documents_processing' || t.stage === 'trusts_complete');
  const showWhatsNext = isFoundationPlus && !hasDocumentsProcessing;

  const handlePayItForward = async () => {
    if (!client) return;
    await supabase.from('heirway_clients').update({ creator_available: true } as any).eq('id', client.id);
    await supabase.from('heirway_admin_requests').insert({
      user_id: client.user_id,
      client_id: client.id,
      request_type: 'creator_volunteer',
      description: `${client.full_name || client.email} has volunteered to become a creator for other clients.`,
    } as any);
    toast.success('Thank you! The Heirway team has been notified.');
    if (user) loadUserData(user.id);
    setClient((prev: any) => prev ? { ...prev, creator_available: true } : prev);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !client || !user) return;
    const ext = file.name.split('.').pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (uploadError) { toast.error('Failed to upload photo'); return; }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
    await supabase.from('heirway_clients').update({ avatar_url: publicUrl } as any).eq('id', client.id);
    toast.success('Profile photo updated');
    setClient((prev: any) => prev ? { ...prev, avatar_url: publicUrl } : prev);
  };

  // ─── Dynamic risk alerts from real asset data ──────────
  const riskItems: { label: string; detail: string }[] = [];
  if (unprotectedAssets.length > 0) {
    const names = unprotectedAssets.slice(0, 2).map(a => a.name).join(' & ');
    const extra = unprotectedAssets.length > 2 ? ` (+${unprotectedAssets.length - 2} more)` : '';
    riskItems.push({
      label: `${unprotectedAssets.length} asset${unprotectedAssets.length > 1 ? 's' : ''} exposed`,
      detail: `${names}${extra} not held in a private trust`,
    });
   }
  const noValueAssets = assets.filter(a => !a.estimated_value || Number(a.estimated_value) === 0);
  if (noValueAssets.length > 0) {
    riskItems.push({
      label: `${noValueAssets.length} asset${noValueAssets.length > 1 ? 's' : ''} missing valuation`,
      detail: 'Estimated value not set — update for accurate protection tracking',
    });
  }

  // Life insurance estate tax risk
  const exposedInsurance = assets.filter(a =>
    a.asset_type === 'life_insurance' && a.entity_type !== 'private_trust'
  );
  if (exposedInsurance.length > 0) {
    const insuranceValue = exposedInsurance.reduce((sum, a) => sum + (Number(a.estimated_value) || 0), 0);
    const names = exposedInsurance.slice(0, 2).map(a => a.name).join(' & ');
    riskItems.push({
      label: `Life insurance not in a private trust`,
      detail: `${names}${exposedInsurance.length > 2 ? ` (+${exposedInsurance.length - 2} more)` : ''} held personally or in an LLC — increases your personal estate and may trigger estate taxes (federal threshold: $13.99M in 2025, potentially $15M+ by 2026)`,
    });
  }

  const categoryIcons: Record<string, typeof FileText> = {
    trust: Shield, deed: Home, tax: FileCheck, business: Briefcase, insurance: Lock,
  };

  // Active trusts only (not completed) for count display
  const activeTrusts = trusts.filter(t => t.stage !== 'trusts_complete');

  // Show loading state until profile and data are resolved to prevent tier flash
  if (profileLoading || (!dataLoaded && !needsPaymentGate)) {
    return (
      <HeirwayLayout>
        <div className="flex-1 flex items-center justify-center h-[calc(100dvh-3.5rem)]">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        </div>
      </HeirwayLayout>
    );
  }

  if (needsPaymentGate && !gateResolved) {
    return (
      <PaymentGate
        clientId={clientId!}
        selectedPlan={profileClient?.selected_plan}
        onComplete={() => {
          setGateResolved(true);
          window.location.reload();
        }}
      />
    );
  }

  return (
    <HeirwayLayout>
      <div className="min-h-[100dvh] gradient-bg overflow-hidden">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 p-3 sm:p-4 md:p-6 max-w-full">
          {/* Notification Banner */}
          {clientId && <div className="mb-3"><NotificationBanner clientId={clientId} clientPlan={client?.selected_plan || null} userId={user?.id} /></div>}

          {/* Controls row */}
          <div className="flex flex-col gap-2 mb-3 w-full">
            {isTrustTier && trusts.length > 0 && (
              <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-muted/30 border border-border/40 flex-wrap">
                <Coins className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-muted-foreground whitespace-nowrap">Silver $/oz</span>
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px] px-1.5 py-0 h-5 flex-shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse mr-1" />
                  Live
                </Badge>
                <Input
                  type="number"
                  value={silverInput}
                  onChange={e => setSilverInput(e.target.value)}
                  className="glass-input w-16 sm:w-20 h-7 text-xs"
                  placeholder="0.00"
                />
                <Button size="sm" variant="outline" className="h-7 text-xs px-2 whitespace-nowrap" onClick={async () => {
                  const price = Number(silverInput);
                  if (isNaN(price) || price < 0) return;
                  if (client) {
                    await supabase.from('heirway_clients').update({ silver_spot_price: price } as any).eq('id', (client as any).id);
                    setClient((prev: any) => prev ? { ...prev, silver_spot_price: price, updated_at: new Date().toISOString() } : prev);
                    toast.success('Silver spot price updated');
                    loadUserData(user!.id);
                  }
                }}>
                  Update
                </Button>
                {client?.updated_at && (
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                    Updated {new Date(client.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
            )}
            <div className="flex items-center justify-end gap-2 flex-wrap">
              {client?.plan_status === 'intake_in_progress' && (
                <Button
                  size="sm"
                  onClick={() => navigate('/heirway/intake')}
                  className="bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-md hover:opacity-90"
                >
                  <FileText className="w-4 h-4 mr-1" /> Continue Trust Request
                </Button>
              )}
              {isFreeTier && (
                <Button size="sm" onClick={() => navigate('/heirway/pricing')}>
                  Upgrade Your Plan
                </Button>
              )}
              {isEducationTier && (
                <Button size="sm" onClick={() => navigate('/heirway/trust-questionnaire')}>
                  <Shield className="w-4 h-4 mr-1" /> Set Up a Private Trust
                </Button>
              )}
              {user && clientId && (
                <div className="hidden md:block">
                  <NotificationBell userId={user.id} clientId={clientId} clientPlan={client?.selected_plan || null} />
                </div>
              )}
              <Button variant="outline" size="sm" className="flex-shrink-0 hidden md:flex" onClick={() => user && loadUserData(user.id)}>
                <RefreshCw className="w-4 h-4 mr-1" /> Refresh
              </Button>
            </div>
          </div>

          {/* Welcome banner with avatar and Pay it Forward */}
          <div className="glass-panel p-5 md:p-6 mb-4 md:mb-6 animate-fade-in">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <Avatar className="w-14 h-14 border-2 border-primary/20">
                    {(client as any)?.avatar_url ? (
                      <AvatarImage src={(client as any).avatar_url} alt={displayName} />
                    ) : null}
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold text-lg">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="w-4 h-4 text-white" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                  </label>
                </div>
                <div>
                  <p className="text-xs font-medium text-primary uppercase tracking-wider mb-1">Welcome Back</p>
                  <h2 className="text-xl md:text-2xl font-display font-bold text-foreground">
                    Hello, {displayName}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isTrustTier ? "Here's an overview of your estate plan." :
                     isEducationTier ? "Track your assets and continue learning." :
                     "Start learning about private trusts and track your assets."}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {isFoundationPlus && !isCreatorAvailable && (
                  <Button size="sm" variant="outline" className="border-green-500/30 text-green-600 hover:bg-green-500/10" onClick={handlePayItForward}>
                    <Heart className="w-4 h-4 mr-1" /> Pay it Forward — Become a Creator
                  </Button>
                )}
                {isCreatorAvailable && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                    <Heart className="w-3 h-3 mr-1" /> Creator Friendly ✓
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
            {/* Left 2x2 grid */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {/* Assets Protected */}
              <Dialog open={showProtected} onOpenChange={setShowProtected}>
                <DialogTrigger asChild>
                  <Card className="glass-card animate-fade-in cursor-pointer hover:border-primary/30 transition-colors" style={{ animationDelay: '50ms' }}>
                    <CardContent className="p-4 flex items-start justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Assets Protected</p>
                        <p className="text-xl font-display font-bold text-foreground">{assets.length > 0 || silverTotalValue > 0 ? formatCurrency(protectedValue) : 'No assets'}</p>
                        <p className="text-xs text-muted-foreground mt-1">{protectedAssets.length + (silverTotalValue > 0 ? 1 : 0)} of {assets.length + (silverTotalValue > 0 ? 1 : 0)} assets in trust</p>
                        {assets.length > 0 && (
                          <div className="flex items-center gap-1 mt-2">
                            <TrendingUp className={`w-3 h-3 ${protectionPercent >= 50 ? 'text-green-500' : 'text-muted-foreground'}`} />
                            <span className={`text-[10px] font-medium ${protectionPercent >= 50 ? 'text-green-500' : 'text-muted-foreground'}`}>{protectionPercent}% protected</span>
                          </div>
                        )}
                      </div>
                      <div className="p-2 rounded-lg bg-muted/50"><DollarSign className="w-5 h-5 text-muted-foreground" /></div>
                    </CardContent>
                  </Card>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-green-500" /> Assets Protected
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {silverTotalValue > 0 && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40">
                        <div>
                          <p className="text-sm font-medium text-foreground">Silver Holdings</p>
                          <p className="text-xs text-muted-foreground">Default trust asset · {trusts.length} trust{trusts.length !== 1 ? 's' : ''}</p>
                        </div>
                        <span className="text-sm font-semibold text-foreground">{formatCurrency(silverTotalValue)}</span>
                      </div>
                    )}
                    {protectedAssets.map(a => (
                      <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40">
                        <div>
                          <p className="text-sm font-medium text-foreground">{a.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{a.asset_type.replace(/_/g, ' ')}</p>
                        </div>
                        <span className="text-sm font-semibold text-foreground">{formatCurrency(Number(a.estimated_value) || 0)}</span>
                      </div>
                    ))}
                    {protectedAssets.length === 0 && silverTotalValue === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">No assets currently in a private trust.</p>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              {/* Assets Exposed */}
              <Dialog open={showExposed} onOpenChange={setShowExposed}>
                <DialogTrigger asChild>
                  <Card className="glass-card animate-fade-in cursor-pointer hover:border-destructive/30 transition-colors" style={{ animationDelay: '100ms' }}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Assets Exposed</p>
                          <p className="text-xl font-display font-bold text-foreground">
                            {unprotectedAssets.length > 0 ? formatCurrency(unprotectedAssets.reduce((sum, a) => sum + (Number(a.estimated_value) || 0), 0)) : '$0'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">{unprotectedAssets.length} asset{unprotectedAssets.length !== 1 ? 's' : ''} not in a private trust</p>
                          {unprotectedAssets.length > 0 && (
                            <div className="flex items-center gap-1 mt-2">
                              <AlertTriangle className="w-3 h-3 text-destructive" />
                              <span className="text-[10px] font-medium text-destructive">At risk of probate & estate tax</span>
                            </div>
                          )}
                        </div>
                        <div className="p-2 rounded-lg bg-destructive/10"><ShieldOff className="w-5 h-5 text-destructive" /></div>
                      </div>
                    </CardContent>
                  </Card>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <ShieldOff className="w-5 h-5 text-destructive" /> Assets Exposed
                    </DialogTitle>
                  </DialogHeader>
                  <p className="text-xs text-muted-foreground mb-3">These assets are not held in a private trust and may be subject to probate, lawsuits, and estate taxes.</p>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {unprotectedAssets.map(a => (
                      <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                        <div>
                          <p className="text-sm font-medium text-foreground">{a.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {a.asset_type.replace(/_/g, ' ')} · {a.entity_type === 'none' ? 'Personal name' : a.entity_type?.replace(/_/g, ' ')}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-foreground">{formatCurrency(Number(a.estimated_value) || 0)}</span>
                      </div>
                    ))}
                    {unprotectedAssets.length === 0 && (
                      <div className="flex gap-2 items-center p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                        <Shield className="w-4 h-4 text-green-500" />
                        <p className="text-sm text-foreground">All assets are protected in a private trust.</p>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              {/* Private Trusts */}
              <Card className="glass-card animate-fade-in" style={{ animationDelay: '150ms' }}>
                <CardContent className="p-4 flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Private Trusts</p>
                    <p className="text-xl font-display font-bold text-foreground">{trusts.length > 0 ? `${trusts.length} Trust${trusts.length !== 1 ? 's' : ''}` : '0 Trusts'}</p>
                    <p className="text-xs text-muted-foreground mt-1">{trusts.length > 0 ? `${activeTrusts.length} in progress · ${trusts.length - activeTrusts.length} completed` : 'No trusts yet'}</p>
                    {trusts.length > 0 && (
                      <div className="flex items-center gap-1 mt-2">
                        <TrendingUp className={`w-3 h-3 ${activeTrusts.length === 0 ? 'text-green-500' : 'text-muted-foreground'}`} />
                        <span className={`text-[10px] font-medium ${activeTrusts.length === 0 ? 'text-green-500' : 'text-muted-foreground'}`}>
                          {activeTrusts.length > 0 ? `${activeTrusts.filter(t => t.stage === 'ready_to_sign').length} ready to sign` : 'All trusts completed'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-2 rounded-lg bg-muted/50"><Shield className="w-5 h-5 text-muted-foreground" /></div>
                </CardContent>
              </Card>

              {/* Net Worth — All tiers */}
              <Card className="glass-card animate-fade-in" style={{ animationDelay: '175ms' }}>
                <CardContent className="p-4 flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Estate Net Worth</p>
                    <p className="text-xl font-display font-bold text-foreground">
                      {totalAssetValue > 0 ? formatCurrency(totalAssetValue) : '$0'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {assets.length + (silverTotalValue > 0 ? 1 : 0)} asset{(assets.length + (silverTotalValue > 0 ? 1 : 0)) !== 1 ? 's' : ''} tracked
                    </p>
                    {totalAssetValue > 0 && (
                      <div className="flex items-center gap-1 mt-2">
                        <TrendingUp className={`w-3 h-3 ${protectionPercent >= 75 ? 'text-green-500' : protectionPercent >= 50 ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className={`text-[10px] font-medium ${protectionPercent >= 75 ? 'text-green-500' : protectionPercent >= 50 ? 'text-primary' : 'text-muted-foreground'}`}>
                          {protectionPercent}% in private trust
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-2 rounded-lg bg-accent/10"><Coins className="w-5 h-5 text-accent" /></div>
                </CardContent>
              </Card>
            </div>

            {/* Risk Alerts — right column, spans full height */}
            <Card className="glass-card animate-fade-in flex flex-col" style={{ animationDelay: '200ms' }}>
              <CardContent className="p-4 flex flex-col flex-1">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-sm text-muted-foreground">Risk Alerts</p>
                  <div className="relative p-2 rounded-lg bg-destructive/10">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    {riskItems.length > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                        {riskItems.length}
                      </span>
                    )}
                  </div>
                </div>

                {riskItems.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <Shield className="w-8 h-8 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No risks detected</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Current risk alert pill — label + short summary */}
                    <div className="flex gap-2.5 items-center p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                      <div className="flex-shrink-0 w-6 h-6 rounded-md bg-destructive/10 flex items-center justify-center">
                        <AlertTriangle className="w-3 h-3 text-destructive" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground">{riskItems[riskIndex % riskItems.length]?.label}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{riskItems[riskIndex % riskItems.length]?.detail}</p>
                      </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-muted-foreground">{(riskIndex % riskItems.length) + 1} of {riskItems.length}</span>
                      {riskItems.length > 1 && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => setRiskIndex((p) => (p - 1 + riskItems.length) % riskItems.length)} className="p-1 rounded hover:bg-muted transition-colors">
                            <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                          <button onClick={() => setRiskIndex((p) => (p + 1) % riskItems.length)} className="p-1 rounded hover:bg-muted transition-colors">
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Full description in the empty space below */}
                    <div className="flex-1 mt-3 pt-3 border-t border-border/30">
                      <p className="text-xs font-medium text-foreground mb-1">Why this matters</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {riskItems[riskIndex % riskItems.length]?.detail}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* FOUNDATION+: What to Expect Next (hidden once documents processing) */}
          {showWhatsNext && (
            <div className="mb-4 md:mb-6 animate-fade-in" style={{ animationDelay: '150ms' }}>
              <GoldHeaderCard title="What to Expect Next" icon={<Clock className="w-4 h-4 text-primary" />} description="Your roadmap after enrollment">
                <div className="space-y-4">
                  {NEXT_STEPS.map((step, i) => {
                    const StepIcon = step.icon;
                    return (
                      <div key={i} className="flex gap-4 p-4 rounded-lg bg-muted/30 border border-border/40">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <StepIcon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-foreground mb-1">{step.title}</h4>
                          <p className="text-xs text-muted-foreground">{step.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </GoldHeaderCard>
            </div>
          )}

          {/* TRUST TIER: Trust Development Progress (only in-progress trusts) */}
          {isTrustTier && clientId && (
            <div className="mb-4 md:mb-6 animate-fade-in" style={{ animationDelay: '180ms' }}>
              <TrustProgress userId={user?.id || ''} clientId={clientId || ''} />
            </div>
          )}

          {/* Asset Tracker - All tiers */}
          {clientId && (
            <div className="mb-4 md:mb-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
              <AssetTracker userId={user?.id || ''} clientId={clientId || ''} tier={effectiveTier} silverPrice={Number((client as any)?.silver_spot_price) || 0} />
            </div>
          )}

          {/* Learning Progress - Full width */}
          <div className="mb-4 md:mb-6 animate-fade-in" style={{ animationDelay: '220ms' }}>
            <GoldHeaderCard title="Learning Progress" icon={<BookOpen className="w-4 h-4 text-primary" />} description="Track your estate planning education">
              <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Overall Progress</span>
                  <span className="text-sm font-bold text-primary">{learningPercent}%</span>
                </div>
                <Progress value={learningPercent} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">{completedLessons} of {totalLessons} lessons completed</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {dbModules.slice(0, 3).map(mod => {
                  const modLessons = dbLessons.filter((l: any) => l.module_ref_id === mod.id);
                  const modCompleted = progress.filter(p => p.module_id === mod.id && p.completed).length;
                  const modPercent = modLessons.length > 0 ? Math.round((modCompleted / modLessons.length) * 100) : 0;
                  return (
                    <Link to={`/heirway/learning?module=${mod.id}`} key={mod.id} className="block rounded-lg bg-muted/30 border border-border/40 hover:border-primary/20 transition-colors overflow-hidden">
                      {mod.thumbnail_url ? (
                        <img src={mod.thumbnail_url} alt={mod.title} className="w-full h-24 object-cover" />
                      ) : (
                        <div className="w-full h-24 bg-gradient-to-br from-foreground/90 to-foreground/70 flex items-center justify-center">
                          <BookOpen className="w-8 h-8 text-muted" />
                        </div>
                      )}
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-foreground">{mod.title}</span>
                          <div className="flex items-center gap-2">
                            {modPercent === 100 ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <><span className="text-xs text-muted-foreground">{modPercent}%</span><Play className="w-3.5 h-3.5 text-muted-foreground" /></>
                            )}
                          </div>
                        </div>
                        <Progress value={modPercent} className="h-1.5" />
                        <p className="text-xs text-muted-foreground mt-1">{modCompleted} of {modLessons.length} videos completed</p>
                      </div>
                    </Link>
                  );
                })}
                {dbModules.length === 0 && (
                  <div className="col-span-full text-center py-4">
                    <p className="text-xs text-muted-foreground">No courses available yet.</p>
                  </div>
                )}
              </div>
              {dbModules.length > 3 && (
                <div className="mt-4 text-center">
                  <Link to="/heirway/learning">
                    <Button variant="outline" size="sm">
                      <BookOpen className="w-3.5 h-3.5 mr-1.5" /> Show More Courses
                    </Button>
                  </Link>
                </div>
              )}
            </GoldHeaderCard>
          </div>

          {/* TRUST TIER: Meeting Minutes & Admin Requests */}
          {isTrustTier && clientId && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 mb-3 md:mb-4">
              <div className="animate-fade-in" style={{ animationDelay: '250ms' }}>
                <MeetingMinutes userId={user?.id || ''} clientId={clientId || ''} showOnlyWhenComplete />
              </div>
              <div className="animate-fade-in" style={{ animationDelay: '270ms' }}>
                <AdminRequests userId={user?.id || ''} clientId={clientId || ''} />
              </div>
            </div>
          )}




          {/* Documents Quick View */}
          <div className="animate-fade-in" style={{ animationDelay: '310ms' }}>
            <GoldHeaderCard
              title="Document Vault"
              icon={<FileText className="w-4 h-4 text-primary" />}
              description="Secure storage for your estate documents"
              headerAction={
                <Link to="/heirway/documents">
                  <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">
                    {documents.length} documents
                  </Badge>
                </Link>
              }
            >
              {documents.length > 0 ? (
                <div className="space-y-2">
                  {documents.slice(0, 4).map((doc) => {
                    const DocIcon = categoryIcons[doc.category] || FileText;
                    return (
                      <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/40">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <DocIcon className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{doc.file_name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{doc.category} · {new Date(doc.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    );
                  })}
                  {documents.length > 4 && (
                    <Link to="/heirway/documents" className="block text-center py-2">
                      <span className="text-sm text-primary hover:underline font-medium">View all {documents.length} documents →</span>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-3">Upload deeds, insurance policies, tax returns, and other important documents.</p>
                  <Link to="/heirway/documents">
                    <button className="text-sm text-primary hover:underline font-medium">Manage Documents →</button>
                  </Link>
                </div>
              )}
            </GoldHeaderCard>
          </div>
        </div>
      </div>
    </HeirwayLayout>
  );
}
