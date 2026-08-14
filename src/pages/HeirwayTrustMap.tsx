import { useEffect, useState } from 'react';
import { HeirwayLayout } from '@/components/heirway/HeirwayLayout';
import { GoldHeaderCard } from '@/components/ui/gold-header-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useClientProfile } from '@/hooks/useClientProfile';
import { supabase } from '@/integrations/supabase/client';
import { getTrustLabel, getTrustBgClass, getTrustColor, trustHasBankAccount } from '@/lib/trustTypes';
import { Building2, Shield, Lock, ExternalLink, ChevronRight, Package, DollarSign, Landmark, ChevronLeft, User, Users, Crown, Coins, Upload, FileText, Trash2, Hash, Eye } from 'lucide-react';
import TrustMemberManager from '@/components/heirway/trust/TrustMemberManager';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const DOCUMENT_TYPES = [
  { value: 'deed', label: 'Deed' },
  { value: 'deed_of_trust', label: 'Deed of Trust' },
  { value: 'llc', label: 'LLC' },
  { value: 'contract', label: 'Contract' },
  { value: 'capital_credit_unit_certificate', label: 'Capital Credit Unit Certificate' },
  { value: 'units_of_beneficial_interest', label: 'Units of Beneficial Interest Certificate' },
  { value: 'meeting_minutes_signed', label: 'Meeting Minutes (Signed)' },
  { value: 'trust_documents_signed', label: 'Trust Documents (Signed)' },
  { value: 'other', label: 'Other' },
];

interface TrustRecord {
  id: string;
  trust_name: string;
  trust_type: string;
  stage: string;
  has_bank_account: boolean;
  creator_name: string | null;
  trust_code: string | null;
  trustees: { name: string; role: string }[];
  beneficiaries: { name: string; units_of_interest: string }[];
}

interface AssetRecord {
  id: string;
  name: string;
  asset_type: string;
  estimated_value: number;
  trust_id: string | null;
  llc_state: string | null;
}

export default function HeirwayTrustMap() {
  const { tier, client, user, loading } = useClientProfile();
  const [miroUrl, setMiroUrl] = useState<string | null>(null);
  const [trusts, setTrusts] = useState<TrustRecord[]>([]);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [selectedTrust, setSelectedTrust] = useState<TrustRecord | null>(null);
  const [silverSpotPrice, setSilverSpotPrice] = useState(0);
  const [silverInput, setSilverInput] = useState('');
  const [trustDocuments, setTrustDocuments] = useState<any[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('other');
  const [directorySearch, setDirectorySearch] = useState('');
  const [directoryTab, setDirectoryTab] = useState('trustees');

  useEffect(() => {
    if (client?.miro_board_url) setMiroUrl(client.miro_board_url);
    if (client) {
      const price = (client as any).silver_spot_price || 0;
      setSilverSpotPrice(price);
      setSilverInput(String(price));
    }
  }, [client]);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user, client]);

  const loadData = async () => {
    const cid = client?.id;
    const [trustsRes, assetsRes] = await Promise.all([
      cid
        ? supabase.from('heirway_trust_progress' as any).select('*').eq('client_id', cid)
        : supabase.from('heirway_trust_progress' as any).select('*').eq('user_id', user!.id),
      cid
        ? supabase.from('heirway_assets' as any).select('*').eq('client_id', cid)
        : supabase.from('heirway_assets' as any).select('*').eq('user_id', user!.id),
    ]);
    setTrusts((trustsRes.data as any[]) || []);
    setAssets((assetsRes.data as any[]) || []);
  };

  const getAssetsForTrust = (trustId: string) => assets.filter(a => a.trust_id === trustId);

  const formatCurrency = (val: number) =>
    val > 0 ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(val) : '$0';

  const clientFullName = user?.user_metadata?.full_name || client?.full_name || '';

  const getClientRoles = (trust: TrustRecord) => {
    const roles: string[] = [];
    if (!clientFullName) return roles;
    const nameLower = clientFullName.toLowerCase().trim();
    const firstNameLower = clientFullName.split(' ')[0]?.toLowerCase() || '';
    
    const nameMatches = (testName: string) => {
      const t = testName.toLowerCase().trim();
      return t === nameLower || t.includes(nameLower) || nameLower.includes(t) || t.includes(firstNameLower);
    };
    
    if (trust.creator_name && nameMatches(trust.creator_name)) {
      roles.push('Creator');
    }
    const trusteeMatch = (trust.trustees || []).find((t: any) => nameMatches(t.name));
    if (trusteeMatch) roles.push((trusteeMatch as any).role || 'Trustee');
    const isBeneficiary = (trust.beneficiaries || []).some((b: any) =>
      nameMatches(b.name) && Number(b.units_of_interest) > 0
    );
    if (isBeneficiary) roles.push('Beneficiary');
    return roles;
  };

  const handleUpdateSilverPrice = async () => {
    const price = Number(silverInput);
    if (isNaN(price) || price < 0) return;
    setSilverSpotPrice(price);
    if (client) {
      await supabase.from('heirway_clients').update({ silver_spot_price: price } as any).eq('id', client.id);
    }
  };

  const loadTrustDocuments = async (trustId: string) => {
    const { data } = await supabase
      .from('heirway_documents')
      .select('*')
      .eq('user_id', user!.id)
      .eq('category', `trust_${trustId}`)
      .order('created_at', { ascending: false });
    setTrustDocuments((data as any[]) || []);
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>, trustId: string) => {
    const file = e.target.files?.[0];
    if (!file || !client) return;
    if (!docType) { toast.error('Please select a document type'); return; }
    setUploadingDoc(true);
    const ext = file.name.split('.').pop();
    const path = `${client.id}/trusts/${trustId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('client-documents').upload(path, file);
    if (uploadError) { toast.error('Failed to upload document'); setUploadingDoc(false); return; }
    const displayName = docName.trim() || file.name;
    const typeLabel = DOCUMENT_TYPES.find(d => d.value === docType)?.label || docType;
    await supabase.from('heirway_documents').insert({
      user_id: user!.id, client_id: client.id,
      file_name: `${displayName} (${typeLabel})`, file_path: path,
      file_size: file.size, category: `trust_${trustId}`,
    } as any);
    toast.success('Document uploaded');
    setUploadingDoc(false);
    setDocName('');
    setDocType('other');
    loadTrustDocuments(trustId);
  };

  const handleDeleteDoc = async (doc: any) => {
    await supabase.storage.from('client-documents').remove([doc.file_path]);
    await supabase.from('heirway_documents').delete().eq('id', doc.id);
    toast.success('Document removed');
    if (selectedTrust) loadTrustDocuments(selectedTrust.id);
  };

  const silverTotalValue = silverSpotPrice * trusts.length; // 1 oz per trust
  // Load docs when selecting a trust
  useEffect(() => {
    if (selectedTrust) loadTrustDocuments(selectedTrust.id);
    else setTrustDocuments([]);
  }, [selectedTrust?.id]);

  if (loading) {
    return (
      <HeirwayLayout>
        <div className="min-h-screen gradient-bg flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </HeirwayLayout>
    );
  }

  if (tier !== 'trust') {
    return (
      <HeirwayLayout>
        <div className="min-h-screen gradient-bg flex items-center justify-center p-6">
          <div className="text-center glass-panel p-8 max-w-md">
            <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-display font-bold text-foreground mb-2">Trust Structure Access</h2>
            <p className="text-sm text-muted-foreground">This feature is available with a Foundation plan or above. Upgrade to view and manage your trust structure.</p>
          </div>
        </div>
      </HeirwayLayout>
    );
  }

  // Trust detail view
  if (selectedTrust) {
    const trustAssets = getAssetsForTrust(selectedTrust.id);
    const assetTotal = trustAssets.reduce((sum, a) => sum + (Number(a.estimated_value) || 0), 0);
    const totalVal = assetTotal + silverSpotPrice; // 1 oz silver per trust

    return (
      <HeirwayLayout>
        <div className="min-h-screen gradient-bg">
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
          </div>
          <div className="relative z-10 p-4 md:p-6">
             <button onClick={() => { setSelectedTrust(null); setTrustDocuments([]); }} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
               <ChevronLeft className="w-4 h-4" /> Back to Trust Structure
             </button>

            <GoldHeaderCard
              title={selectedTrust.trust_name}
              icon={<Shield className="w-4 h-4" style={{ color: getTrustColor(selectedTrust.trust_type) }} />}
              description={getTrustLabel(selectedTrust.trust_type)}
            >
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                {selectedTrust.trust_code && (
                  <Badge variant="outline" className="text-xs font-mono bg-muted/50">
                    <Hash className="w-3 h-3 mr-0.5" />{selectedTrust.trust_code}
                  </Badge>
                )}
                <Badge variant="outline" className={`text-xs ${getTrustBgClass(selectedTrust.trust_type)}`}>
                  {getTrustLabel(selectedTrust.trust_type)}
                </Badge>
                {trustHasBankAccount(selectedTrust.trust_type) && (
                  <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20">
                    <Landmark className="w-3 h-3 mr-1" /> Bank Account
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs capitalize">
                  {selectedTrust.stage.replace(/_/g, ' ')}
                </Badge>
                {getClientRoles(selectedTrust).map(role => (
                  <Badge key={role} variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                    {role}
                  </Badge>
                ))}
              </div>

              {/* People Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-4 h-4 text-primary" />
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Creator</p>
                  </div>
                  <p className="text-sm text-foreground">{selectedTrust.creator_name || 'Not specified'}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-primary" />
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Trustees</p>
                  </div>
                  {(selectedTrust.trustees || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">None assigned</p>
                  ) : (
                    <div className="space-y-1">
                      {(selectedTrust.trustees || []).map((t: any, i: number) => (
                        <div key={i}>
                          <p className="text-sm text-foreground">{t.name}</p>
                          <p className="text-[10px] text-muted-foreground">{t.role}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-primary" />
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Beneficiaries</p>
                  </div>
                  {(selectedTrust.beneficiaries || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">None assigned</p>
                  ) : (
                    <div className="space-y-1">
                      {(selectedTrust.beneficiaries || []).map((b: any, i: number) => (
                        <div key={i} className="flex items-center justify-between">
                          <p className="text-sm text-foreground">{b.name}</p>
                          <Badge variant="outline" className="text-[9px]">{Number(b.units_of_interest).toFixed(2)} units</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-3 rounded-lg bg-muted/30 border border-border/40 text-center">
                  <p className="text-lg font-bold text-foreground">{trustAssets.length}</p>
                  <p className="text-xs text-muted-foreground">Assets</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border/40 text-center">
                  <p className="text-lg font-bold text-foreground">{formatCurrency(totalVal)}</p>
                  <p className="text-xs text-muted-foreground">Total Value</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border/40 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Coins className="w-4 h-4 text-muted-foreground" />
                    <p className="text-lg font-bold text-foreground">1 oz</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Silver ({formatCurrency(silverSpotPrice)})</p>
                </div>
              </div>

              {/* Silver note */}
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border/30 mb-4">
                <Coins className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <p className="text-[11px] text-muted-foreground">This trust holds 1 oz of silver valued at the current spot price.</p>
              </div>

              {trustAssets.length === 0 ? (
                <div className="text-center py-6">
                  <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No additional assets assigned to this trust yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Add assets via the Asset Tracker and assign them to this trust.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {trustAssets.map(asset => (
                    <div key={asset.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                          <Shield className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{asset.name}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] capitalize">{asset.asset_type.replace(/_/g, ' ')}</Badge>
                            {asset.llc_state && <Badge variant="outline" className="text-[10px]">{asset.llc_state}</Badge>}
                          </div>
                        </div>
                      </div>
                      {(asset.estimated_value || 0) > 0 && (
                        <span className="text-sm font-medium text-foreground flex items-center gap-0.5">
                          <DollarSign className="w-3 h-3" />{formatCurrency(Number(asset.estimated_value))}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </GoldHeaderCard>

            {/* Trust Documents */}
            <GoldHeaderCard
              title="Trust Documents"
              icon={<FileText className="w-4 h-4 text-primary" />}
              description={`Upload and manage documents for ${selectedTrust.trust_name}`}
            >
              {/* Upload form */}
              <div className="p-3 rounded-lg bg-muted/20 border border-border/30 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                  <div>
                    <Label className="text-xs">Document Name</Label>
                    <Input
                      value={docName}
                      onChange={e => setDocName(e.target.value)}
                      placeholder="e.g. Property Deed - 123 Main St"
                      className="glass-input h-8 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Document Type</Label>
                    <Select value={docType} onValueChange={setDocType}>
                      <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_TYPES.map(dt => (
                          <SelectItem key={dt.value} value={dt.value} className="text-xs">{dt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <label className="cursor-pointer w-full">
                      <input type="file" className="hidden" onChange={e => handleDocUpload(e, selectedTrust.id)} disabled={uploadingDoc} />
                      <Button size="sm" variant="outline" asChild disabled={uploadingDoc} className="w-full h-8">
                        <span><Upload className="w-3.5 h-3.5 mr-1" /> {uploadingDoc ? 'Uploading...' : 'Choose File & Upload'}</span>
                      </Button>
                    </label>
                  </div>
                </div>
              </div>

              {trustDocuments.length === 0 ? (
                <div className="text-center py-6">
                  <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No documents uploaded for this trust yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {trustDocuments.map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-primary" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{doc.file_name}</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(doc.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteDoc(doc)}>
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </GoldHeaderCard>

            {/* Trust Member Management */}
            {client && (
              <TrustMemberManager
                allClientTrusts={trusts.map((t: any) => ({ id: t.id, trust_name: t.trust_name, trust_code: t.trust_code }))}
                focusedTrustId={selectedTrust.id}
                clientId={client.id}
                trustName={selectedTrust.trust_name}
              />
            )}
          </div>
        </div>
      </HeirwayLayout>
    );
  }

  return (
    <HeirwayLayout>
      <div className="min-h-screen gradient-bg">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 p-4 md:p-6">
          <div className="mb-4 md:mb-6 animate-fade-in">
            <h1 className="text-xl md:text-2xl font-display font-bold text-foreground">Trust Vault</h1>
            <p className="text-sm text-muted-foreground">Visual overview of trust entities and relationships</p>
          </div>

          {/* Silver Spot Price Control */}
          {trusts.length > 0 && (
            <div className="mb-4 md:mb-6 animate-fade-in">
              <GoldHeaderCard
                title="Silver Holdings"
                icon={<Coins className="w-4 h-4 text-primary" />}
                description={`Each trust holds 1 oz of silver · ${trusts.length} trust${trusts.length !== 1 ? 's' : ''} = ${trusts.length} oz total`}
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs whitespace-nowrap">Silver Spot Price ($/oz)</Label>
                    <Input
                      type="number"
                      value={silverInput}
                      onChange={e => setSilverInput(e.target.value)}
                      className="glass-input w-32 h-8 text-sm"
                      placeholder="0.00"
                    />
                    <Button size="sm" variant="outline" className="h-8" onClick={handleUpdateSilverPrice}>
                      Update
                    </Button>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">Total Silver Value:</span>
                    <span className="font-bold text-foreground">{formatCurrency(silverTotalValue)}</span>
                  </div>
                </div>
              </GoldHeaderCard>
            </div>
          )}

          {/* Trust Structure Map - Miro Board */}
          <div className="mb-4 md:mb-6 animate-fade-in">
            <GoldHeaderCard
              title="Trust Structure Map"
              icon={<ExternalLink className="w-4 h-4 text-primary" />}
              description={miroUrl ? "View-only access to your trust structure diagram" : "Your trust structure map is being prepared"}
            >
              {miroUrl ? (
                <div className="rounded-lg overflow-hidden border border-border/40 h-[300px] sm:h-[400px] md:h-[500px]">
                  <iframe
                    src={miroUrl}
                    className="w-full h-full border-0"
                    allow="fullscreen"
                    allowFullScreen
                    title="Trust Structure - Miro Board"
                    style={{ minWidth: '100%' }}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 p-6 rounded-lg bg-muted/10 border border-border/40 text-center justify-center">
                  <Lock className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Trust Structure Map Pending</p>
                    <p className="text-xs text-muted-foreground mt-1">Your Heirway expert will add your trust structure map once your trust setup is underway.</p>
                  </div>
                </div>
              )}
            </GoldHeaderCard>
          </div>

          {/* People Directory */}
          {trusts.length > 0 && (() => {
            // Build grouped data
            const trusteesMap = new Map<string, { name: string; trusts: { role: string; trustName: string; trustType: string }[] }>();
            const beneficiariesMap = new Map<string, { name: string; trusts: { trustName: string; trustType: string; units?: string }[] }>();
            const creatorsMap = new Map<string, { name: string; trusts: { trustName: string; trustType: string }[] }>();

            trusts.forEach(trust => {
              if (trust.creator_name) {
                const key = trust.creator_name.toLowerCase().trim();
                if (!creatorsMap.has(key)) creatorsMap.set(key, { name: trust.creator_name, trusts: [] });
                creatorsMap.get(key)!.trusts.push({ trustName: trust.trust_name, trustType: trust.trust_type });
              }
              (trust.trustees || []).forEach((t: any) => {
                const key = t.name.toLowerCase().trim();
                if (!trusteesMap.has(key)) trusteesMap.set(key, { name: t.name, trusts: [] });
                trusteesMap.get(key)!.trusts.push({ role: t.role || 'Trustee', trustName: trust.trust_name, trustType: trust.trust_type });
              });
              (trust.beneficiaries || []).forEach((b: any) => {
                if (!b.name || !b.name.trim()) return;
                const key = b.name.toLowerCase().trim();
                if (!beneficiariesMap.has(key)) beneficiariesMap.set(key, { name: b.name, trusts: [] });
                beneficiariesMap.get(key)!.trusts.push({ trustName: trust.trust_name, trustType: trust.trust_type, units: b.units_of_interest });
              });
            });

            const q = directorySearch.toLowerCase().trim();

            const getRoleLabel = (role: string) => {
              if (role === 'Managing Trustee') return 'Trustee Manager';
              if (role === 'Full Power Trustee') return 'Full Power';
              if (role === 'Limited Power Trustee') return 'Limited Power';
              return role;
            };
            const getRoleIcon = (role: string) => {
              if (role === 'Managing Trustee') return <Crown className="w-3 h-3" />;
              return <Shield className="w-3 h-3" />;
            };

            const filterByName = <T extends { name: string }>(list: T[]) =>
              q ? list.filter(p => p.name.toLowerCase().includes(q)) : list;

            const allTrustees = filterByName(Array.from(trusteesMap.values()));
            const allBeneficiaries = filterByName(Array.from(beneficiariesMap.values()));
            const allCreators = filterByName(Array.from(creatorsMap.values()));

            const renderEmpty = (label: string) => (
              <div className="text-center py-6">
                <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {directorySearch ? 'No results found.' : `No ${label} assigned yet.`}
                </p>
              </div>
            );

            const renderPersonCard = (person: { name: string }, content: React.ReactNode) => (
              <div key={person.name} className="p-3 rounded-lg bg-muted/30 border border-border/40">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{person.name}</p>
                </div>
                <div className="space-y-1.5 ml-12">{content}</div>
              </div>
            );

            return (
              <div className="mb-4 md:mb-6 animate-fade-in">
                <GoldHeaderCard
                  title="Role Directory"
                  icon={<Users className="w-4 h-4 text-primary" />}
                  description="All people across your trusts"
                >
                  <div className="mb-4">
                    <Input
                      placeholder="Search by name…"
                      value={directorySearch}
                      onChange={e => setDirectorySearch(e.target.value)}
                      className="glass-input h-8 text-xs"
                    />
                  </div>
                  <Tabs value={directoryTab} onValueChange={setDirectoryTab}>
                    <TabsList className="w-full mb-4">
                      <TabsTrigger value="trustees" className="flex-1 text-xs">
                        <Shield className="w-3 h-3 mr-1" /> Trustees ({allTrustees.length})
                      </TabsTrigger>
                      <TabsTrigger value="beneficiaries" className="flex-1 text-xs">
                        <Eye className="w-3 h-3 mr-1" /> Beneficiaries ({allBeneficiaries.length})
                      </TabsTrigger>
                      <TabsTrigger value="creators" className="flex-1 text-xs">
                        <Crown className="w-3 h-3 mr-1" /> Creators ({allCreators.length})
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="trustees">
                      {allTrustees.length === 0 ? renderEmpty('trustees') : (
                        <div className="space-y-3">
                          {allTrustees.map(person => renderPersonCard(person,
                            person.trusts.map((t, i) => (
                              <div key={`${t.trustName}-${i}`} className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className={`text-[10px] ${getTrustBgClass(t.trustType)}`}>{t.trustName}</Badge>
                                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                                  {getRoleIcon(t.role)} {getRoleLabel(t.role)}
                                </span>
                              </div>
                            ))
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="beneficiaries">
                      {allBeneficiaries.length === 0 ? renderEmpty('beneficiaries') : (
                        <div className="space-y-3">
                          {allBeneficiaries.map(person => renderPersonCard(person,
                            person.trusts.map((t, i) => (
                              <div key={`${t.trustName}-${i}`} className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className={`text-[10px] ${getTrustBgClass(t.trustType)}`}>{t.trustName}</Badge>
                                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                                  <Eye className="w-3 h-3" /> Beneficiary
                                </span>
                                {t.units && <Badge variant="outline" className="text-[9px]">{Number(t.units).toFixed(2)} units</Badge>}
                              </div>
                            ))
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="creators">
                      {allCreators.length === 0 ? renderEmpty('creators') : (
                        <div className="space-y-3">
                          {allCreators.map(person => renderPersonCard(person,
                            person.trusts.map((t, i) => (
                              <div key={`${t.trustName}-${i}`} className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className={`text-[10px] ${getTrustBgClass(t.trustType)}`}>{t.trustName}</Badge>
                                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                                  <Crown className="w-3 h-3" /> Creator
                                </span>
                              </div>
                            ))
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </GoldHeaderCard>
              </div>
            );
          })()}

          {/* Trust List */}
          <GoldHeaderCard
            title={`Private Trusts (${trusts.length})`}
            icon={<Building2 className="w-4 h-4 text-primary" />}
            description="Click a trust to view assigned assets"
          >
            {trusts.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No trusts created yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Your Heirway expert will set up your trust structure.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {trusts.map(trust => {
                  const trustAssets = getAssetsForTrust(trust.id);
                  const assetTotal = trustAssets.reduce((sum, a) => sum + (Number(a.estimated_value) || 0), 0);
                  const totalVal = assetTotal + silverSpotPrice; // 1 oz silver
                  const roles = getClientRoles(trust);
                  return (
                    <button
                      key={trust.id}
                      onClick={() => setSelectedTrust(trust)}
                      className="w-full flex items-center justify-between p-4 rounded-xl border bg-muted/30 border-border/40 hover:border-primary/30 hover:bg-muted/50 transition-all text-left"
                    >
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
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">{trust.trust_name}</p>
                            {trust.trust_code && (
                              <Badge variant="outline" className="text-[9px] font-mono bg-muted/50">
                                <Hash className="w-2.5 h-2.5 mr-0.5" />{trust.trust_code}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${getTrustBgClass(trust.trust_type)}`}
                            >
                              {getTrustLabel(trust.trust_type)}
                            </Badge>
                            {trustHasBankAccount(trust.trust_type) && (
                              <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20">
                                <Landmark className="w-2.5 h-2.5 mr-0.5" /> Bank
                              </Badge>
                            )}
                            {roles.map(role => (
                              <Badge key={role} variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                                {role}
                              </Badge>
                            ))}
                            <span className="text-[10px] text-muted-foreground">
                              {trustAssets.length} asset{trustAssets.length !== 1 ? 's' : ''} + 1oz Ag · {formatCurrency(totalVal)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            )}
          </GoldHeaderCard>
        </div>
      </div>
    </HeirwayLayout>
  );
}