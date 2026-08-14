import { useState, useEffect } from 'react';
import { GoldHeaderCard } from '@/components/ui/gold-header-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getTrustLabel, getTrustBgClass } from '@/lib/trustTypes';
import {
  Package, Plus, AlertTriangle, Shield, Trash2, Pencil, Coins,
} from 'lucide-react';

const ASSET_TYPES = [
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'investment', label: 'Investment Account' },
  { value: 'bank_account', label: 'Bank Account' },
  { value: 'business', label: 'Business' },
  { value: 'llc', label: 'LLC' },
  { value: 'life_insurance', label: 'Life Insurance' },
  { value: 'retirement', label: 'Retirement Account' },
  { value: 'personal_property', label: 'Personal Property' },
  { value: 'other', label: 'Other' },
];

const ENTITY_TYPES = [
  { value: 'none', label: 'No Entity (Personal)' },
  { value: 'revocable_trust', label: 'Revocable Trust' },
  { value: 'private_trust', label: 'Private Trust' },
  { value: 'llc', label: 'LLC' },
  { value: 'corporation', label: 'Corporation' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'other', label: 'Other Entity' },
];

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];

interface Asset {
  id: string;
  name: string;
  asset_type: string;
  estimated_value: number;
  entity_type: string;
  entity_name: string | null;
  in_private_trust: boolean;
  notes: string | null;
  trust_id: string | null;
  llc_state: string | null;
}

interface TrustOption {
  id: string;
  trust_name: string;
  trust_type: string;
}

interface AssetTrackerProps {
  userId: string;
  clientId: string;
  tier?: 'free' | 'education' | 'trust';
  silverPrice?: number;
}

export default function AssetTracker({ userId, clientId, tier = 'free', silverPrice }: AssetTrackerProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [userTrusts, setUserTrusts] = useState<TrustOption[]>([]);
  const [silverSpotPrice, setSilverSpotPrice] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [form, setForm] = useState({
    name: '',
    asset_type: 'real_estate',
    estimated_value: '',
    entity_type: 'none',
    entity_name: '',
    notes: '',
    trust_id: '',
    llc_state: '',
  });

  useEffect(() => {
    loadAssets();
    loadTrusts();
    if (silverPrice === undefined) loadSilverPrice();
  }, [userId]);

  useEffect(() => {
    if (silverPrice !== undefined) setSilverSpotPrice(silverPrice);
  }, [silverPrice]);

  const loadAssets = async () => {
    const { data } = await supabase
      .from('heirway_assets' as any)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    setAssets((data as any[]) || []);
  };

  const loadTrusts = async () => {
    const { data } = await supabase
      .from('heirway_trust_progress' as any)
      .select('id, trust_name, trust_type')
      .eq('user_id', userId);
    setUserTrusts((data as any[]) || []);
  };

  const loadSilverPrice = async () => {
    const { data } = await supabase
      .from('heirway_clients')
      .select('silver_spot_price')
      .eq('user_id', userId)
      .maybeSingle();
    setSilverSpotPrice(Number((data as any)?.silver_spot_price) || 0);
  };

  // Silver auto-calculation: 1 oz per trust × spot price
  const silverTotalValue = silverSpotPrice * userTrusts.length;

  const riskyAssets = assets.filter(a => a.entity_type !== 'private_trust');
  const protectedAssets = assets.filter(a => a.entity_type === 'private_trust');
  const totalValue = assets.reduce((sum, a) => sum + (Number(a.estimated_value) || 0), 0) + silverTotalValue;

  const isLLC = form.asset_type === 'llc';

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', asset_type: 'real_estate', estimated_value: '', entity_type: 'none', entity_name: '', notes: '', trust_id: '', llc_state: '' });
    setDialogOpen(true);
  };

  const openEdit = (asset: Asset) => {
    setEditing(asset);
    setForm({
      name: asset.name,
      asset_type: asset.asset_type,
      estimated_value: String(asset.estimated_value || ''),
      entity_type: asset.entity_type || 'none',
      entity_name: asset.entity_name || '',
      notes: asset.notes || '',
      trust_id: asset.trust_id || '',
      llc_state: asset.llc_state || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Asset name is required'); return; }

    const isPrivateTrust = form.entity_type === 'private_trust';

    if (isLLC && !form.llc_state) { toast.error('Please select the state the LLC is formed in'); return; }

    if (isPrivateTrust && userTrusts.length > 0 && !form.trust_id) {
      toast.error('Please select which trust holds this asset'); return;
    }

    const payload: any = {
      user_id: userId,
      client_id: clientId,
      name: form.name.trim(),
      asset_type: form.asset_type,
      estimated_value: Number(form.estimated_value) || 0,
      entity_type: form.entity_type,
      entity_name: isPrivateTrust && form.trust_id
        ? userTrusts.find(t => t.id === form.trust_id)?.trust_name || form.entity_name.trim() || null
        : form.entity_name.trim() || null,
      in_private_trust: isPrivateTrust,
      notes: form.notes.trim() || null,
      trust_id: isPrivateTrust && form.trust_id ? form.trust_id : null,
      llc_state: isLLC ? form.llc_state : null,
    };

    if (editing) {
      const { error } = await supabase.from('heirway_assets' as any).update(payload).eq('id', editing.id);
      if (error) { toast.error('Failed to update'); return; }
      toast.success('Asset updated');
    } else {
      const { error } = await supabase.from('heirway_assets' as any).insert(payload);
      if (error) { toast.error('Failed to add asset'); return; }
      toast.success('Asset added');
    }
    setDialogOpen(false);
    loadAssets();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('heirway_assets' as any).delete().eq('id', id);
    toast.success('Asset removed');
    loadAssets();
  };

  const formatCurrency = (val: number, compact = false) => {
    if (val <= 0) return '—';
    if (compact && val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (compact && val >= 1_000) return `$${(val / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  const getTypeLabel = (val: string) => ASSET_TYPES.find(t => t.value === val)?.label || val;
  const getEntityLabel = (val: string) => ENTITY_TYPES.find(t => t.value === val)?.label || val;

  const getTrustNameForAsset = (asset: Asset) => {
    if (asset.trust_id) {
      const t = userTrusts.find(tr => tr.id === asset.trust_id);
      if (t) return t.trust_name;
    }
    return asset.entity_name || 'Private Trust';
  };

  return (
    <>
      <GoldHeaderCard
        title="Asset Tracker"
        icon={<Package className="w-4 h-4 text-primary" />}
        description="Track your assets and identify protection gaps"
        headerAction={
          <Button size="sm" onClick={openAdd} className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Asset
          </Button>
        }
      >
        {/* Summary row */}
        {(assets.length > 0 || silverTotalValue > 0) && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-muted/30 border border-border/40 text-center">
              <p className="text-lg font-bold text-foreground">{assets.length + (silverTotalValue > 0 ? 1 : 0)}</p>
              <p className="text-xs text-muted-foreground">Total Assets</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border/40 text-center">
              <p className="text-lg font-bold text-foreground">{formatCurrency(totalValue, true)}</p>
              <p className="text-xs text-muted-foreground">Est. Value</p>
            </div>
            <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-center">
              <p className="text-lg font-bold text-destructive">{riskyAssets.length}</p>
              <p className="text-xs text-muted-foreground">At Risk</p>
            </div>
          </div>
        )}

        {/* Risk banner */}
        {riskyAssets.length > 0 && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20 mb-4">
            <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-foreground">
                {riskyAssets.length} asset{riskyAssets.length > 1 ? 's' : ''} not in a private trust
              </p>
              <p className="text-[11px] text-muted-foreground">
                Assets held outside a private trust may be exposed to probate, lawsuits, or creditors.
              </p>
            </div>
          </div>
        )}

        {/* Silver Holdings - auto-calculated protected asset */}
        {silverTotalValue > 0 && userTrusts.length > 0 && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 border border-green-500/20 mb-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-500/10 border border-green-500/20">
                <Coins className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Silver Holdings</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20">
                    <Shield className="w-2.5 h-2.5 mr-0.5" /> Protected
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {userTrusts.length} trust{userTrusts.length !== 1 ? 's' : ''} × 1 oz @ {formatCurrency(silverSpotPrice)}/oz
                  </span>
                </div>
              </div>
            </div>
            <span className="text-sm font-semibold text-foreground">{formatCurrency(silverTotalValue, true)}</span>
          </div>
        )}

        {/* Asset list */}
        {assets.length === 0 && silverTotalValue === 0 ? (
          <div className="text-center py-8">
            <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No assets tracked yet. Add your first asset to start.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {assets.map(asset => (
              <div key={asset.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    asset.entity_type === 'private_trust'
                      ? 'bg-green-500/10 border border-green-500/20'
                      : 'bg-destructive/10 border border-destructive/20'
                  }`}>
                    {asset.entity_type === 'private_trust' ? (
                      <Shield className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{asset.name}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">{getTypeLabel(asset.asset_type)}</Badge>
                      {asset.entity_type === 'private_trust' && asset.trust_id ? (
                        <Badge variant="outline" className={`text-[10px] ${getTrustBgClass(userTrusts.find(t => t.id === asset.trust_id)?.trust_type || '')}`}>
                          {getTrustNameForAsset(asset)}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">{getEntityLabel(asset.entity_type)}</span>
                      )}
                      {asset.asset_type === 'llc' && asset.llc_state && (
                        <Badge variant="outline" className="text-[10px]">{asset.llc_state}</Badge>
                      )}
                      {(asset.estimated_value || 0) > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {formatCurrency(Number(asset.estimated_value), true)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(asset)} className="text-muted-foreground hover:text-foreground">
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(asset.id)} className="text-destructive/60 hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </GoldHeaderCard>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-panel border-primary/20 max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Asset' : 'Add Asset'}</DialogTitle>
            <DialogDescription>Track an asset and its protection status</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Asset Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Primary Residence" className="glass-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Asset Type</Label>
                <Select value={form.asset_type} onValueChange={v => setForm(f => ({ ...f, asset_type: v }))}>
                  <SelectTrigger className="glass-input"><SelectValue /></SelectTrigger>
                  <SelectContent>{ASSET_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estimated Value</Label>
                <Input type="number" value={form.estimated_value} onChange={e => setForm(f => ({ ...f, estimated_value: e.target.value }))} placeholder="0" className="glass-input" />
              </div>
            </div>

            {isLLC && (
              <div>
                <Label>LLC State of Formation *</Label>
                <Select value={form.llc_state} onValueChange={v => setForm(f => ({ ...f, llc_state: v }))}>
                  <SelectTrigger className="glass-input"><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>
                    {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>{isLLC ? 'Owned By' : 'Held In (Entity Type)'}</Label>
              <Select value={form.entity_type} onValueChange={v => setForm(f => ({ ...f, entity_type: v, trust_id: '' }))}>
                <SelectTrigger className="glass-input"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Entity (Personal)</SelectItem>
                  <SelectItem value="revocable_trust">Revocable Trust</SelectItem>
                  {tier === 'trust' && (
                    <SelectItem value="private_trust">Private Trust</SelectItem>
                  )}
                  {!isLLC && (
                    <>
                      <SelectItem value="llc">LLC</SelectItem>
                      <SelectItem value="corporation">Corporation</SelectItem>
                      <SelectItem value="partnership">Partnership</SelectItem>
                      <SelectItem value="other">Other Entity</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {form.entity_type === 'private_trust' && userTrusts.length > 0 && (
              <div>
                <Label>Select Trust *</Label>
                <Select value={form.trust_id} onValueChange={v => setForm(f => ({ ...f, trust_id: v }))}>
                  <SelectTrigger className="glass-input"><SelectValue placeholder="Choose a trust..." /></SelectTrigger>
                  <SelectContent>
                    {userTrusts.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        <span className="flex items-center gap-2">
                          {t.trust_name}
                          <span className="text-[10px] text-muted-foreground capitalize">({getTrustLabel(t.trust_type)})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {form.entity_type === 'private_trust' && userTrusts.length === 0 && (
              <p className="text-xs text-muted-foreground p-2 rounded bg-muted/30 border border-border/40">
                No trusts in your structure yet. Your advisor will create trusts for you.
              </p>
            )}

            {form.entity_type !== 'none' && form.entity_type !== 'private_trust' && (
              <div>
                <Label>Entity Name</Label>
                <Input value={form.entity_name} onChange={e => setForm(f => ({ ...f, entity_name: e.target.value }))} placeholder="e.g. Thompson Holdings LLC" className="glass-input" />
              </div>
            )}

            <div>
              <Label>Notes (optional)</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional details" className="glass-input" />
            </div>
            <Button onClick={handleSave} className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground">
              {editing ? 'Update Asset' : 'Add Asset'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
