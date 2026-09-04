import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Pencil, Settings2 } from 'lucide-react';
import type { HeirwayPlanCatalogRow, PlanCatalogEditableFields } from '@/lib/planCatalogTypes';
import { fetchPlanCatalog, updatePlanCatalogRow } from '@/lib/planCatalog';

interface EditState {
  display_name: string;
  offered: boolean;
  active: boolean;
  sort_order: number;
  stripe_checkout_key: string;
  metadataJson: string;
}

function toEditState(row: HeirwayPlanCatalogRow): EditState {
  return {
    display_name: row.display_name,
    offered: row.offered,
    active: row.active,
    sort_order: row.sort_order,
    stripe_checkout_key: row.stripe_checkout_key ?? '',
    metadataJson: JSON.stringify(row.metadata ?? {}, null, 2),
  };
}

export default function PlanConfigurationManager() {
  const [plans, setPlans] = useState<HeirwayPlanCatalogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editRow, setEditRow] = useState<HeirwayPlanCatalogRow | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);

  const loadPlans = async () => {
    setLoading(true);
    const { data, error } = await fetchPlanCatalog();
    if (error) {
      toast.error('Failed to load plan catalog: ' + error);
      setPlans([]);
    } else {
      setPlans(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const openEdit = (row: HeirwayPlanCatalogRow) => {
    setEditRow(row);
    setEditState(toEditState(row));
  };

  const closeEdit = () => {
    setEditRow(null);
    setEditState(null);
  };

  const handleSave = async () => {
    if (!editRow || !editState) return;

    let metadata: PlanCatalogEditableFields['metadata'];
    try {
      metadata = JSON.parse(editState.metadataJson);
    } catch {
      toast.error('Metadata must be valid JSON');
      return;
    }

    setSaving(true);
    const fields: PlanCatalogEditableFields = {
      display_name: editState.display_name.trim(),
      offered: editState.offered,
      active: editState.active,
      sort_order: editState.sort_order,
      stripe_checkout_key: editState.stripe_checkout_key.trim() || null,
      metadata,
    };

    const { error } = await updatePlanCatalogRow(editRow.internal_key, fields);
    setSaving(false);

    if (error) {
      toast.error('Save failed: ' + error);
      return;
    }

    toast.success('Plan catalog updated');
    closeEdit();
    await loadPlans();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading plan catalog…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-display font-bold flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-primary" />
            Plan Configuration
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Manage catalog display and visibility. Customer access entitlements are configured in
            the section below.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadPlans}>Refresh</Button>
      </div>

      <div className="grid gap-3">
        {plans.map((row) => (
          <Card key={row.internal_key} className="glass-panel">
            <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground">{row.display_name}</span>
                  <Badge variant="outline" className="text-[10px]">{row.internal_key}</Badge>
                  {!row.active && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                  {row.offered && <Badge className="text-[10px] bg-primary/20 text-primary">Offered</Badge>}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  selected_plan: {row.selected_plan_key}
                  {row.stripe_checkout_key ? ` · checkout: ${row.stripe_checkout_key}` : ''}
                  · sort {row.sort_order}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
                <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={editRow !== null} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="glass-panel border-primary/20 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Plan — {editRow?.internal_key}</DialogTitle>
            <DialogDescription>
              Presentation and catalog visibility fields. Customer access is configured separately
              below.
            </DialogDescription>
          </DialogHeader>

          {editRow && editState && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <Label className="text-muted-foreground">internal_key</Label>
                  <p className="font-mono mt-1">{editRow.internal_key}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">selected_plan_key</Label>
                  <p className="font-mono mt-1">{editRow.selected_plan_key}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">plan_category</Label>
                  <p className="mt-1">{editRow.plan_category}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">client_portal_tier</Label>
                  <p className="mt-1">{editRow.client_portal_tier ?? '—'}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-muted-foreground">content_access_keys</Label>
                  <p className="mt-1 font-mono text-[11px]">
                    {editRow.content_access_keys.length
                      ? editRow.content_access_keys.join(', ')
                      : '(empty)'}
                  </p>
                </div>
              </div>

              <div>
                <Label>Display name</Label>
                <Input
                  className="mt-1"
                  value={editState.display_name}
                  onChange={(e) => setEditState({ ...editState, display_name: e.target.value })}
                />
              </div>

              <div>
                <Label>Stripe checkout key</Label>
                <Input
                  className="mt-1 font-mono text-xs"
                  placeholder="Leave empty if none"
                  value={editState.stripe_checkout_key}
                  onChange={(e) => setEditState({ ...editState, stripe_checkout_key: e.target.value })}
                />
              </div>

              <div>
                <Label>Sort order</Label>
                <Input
                  type="number"
                  className="mt-1"
                  value={editState.sort_order}
                  onChange={(e) =>
                    setEditState({ ...editState, sort_order: Number(e.target.value) || 0 })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Offered</Label>
                <Switch
                  checked={editState.offered}
                  onCheckedChange={(v) => setEditState({ ...editState, offered: v })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch
                  checked={editState.active}
                  onCheckedChange={(v) => setEditState({ ...editState, active: v })}
                />
              </div>

              <div>
                <Label>Metadata (JSON)</Label>
                <Textarea
                  className="mt-1 font-mono text-xs min-h-[100px]"
                  value={editState.metadataJson}
                  onChange={(e) => setEditState({ ...editState, metadataJson: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={closeEdit}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
