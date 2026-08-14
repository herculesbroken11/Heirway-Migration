import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';

export interface Dependent {
  full_name: string;
  date_of_birth: string;
  relationship: string;
  living_with_you: boolean;
  special_needs: boolean;
  married: boolean;
  grandchildren_names: string;
}

export interface AdditionalDependent {
  name: string;
  relationship: string;
  support_details: string;
}

interface Props {
  hasChildren: boolean;
  dependents: Dependent[];
  additionalDependents: AdditionalDependent[];
  hasAdditionalDependents: boolean;
  onDependentsChange: (deps: Dependent[]) => void;
  onAdditionalChange: (deps: AdditionalDependent[]) => void;
  onHasAdditionalChange: (v: boolean) => void;
}

const emptyDependent: Dependent = { full_name: '', date_of_birth: '', relationship: '', living_with_you: true, special_needs: false, married: false, grandchildren_names: '' };
const emptyAdditional: AdditionalDependent = { name: '', relationship: '', support_details: '' };

export default function IntakeSectionDependents({ hasChildren, dependents, additionalDependents, hasAdditionalDependents, onDependentsChange, onAdditionalChange, onHasAdditionalChange }: Props) {
  const updateDep = (i: number, field: keyof Dependent, value: any) => {
    const updated = [...dependents];
    updated[i] = { ...updated[i], [field]: value };
    onDependentsChange(updated);
  };

  return (
    <div className="space-y-8">
      {hasChildren && (
        <div>
          <h3 className="text-lg font-display font-bold text-foreground mb-1">Children & Dependents</h3>
          <p className="text-sm text-muted-foreground mb-4">List each child or dependent for the estate plan.</p>

          {dependents.map((dep, i) => (
            <div key={i} className="glass-panel p-4 rounded-lg mb-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Dependent {i + 1}</span>
                {dependents.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => onDependentsChange(dependents.filter((_, j) => j !== i))}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Full Legal Name *</Label>
                  <Input className="glass-input mt-1" value={dep.full_name} onChange={e => updateDep(i, 'full_name', e.target.value)} />
                </div>
                <div>
                  <Label>Date of Birth</Label>
                  <Input type="date" className="glass-input mt-1" value={dep.date_of_birth} onChange={e => updateDep(i, 'date_of_birth', e.target.value)} />
                </div>
                <div>
                  <Label>Relationship *</Label>
                  <Input className="glass-input mt-1" value={dep.relationship} onChange={e => updateDep(i, 'relationship', e.target.value)} placeholder="e.g. Son, Daughter, Stepchild" />
                </div>
                <div className="flex flex-col gap-2 pt-5">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={dep.living_with_you} onChange={e => updateDep(i, 'living_with_you', e.target.checked)} className="rounded border-border" />
                    Living with you
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={dep.special_needs} onChange={e => updateDep(i, 'special_needs', e.target.checked)} className="rounded border-border" />
                    Special needs considerations
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={dep.married} onChange={e => updateDep(i, 'married', e.target.checked)} className="rounded border-border" />
                    Married
                  </label>
                </div>
              </div>
              <div>
                <Label>Their children's names (if any)</Label>
                <Input className="glass-input mt-1" value={dep.grandchildren_names} onChange={e => updateDep(i, 'grandchildren_names', e.target.value)} placeholder="Comma-separated names" />
              </div>
            </div>
          ))}

          <Button variant="outline" size="sm" onClick={() => onDependentsChange([...dependents, { ...emptyDependent }])}>
            <Plus className="w-4 h-4 mr-1" /> Add Dependent
          </Button>
        </div>
      )}

      {/* Additional dependents */}
      <div>
        <h3 className="text-lg font-display font-bold text-foreground mb-1">Additional Financial Dependents</h3>
        <p className="text-sm text-muted-foreground mb-3">Is there anyone else you financially support who should be considered?</p>
        <div className="flex gap-3 mb-4">
          <Button variant={hasAdditionalDependents ? 'default' : 'outline'} size="sm" onClick={() => onHasAdditionalChange(true)}>Yes</Button>
          <Button variant={!hasAdditionalDependents ? 'default' : 'outline'} size="sm" onClick={() => { onHasAdditionalChange(false); onAdditionalChange([]); }}>No</Button>
        </div>

        {hasAdditionalDependents && (
          <>
            {additionalDependents.map((dep, i) => (
              <div key={i} className="glass-panel p-4 rounded-lg mb-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Person {i + 1}</span>
                  {additionalDependents.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => onAdditionalChange(additionalDependents.filter((_, j) => j !== i))}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><Label>Name</Label><Input className="glass-input mt-1" value={dep.name} onChange={e => { const u = [...additionalDependents]; u[i] = { ...u[i], name: e.target.value }; onAdditionalChange(u); }} /></div>
                  <div><Label>Relationship</Label><Input className="glass-input mt-1" value={dep.relationship} onChange={e => { const u = [...additionalDependents]; u[i] = { ...u[i], relationship: e.target.value }; onAdditionalChange(u); }} /></div>
                </div>
                <div><Label>Support Details</Label><Textarea className="glass-input mt-1" value={dep.support_details} onChange={e => { const u = [...additionalDependents]; u[i] = { ...u[i], support_details: e.target.value }; onAdditionalChange(u); }} /></div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => onAdditionalChange([...additionalDependents, { ...emptyAdditional }])}>
              <Plus className="w-4 h-4 mr-1" /> Add Person
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
