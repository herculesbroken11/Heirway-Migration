import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { isValidPhone, isValidEmail } from '@/lib/validation';

interface BasicInfoData {
  first_name: string;
  middle_name: string;
  last_name: string;
  suffix: string;
  preferred_name: string;
  date_of_birth: Date | undefined;
  mobile_phone: string;
  trust_email: string;
}

interface Props {
  data: BasicInfoData;
  onChange: (data: Partial<BasicInfoData>) => void;
}

export default function IntakeSectionBasicInfo({ data, onChange }: Props) {
  const phoneValid = !data.mobile_phone || isValidPhone(data.mobile_phone);
  const emailValid = !data.trust_email || isValidEmail(data.trust_email);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-display font-bold text-foreground mb-1">Legal Name</h3>
        <p className="text-sm text-muted-foreground mb-4">As listed on your driver's license, birth certificate, or passport.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="first_name">First Name *</Label>
            <Input id="first_name" className="glass-input mt-1" value={data.first_name} onChange={e => onChange({ first_name: e.target.value })} required />
          </div>
          <div>
            <Label htmlFor="middle_name">Middle Name (optional)</Label>
            <Input id="middle_name" className="glass-input mt-1" value={data.middle_name} onChange={e => onChange({ middle_name: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="last_name">Last Name *</Label>
            <Input id="last_name" className="glass-input mt-1" value={data.last_name} onChange={e => onChange({ last_name: e.target.value })} required />
          </div>
          <div>
            <Label htmlFor="suffix">Suffix (Jr., Sr., III — optional)</Label>
            <Input id="suffix" className="glass-input mt-1" value={data.suffix} onChange={e => onChange({ suffix: e.target.value })} placeholder="e.g. Jr., Sr., III" />
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="preferred_name">Preferred Name (optional)</Label>
        <p className="text-xs text-muted-foreground mb-1">What you'd like us to call you.</p>
        <Input id="preferred_name" className="glass-input mt-1" value={data.preferred_name} onChange={e => onChange({ preferred_name: e.target.value })} />
      </div>

      <div>
        <Label>Date of Birth *</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-full md:w-[280px] justify-start text-left font-normal glass-input mt-1", !data.date_of_birth && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {data.date_of_birth ? format(data.date_of_birth, 'PPP') : 'Select date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={data.date_of_birth}
              onSelect={d => onChange({ date_of_birth: d })}
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
        <Label htmlFor="mobile_phone">Mobile Phone Number *</Label>
        <p className="text-xs text-muted-foreground mb-1">For document delivery and trust signing coordination.</p>
        <Input id="mobile_phone" type="tel" className={cn("glass-input mt-1", !phoneValid && "border-destructive")} value={data.mobile_phone} onChange={e => onChange({ mobile_phone: e.target.value })} placeholder="(555) 123-4567" required />
        {!phoneValid && (
          <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Must be at least 10 digits</p>
        )}
      </div>

      <div>
        <Label htmlFor="trust_email">Trust Document Email</Label>
        <p className="text-xs text-muted-foreground mb-1">If different from your client portal email.</p>
        <Input id="trust_email" type="email" className={cn("glass-input mt-1", !emailValid && "border-destructive")} value={data.trust_email} onChange={e => onChange({ trust_email: e.target.value })} placeholder="john@example.com" />
        {!emailValid && (
          <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Enter a valid email address</p>
        )}
      </div>
    </div>
  );
}
