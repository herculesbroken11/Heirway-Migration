import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isValidEmail, isValidPhone } from '@/lib/validation';

interface TaxData {
  cpa_name: string;
  cpa_email: string;
  cpa_phone: string;
  tax_return_types: string[];
  tax_return_other: string;
  last_tax_year: string;
  estimated_current_income: string;
  major_tax_events: string;
  expects_inheritance: string;
  inheritance_details: string;
}

interface Props {
  data: TaxData;
  onChange: (data: Partial<TaxData>) => void;
}

const TAX_RETURN_OPTIONS = [
  { value: '1040', label: '1040 (Personal)' },
  { value: '1120s', label: '1120S (S-Corp)' },
  { value: '1065', label: '1065 (Partnership)' },
  { value: '1041', label: '1041 (Trust or Estate)' },
  { value: 'other', label: 'Other' },
];

const YEAR_OPTIONS = Array.from({ length: new Date().getFullYear() - 1970 + 1 }, (_, i) => {
  const y = new Date().getFullYear() - i;
  return y.toString();
});

export default function IntakeSectionTax({ data, onChange }: Props) {
  const emailValid = !data.cpa_email || isValidEmail(data.cpa_email);
  const phoneValid = !data.cpa_phone || isValidPhone(data.cpa_phone);

  const toggleTaxReturn = (val: string) => {
    const current = data.tax_return_types;
    onChange({
      tax_return_types: current.includes(val) ? current.filter(v => v !== val) : [...current, val],
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-display font-bold text-foreground mb-1">CPA / Tax Advisor</h3>
        <p className="text-sm text-muted-foreground mb-4">If applicable.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><Label>Name</Label><Input className="glass-input mt-1" value={data.cpa_name} onChange={e => onChange({ cpa_name: e.target.value })} /></div>
          <div>
            <Label>Email</Label>
            <Input type="email" className={cn("glass-input mt-1", !emailValid && "border-destructive")} value={data.cpa_email} onChange={e => onChange({ cpa_email: e.target.value })} />
            {!emailValid && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Enter a valid email</p>}
          </div>
          <div>
            <Label>Phone</Label>
            <Input type="tel" className={cn("glass-input mt-1", !phoneValid && "border-destructive")} value={data.cpa_phone} onChange={e => onChange({ cpa_phone: e.target.value })} />
            {!phoneValid && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Must be at least 10 digits</p>}
          </div>
        </div>
      </div>

      <div>
        <Label className="mb-2 block">Tax Returns Filed Last Year (check all that apply)</Label>
        <div className="space-y-2">
          {TAX_RETURN_OPTIONS.map(opt => (
            <label key={opt.value} className="flex items-center gap-2 text-sm">
              <Checkbox checked={data.tax_return_types.includes(opt.value)} onCheckedChange={() => toggleTaxReturn(opt.value)} />
              {opt.label}
            </label>
          ))}
        </div>
        {data.tax_return_types.includes('other') && (
          <Input className="glass-input mt-2" placeholder="Specify other return types" value={data.tax_return_other} onChange={e => onChange({ tax_return_other: e.target.value })} />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Last Tax Year Filed</Label>
          <Select value={data.last_tax_year} onValueChange={v => onChange({ last_tax_year: v })}>
            <SelectTrigger className="glass-input mt-1"><SelectValue placeholder="Select year" /></SelectTrigger>
            <SelectContent>
              {YEAR_OPTIONS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Estimated Income for Current Year</Label>
          <Input type="number" className="glass-input mt-1" value={data.estimated_current_income} onChange={e => onChange({ estimated_current_income: e.target.value })} placeholder="Whole number" />
        </div>
      </div>

      <div>
        <Label>Major Tax Events in the Last 3 Years</Label>
        <p className="text-xs text-muted-foreground mb-1">1031 exchanges, business sales, large gains, audits, cancellations of debt, etc.</p>
        <Textarea className="glass-input mt-1" value={data.major_tax_events} onChange={e => onChange({ major_tax_events: e.target.value })} />
      </div>

      <div>
        <Label className="mb-2 block">Do you expect to receive an inheritance in the next 5–10 years?</Label>
        <div className="flex gap-3 mb-2">
          <button type="button" onClick={() => onChange({ expects_inheritance: 'yes' })} className={`px-4 py-2 rounded-lg text-sm border transition-colors ${data.expects_inheritance === 'yes' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-foreground hover:bg-muted'}`}>Yes</button>
          <button type="button" onClick={() => onChange({ expects_inheritance: 'no', inheritance_details: '' })} className={`px-4 py-2 rounded-lg text-sm border transition-colors ${data.expects_inheritance === 'no' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-foreground hover:bg-muted'}`}>No</button>
        </div>
        {data.expects_inheritance === 'yes' && (
          <Textarea className="glass-input mt-1" value={data.inheritance_details} onChange={e => onChange({ inheritance_details: e.target.value })} placeholder="Please describe..." />
        )}
      </div>
    </div>
  );
}
