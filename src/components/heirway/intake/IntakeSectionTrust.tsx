import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HEIRWAY_PLANS } from '@/lib/heirwayPlans';
import { isValidZip } from '@/lib/validation';

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia',
  'Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland',
  'Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey',
  'New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina',
  'South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming'
];

interface TrustData {
  trust_names: string[];
  trust_address_street: string;
  trust_address_city: string;
  trust_address_state: string;
  trust_address_zip: string;
  trust_domicile_state: string;
  business_name: string;
  business_type: string;
  business_description: string;
  business_revenue: string;
}

interface Props {
  data: TrustData;
  onChange: (data: Partial<TrustData>) => void;
  selectedPlan: string;
}

const TRUST_NAME_LABELS = [
  'Primary Trust Name',
  'Secondary Trust Name',
  'Third Trust Name',
  'Fourth Trust Name',
];

export default function IntakeSectionTrust({ data, onChange, selectedPlan }: Props) {
  const plan = HEIRWAY_PLANS[selectedPlan];
  const requiredCount = plan?.trustCount || 4;
  const isBusinessPlan = selectedPlan === 'business';

  const updateTrustName = (index: number, value: string) => {
    const updated = [...data.trust_names];
    while (updated.length < requiredCount) updated.push('');
    updated[index] = value;
    onChange({ trust_names: updated });
  };

  const trustNames = [...(data.trust_names || [])];
  while (trustNames.length < requiredCount) trustNames.push('');

  const labels = TRUST_NAME_LABELS.slice(0, requiredCount);

  // Check for duplicate trust names
  const filledNames = trustNames.filter(n => n.trim() !== '');
  const lowerNames = filledNames.map(n => n.trim().toLowerCase());
  const hasDuplicates = lowerNames.length !== new Set(lowerNames).size;

  const getDuplicateIndex = (index: number): boolean => {
    const name = (trustNames[index] || '').trim().toLowerCase();
    if (!name) return false;
    return trustNames.some((n, j) => j !== index && n.trim().toLowerCase() === name);
  };

  const zipValid = !data.trust_address_zip || isValidZip(data.trust_address_zip);

  return (
    <div className="space-y-6">
      <div className="glass-panel p-4 rounded-lg border-primary/20">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            Your plan uses a <strong>multi-trust structure</strong> requiring multiple unique trust names so come up with at least {requiredCount} names. Do NOT add "Trust" — we will add it for you. Avoid using your personal name if you want privacy. <strong>Don't over think it.</strong> Example: "ABC 123 Legacy"
          </p>
        </div>
      </div>

      {labels.map((label, i) => (
        <div key={i}>
          <Label>{label} *</Label>
          <Input
            className={cn("glass-input mt-1", getDuplicateIndex(i) && "border-destructive")}
            value={trustNames[i] || ''}
            onChange={e => updateTrustName(i, e.target.value)}
            placeholder={`Enter name for ${label}`}
            required
          />
          {trustNames[i] && !getDuplicateIndex(i) && (
            <p className="text-xs text-primary mt-1">Will be formatted as: <strong>{trustNames[i]} Trust</strong></p>
          )}
          {getDuplicateIndex(i) && (
            <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Trust names must be unique</p>
          )}
        </div>
      ))}

      {hasDuplicates && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Each trust name must be unique</span>
        </div>
      )}

      {isBusinessPlan && (
        <div className="space-y-4 pt-4 border-t border-border">
          <h3 className="text-lg font-display font-bold text-foreground">Business Information</h3>
          <p className="text-sm text-muted-foreground">Since you selected the Business plan, please provide details about your business.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Business Name *</Label>
              <Input className="glass-input mt-1" value={data.business_name} onChange={e => onChange({ business_name: e.target.value })} placeholder="e.g. Smith Consulting LLC" required />
            </div>
            <div>
              <Label>Business Type *</Label>
              <Select value={data.business_type} onValueChange={v => onChange({ business_type: v })}>
                <SelectTrigger className="glass-input mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sole_proprietorship">Sole Proprietorship</SelectItem>
                  <SelectItem value="llc">LLC</SelectItem>
                  <SelectItem value="s_corp">S-Corp</SelectItem>
                  <SelectItem value="c_corp">C-Corp</SelectItem>
                  <SelectItem value="partnership">Partnership</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Business Description *</Label>
            <Textarea className="glass-input mt-1" value={data.business_description} onChange={e => onChange({ business_description: e.target.value })} placeholder="Brief description of what your business does" rows={3} />
          </div>

          <div>
            <Label>Approximate Annual Revenue *</Label>
            <Select value={data.business_revenue} onValueChange={v => onChange({ business_revenue: v })}>
              <SelectTrigger className="glass-input mt-1 w-full md:w-[280px]"><SelectValue placeholder="Select range" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="under_100k">Under $100K</SelectItem>
                <SelectItem value="100k_500k">$100K – $500K</SelectItem>
                <SelectItem value="500k_1m">$500K – $1M</SelectItem>
                <SelectItem value="1m_5m">$1M – $5M</SelectItem>
                <SelectItem value="5m_plus">$5M+</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="pt-4 border-t border-border">
        <h3 className="text-lg font-display font-bold text-foreground mb-3">Trust Headquarters Address</h3>
        <div className="space-y-3">
          <div>
            <Label>Street Address *</Label>
            <Input className="glass-input mt-1" value={data.trust_address_street} onChange={e => onChange({ trust_address_street: e.target.value })} required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>City *</Label>
              <Input className="glass-input mt-1" value={data.trust_address_city} onChange={e => onChange({ trust_address_city: e.target.value })} required />
            </div>
            <div>
              <Label>State *</Label>
              <Select value={data.trust_address_state} onValueChange={v => onChange({ trust_address_state: v })}>
                <SelectTrigger className="glass-input mt-1"><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>ZIP *</Label>
              <Input className={cn("glass-input mt-1", !zipValid && "border-destructive")} value={data.trust_address_zip} onChange={e => onChange({ trust_address_zip: e.target.value })} placeholder="12345" required />
              {!zipValid && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Enter a valid ZIP code</p>}
            </div>
          </div>
        </div>
      </div>

      <div>
        <Label>Domiciled State of Origin *</Label>
        <p className="text-xs text-muted-foreground mb-1">Usually your state of residence unless you choose otherwise.</p>
        <Select value={data.trust_domicile_state} onValueChange={v => onChange({ trust_domicile_state: v })}>
          <SelectTrigger className="glass-input mt-1 w-full md:w-[280px]"><SelectValue placeholder="Select state" /></SelectTrigger>
          <SelectContent>{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    </div>
  );
}
