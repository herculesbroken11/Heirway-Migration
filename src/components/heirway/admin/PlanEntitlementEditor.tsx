import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Loader2, Shield, KeyRound } from 'lucide-react';
import type { ClientPortalTier, HeirwayPlanCatalogRow } from '@/lib/planCatalogTypes';
import { CLIENT_PORTAL_TIER_OPTIONS } from '@/lib/planCatalogTypes';
import {
  fetchPlanCatalog,
  getContentAccessKeyOptions,
  entitlementArraysEqual,
  updatePlanEntitlements,
} from '@/lib/planCatalog';

interface EntitlementEditState {
  client_portal_tier: ClientPortalTier | null;
  content_access_keys: string[];
}

function toEntitlementState(row: HeirwayPlanCatalogRow): EntitlementEditState {
  const tier = row.client_portal_tier;
  const validTier =
    tier === 'free' || tier === 'education' || tier === 'trust' ? tier : null;
  return {
    client_portal_tier: validTier,
    content_access_keys: [...row.content_access_keys],
  };
}

function formatAccessKeys(keys: string[]): string {
  if (!keys.length) return '(empty)';
  return keys.join(', ');
}

export default function PlanEntitlementEditor() {
  const [plans, setPlans] = useState<HeirwayPlanCatalogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editRow, setEditRow] = useState<HeirwayPlanCatalogRow | null>(null);
  const [editState, setEditState] = useState<EntitlementEditState | null>(null);
  const [snapshot, setSnapshot] = useState<EntitlementEditState | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const contentKeyOptions = useMemo(
    () => getContentAccessKeyOptions(plans),
    [plans],
  );

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

  const isDirty =
    editRow &&
    editState &&
    snapshot &&
    (editState.client_portal_tier !== snapshot.client_portal_tier ||
      !entitlementArraysEqual(editState.content_access_keys, snapshot.content_access_keys));

  const openEdit = (row: HeirwayPlanCatalogRow) => {
    const state = toEntitlementState(row);
    setEditRow(row);
    setEditState(state);
    setSnapshot(state);
  };

  const closeEdit = () => {
    setEditRow(null);
    setEditState(null);
    setSnapshot(null);
    setConfirmOpen(false);
  };

  const handleReset = () => {
    if (snapshot) setEditState({ ...snapshot, content_access_keys: [...snapshot.content_access_keys] });
  };

  const toggleContentKey = (key: string, checked: boolean) => {
    if (!editState) return;
    setEditState({
      ...editState,
      content_access_keys: checked
        ? [...editState.content_access_keys, key]
        : editState.content_access_keys.filter((k) => k !== key),
    });
  };

  const handleSaveClick = () => {
    if (!editRow || !editState) return;
    if (isDirty) {
      setConfirmOpen(true);
      return;
    }
    closeEdit();
  };

  const handleConfirmedSave = async () => {
    if (!editRow || !editState) return;

    setSaving(true);
    const { data, error } = await updatePlanEntitlements(editRow.internal_key, {
      client_portal_tier: editState.client_portal_tier,
      content_access_keys: [...editState.content_access_keys],
    });
    setSaving(false);
    setConfirmOpen(false);

    if (error) {
      toast.error('Failed to save entitlements: ' + error);
      return;
    }

    toast.success('Plan entitlements updated');
    if (data) {
      setPlans((prev) =>
        prev.map((p) => (p.internal_key === data.internal_key ? data : p)),
      );
    }
    closeEdit();
    await loadPlans();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading entitlement configuration…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-display font-bold flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Customer Access / Entitlements
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            Configure which portal tier and learning/KB content keys each plan unlocks via{' '}
            <code className="text-[10px]">can_access_plan_content()</code>. Each selected key
            grants explicit access only — no automatic hierarchy. Changes apply to live
            authorization after save.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadPlans}>Refresh</Button>
      </div>

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-muted-foreground">
        <strong className="text-foreground">Plan presentation</strong> (display name, offered,
        checkout keys) is configured in the section above. This section controls{' '}
        <strong className="text-foreground">customer access</strong> only.
      </div>

      <div className="grid gap-3">
        {plans.map((row) => (
          <Card key={row.internal_key} className="glass-panel">
            <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground">{row.display_name}</span>
                  <Badge variant="outline" className="text-[10px] font-mono">{row.internal_key}</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Portal tier: {row.client_portal_tier ?? 'None'}
                  · Content keys: {formatAccessKeys(row.content_access_keys)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  selected_plan_key: {row.selected_plan_key} (immutable)
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
                <KeyRound className="w-3.5 h-3.5 mr-1" /> Edit access
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={editRow !== null} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="glass-panel border-primary/20 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit customer access — {editRow?.display_name}</DialogTitle>
            <DialogDescription>
              Immutable identifiers are shown for reference. Saving updates live authorization for
              customers on this plan.
            </DialogDescription>
          </DialogHeader>

          {editRow && editState && (
            <div className="space-y-4">
              {isDirty && (
                <Badge variant="outline" className="text-amber-600 border-amber-500/50">
                  Unsaved changes
                </Badge>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs rounded-md bg-muted/40 p-3">
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
              </div>

              <div>
                <Label>Client portal access</Label>
                <Select
                  value={editState.client_portal_tier ?? 'none'}
                  onValueChange={(v) =>
                    setEditState({
                      ...editState,
                      client_portal_tier:
                        v === 'none' ? null : (v as ClientPortalTier),
                    })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select portal tier" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIENT_PORTAL_TIER_OPTIONS.map((opt) => (
                      <SelectItem
                        key={opt.label}
                        value={opt.value ?? 'none'}
                      >
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1">
                  DB values: None (NULL), free, education, trust
                </p>
              </div>

              <div>
                <Label>Content / learning access keys</Label>
                <p className="text-[10px] text-muted-foreground mt-1 mb-2">
                  Explicit keys only — selecting Foundation does not include Education.
                </p>
                <div className="space-y-2 rounded-md border border-border/60 p-3">
                  {contentKeyOptions.map((opt) => {
                    const checked = editState.content_access_keys.includes(opt.key);
                    return (
                      <div key={opt.key} className="flex items-start gap-2">
                        <Checkbox
                          id={`entitlement-key-${editRow.internal_key}-${opt.key}`}
                          checked={checked}
                          onCheckedChange={(v) => toggleContentKey(opt.key, v === true)}
                        />
                        <label
                          htmlFor={`entitlement-key-${editRow.internal_key}-${opt.key}`}
                          className="text-sm leading-tight cursor-pointer"
                        >
                          {opt.displayName}
                          <span className="block text-[10px] font-mono text-muted-foreground">
                            ({opt.key})
                          </span>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 flex-wrap">
                <Button variant="outline" onClick={closeEdit}>Cancel</Button>
                <Button variant="outline" onClick={handleReset} disabled={!isDirty}>
                  Reset
                </Button>
                <Button onClick={handleSaveClick} disabled={saving || !isDirty}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save access'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm entitlement change</AlertDialogTitle>
            <AlertDialogDescription>
              Changing plan entitlements affects what application content customers on this plan
              can access. This updates live authorization immediately after save.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmedSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save entitlements'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
