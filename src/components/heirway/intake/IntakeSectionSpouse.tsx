import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { isValidPhone } from '@/lib/validation';

interface SpouseData {
  spouse_full_name: string;
  spouse_preferred_name: string;
  spouse_dob: Date | undefined;
  spouse_phone: string;
}

interface Props {
  data: SpouseData;
  onChange: (data: Partial<SpouseData>) => void;
}

export default function IntakeSectionSpouse({ data, onChange }: Props) {
  const phoneValid = !data.spouse_phone || isValidPhone(data.spouse_phone);

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="spouse_full_name">Spouse/Partner's Legal Full Name *</Label>
        <Input id="spouse_full_name" className="glass-input mt-1" value={data.spouse_full_name} onChange={e => onChange({ spouse_full_name: e.target.value })} required />
      </div>

      <div>
        <Label htmlFor="spouse_preferred_name">Preferred Name (optional)</Label>
        <Input id="spouse_preferred_name" className="glass-input mt-1" value={data.spouse_preferred_name} onChange={e => onChange({ spouse_preferred_name: e.target.value })} />
      </div>

      <div>
        <Label>Date of Birth *</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-full md:w-[280px] justify-start text-left font-normal glass-input mt-1", !data.spouse_dob && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {data.spouse_dob ? format(data.spouse_dob, 'PPP') : 'Select date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={data.spouse_dob}
              onSelect={d => onChange({ spouse_dob: d })}
              disabled={d => d > new Date() || d < new Date('1900-01-01')}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
              captionLayout="dropdown-buttons"
              fromYear={1920}
              toYear={new Date().getFullYear()}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div>
        <Label htmlFor="spouse_phone">Mobile Phone Number *</Label>
        <p className="text-xs text-muted-foreground mb-1">Required for trust signatures & banking access.</p>
        <Input id="spouse_phone" type="tel" className={cn("glass-input mt-1", !phoneValid && "border-destructive")} value={data.spouse_phone} onChange={e => onChange({ spouse_phone: e.target.value })} placeholder="(555) 123-4567" required />
        {!phoneValid && (
          <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Must be at least 10 digits</p>
        )}
      </div>
    </div>
  );
}
