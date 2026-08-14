import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface DocsData {
  existing_documents: string[];
  estate_plan_last_reviewed: Date | undefined;
  confident_plan_works: string;
}

interface Props {
  data: DocsData;
  onChange: (data: Partial<DocsData>) => void;
}

const DOC_OPTIONS = [
  { value: 'last_will', label: 'Last Will' },
  { value: 'revocable_trust', label: 'Revocable Trust' },
  { value: 'financial_poa', label: 'Financial Power of Attorney (POA)' },
  { value: 'medical_directive', label: 'Medical Directive / Living Will' },
];

export default function IntakeSectionDocuments({ data, onChange }: Props) {
  const toggleDoc = (val: string) => {
    const current = data.existing_documents;
    onChange({
      existing_documents: current.includes(val) ? current.filter(v => v !== val) : [...current, val],
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <Label className="mb-2 block">Do you currently have any of the following? (Check all that apply)</Label>
        <div className="space-y-2">
          {DOC_OPTIONS.map(opt => (
            <label key={opt.value} className="flex items-center gap-2 text-sm">
              <Checkbox checked={data.existing_documents.includes(opt.value)} onCheckedChange={() => toggleDoc(opt.value)} />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label>When was your estate plan last reviewed?</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-full md:w-[280px] justify-start text-left font-normal glass-input mt-1", !data.estate_plan_last_reviewed && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {data.estate_plan_last_reviewed ? format(data.estate_plan_last_reviewed, 'PPP') : 'Select date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={data.estate_plan_last_reviewed}
              onSelect={d => onChange({ estate_plan_last_reviewed: d })}
              disabled={d => d > new Date()}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div>
        <Label className="mb-2 block">Are you confident your current plan will work as intended?</Label>
        <div className="flex gap-3">
          <button type="button" onClick={() => onChange({ confident_plan_works: 'yes' })} className={`px-4 py-2 rounded-lg text-sm border transition-colors ${data.confident_plan_works === 'yes' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-foreground hover:bg-muted'}`}>Yes</button>
          <button type="button" onClick={() => onChange({ confident_plan_works: 'no' })} className={`px-4 py-2 rounded-lg text-sm border transition-colors ${data.confident_plan_works === 'no' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-foreground hover:bg-muted'}`}>No</button>
        </div>
      </div>
    </div>
  );
}
