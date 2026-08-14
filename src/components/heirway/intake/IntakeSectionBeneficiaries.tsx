import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, AlertCircle, PlayCircle } from 'lucide-react';
import { useIntakeVideo } from '@/hooks/useIntakeVideos';
import EnforcedVideoPlayer from '@/components/heirway/learning/EnforcedVideoPlayer';

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia',
  'Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland',
  'Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey',
  'New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina',
  'South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming'
];

export interface Beneficiary {
  name: string;
  full_address: string; // kept for backward compatibility
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  units: string;
  relationship: string;
  is_passive: boolean;
  requires_special_care?: boolean;
}

interface Props {
  beneficiaries: Beneficiary[];
  onChange: (b: Beneficiary[]) => void;
  showSpecialCare?: boolean;
}

const emptyBeneficiary: Beneficiary = {
  name: '', full_address: '', address_street: '', address_city: '', address_state: '', address_zip: '',
  units: '', relationship: '', is_passive: false, requires_special_care: false,
};

export default function IntakeSectionBeneficiaries({ beneficiaries, onChange, showSpecialCare = false }: Props) {
  const { videoUrl } = useIntakeVideo('beneficiaries');

  const update = (i: number, field: keyof Beneficiary, value: any) => {
    const updated = [...beneficiaries];
    updated[i] = { ...updated[i], [field]: value };
    // Keep full_address in sync for backward compat
    if (['address_street', 'address_city', 'address_state', 'address_zip'].includes(field)) {
      const b = updated[i];
      updated[i].full_address = [b.address_street, b.address_city, b.address_state, b.address_zip].filter(Boolean).join(', ');
    }
    onChange(updated);
  };

  // Migrate legacy data: if full_address exists but structured fields don't
  const ensureStructured = (b: Beneficiary): Beneficiary => ({
    ...emptyBeneficiary,
    ...b,
    address_street: b.address_street || '',
    address_city: b.address_city || '',
    address_state: b.address_state || '',
    address_zip: b.address_zip || '',
  });

  const items = beneficiaries.map(ensureStructured);
  const totalUnits = items.reduce((sum, b) => sum + (parseFloat(b.units) || 0), 0);
  const isValid = Math.abs(totalUnits - 200) < 0.01;

  return (
    <div className="space-y-6">
      <div className="glass-panel p-4 rounded-lg border-primary/20">
        <p className="text-sm text-muted-foreground">
          <strong>Beneficiaries are typically your kiddos and/or loved ones</strong> — the people who will benefit from the trust. Total must equal <strong>200 units (100%)</strong>. The first beneficiary listed is the <strong>Passive Beneficiary</strong> (will never serve as a trustee), typically someone very senior — often above the age of 80 or 90 — and is usually assigned 0.01–0.05 units. Remaining beneficiaries share the rest.
        </p>
      </div>

      {items.map((b, i) => (
        <div key={i} className="glass-panel p-4 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              {i === 0 ? 'Passive Beneficiary (Required)' : `Beneficiary ${i + 1}`}
            </span>
            {i > 0 && items.length > 2 && (
              <Button variant="ghost" size="sm" onClick={() => onChange(beneficiaries.filter((_, j) => j !== i))}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label>Full Name *</Label><Input className="glass-input mt-1" value={b.name} onChange={e => update(i, 'name', e.target.value)} /></div>
            <div><Label>Relationship *</Label><Input className="glass-input mt-1" value={b.relationship} onChange={e => update(i, 'relationship', e.target.value)} /></div>
          </div>

          {/* Structured Address */}
          <div>
            <Label>Street Address *</Label>
            <Input className="glass-input mt-1" value={b.address_street} onChange={e => update(i, 'address_street', e.target.value)} placeholder="123 Main St" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>City *</Label>
              <Input className="glass-input mt-1" value={b.address_city} onChange={e => update(i, 'address_city', e.target.value)} />
            </div>
            <div>
              <Label>State *</Label>
              <Select value={b.address_state} onValueChange={v => update(i, 'address_state', v)}>
                <SelectTrigger className="glass-input mt-1"><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>ZIP *</Label>
              <Input className="glass-input mt-1" value={b.address_zip} onChange={e => update(i, 'address_zip', e.target.value)} placeholder="12345" />
            </div>
          </div>

          <div>
            <Label>Units Assigned *</Label>
            <p className="text-xs text-muted-foreground">{i === 0 ? '0.01–0.05 typical for passive beneficiary' : 'Distribute remaining units'}</p>
            <Input type="number" step="0.01" className="glass-input mt-1 w-full md:w-[200px]" value={b.units} onChange={e => update(i, 'units', e.target.value)} />
          </div>

          {showSpecialCare && !b.is_passive && (
            <label className="flex items-center gap-2 pt-1">
              <Checkbox
                checked={b.requires_special_care || false}
                onCheckedChange={(checked) => update(i, 'requires_special_care', !!checked)}
              />
              <span className="text-sm font-medium text-foreground">Requires Special Care</span>
            </label>
          )}
        </div>
      ))}

      <Button variant="outline" size="sm" onClick={() => onChange([...beneficiaries, { ...emptyBeneficiary }])}>
        <Plus className="w-4 h-4 mr-1" /> Add Beneficiary
      </Button>

      <div className={`flex items-center gap-2 p-3 rounded-lg ${isValid ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
        {!isValid && <AlertCircle className="w-4 h-4" />}
        <span className="text-sm font-medium">Total: {totalUnits.toFixed(2)} / 200 units {isValid ? '✓' : '(must equal 200)'}</span>
      </div>
    </div>
  );
}
