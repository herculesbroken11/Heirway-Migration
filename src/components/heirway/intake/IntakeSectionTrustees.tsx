import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, PlayCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isValidEmail, isValidPhone } from '@/lib/validation';
import { useIntakeVideo } from '@/hooks/useIntakeVideos';
import EnforcedVideoPlayer from '@/components/heirway/learning/EnforcedVideoPlayer';

export interface Trustee {
  full_name: string;
  email: string;
  phone: string;
  address: string;
  relationship: string;
}

export interface SuccessorTrustee {
  full_name: string;
  relationship: string;
  contact: string;
}

interface Props {
  trustees: Trustee[];
  managingTrusteePhone: string;
  successorTrustees: SuccessorTrustee[];
  onTrusteesChange: (t: Trustee[]) => void;
  onManagingPhoneChange: (v: string) => void;
  onSuccessorChange: (t: SuccessorTrustee[]) => void;
}

const emptyTrustee: Trustee = { full_name: '', email: '', phone: '', address: '', relationship: '' };
const emptySuccessor: SuccessorTrustee = { full_name: '', relationship: '', contact: '' };

export default function IntakeSectionTrustees({ trustees, managingTrusteePhone, successorTrustees, onTrusteesChange, onManagingPhoneChange, onSuccessorChange }: Props) {
  const { videoUrl } = useIntakeVideo('trustees');

  const updateTrustee = (i: number, field: keyof Trustee, value: string) => {
    const updated = [...trustees];
    updated[i] = { ...updated[i], [field]: value };
    onTrusteesChange(updated);
  };

  const updateSuccessor = (i: number, field: keyof SuccessorTrustee, value: string) => {
    const updated = [...successorTrustees];
    updated[i] = { ...updated[i], [field]: value };
    onSuccessorChange(updated);
  };

  const managingPhoneValid = !managingTrusteePhone || isValidPhone(managingTrusteePhone);

  return (
    <div className="space-y-8">
      <div className="glass-panel p-4 rounded-lg border-primary/20">
        <p className="text-sm text-muted-foreground">
          <strong>You and your other trusted trustees</strong> — These are the people you trust most to manage and protect your estate. The first trustee listed will be the <strong>Managing Trustee</strong> (typically you).
        </p>
      </div>

      <div>
        <h3 className="text-lg font-display font-bold text-foreground mb-1">Trustees</h3>
        <p className="text-sm text-muted-foreground mb-4">List yourself first as the Managing Trustee, then add other trusted individuals.</p>

        {trustees.map((t, i) => {
          const emailOk = !t.email || isValidEmail(t.email);
          const phoneOk = !t.phone || isValidPhone(t.phone);
          return (
            <div key={i} className="glass-panel p-4 rounded-lg mb-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{i === 0 ? 'Managing Trustee (You)' : `Trusted Trustee ${i + 1}`}</span>
                {trustees.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => onTrusteesChange(trustees.filter((_, j) => j !== i))}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><Label>Full Legal Name *</Label><Input className="glass-input mt-1" value={t.full_name} onChange={e => updateTrustee(i, 'full_name', e.target.value)} /></div>
                <div>
                  <Label>Email *</Label>
                  <Input type="email" className={cn("glass-input mt-1", !emailOk && "border-destructive")} value={t.email} onChange={e => updateTrustee(i, 'email', e.target.value)} />
                  {!emailOk && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Enter a valid email</p>}
                </div>
                <div>
                  <Label>Phone *</Label>
                  <Input type="tel" className={cn("glass-input mt-1", !phoneOk && "border-destructive")} value={t.phone} onChange={e => updateTrustee(i, 'phone', e.target.value)} />
                  {!phoneOk && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Must be at least 10 digits</p>}
                </div>
                <div><Label>Relationship *</Label><Input className="glass-input mt-1" value={t.relationship} onChange={e => updateTrustee(i, 'relationship', e.target.value)} /></div>
              </div>
              <div><Label>Full Address *</Label><Input className="glass-input mt-1" value={t.address} onChange={e => updateTrustee(i, 'address', e.target.value)} /></div>
            </div>
          );
        })}

        <Button variant="outline" size="sm" onClick={() => onTrusteesChange([...trustees, { ...emptyTrustee }])}>
          <Plus className="w-4 h-4 mr-1" /> Add Trustee
        </Button>
      </div>

      <div>
        <Label>Managing Trustee's Phone Number *</Label>
        <p className="text-xs text-muted-foreground mb-1">Required for SS-4 EIN application.</p>
        <Input type="tel" className={cn("glass-input mt-1 w-full md:w-[280px]", managingTrusteePhone && !managingPhoneValid && "border-destructive")} value={managingTrusteePhone} onChange={e => onManagingPhoneChange(e.target.value)} required />
        {managingTrusteePhone && !managingPhoneValid && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Must be at least 10 digits</p>}
      </div>

      <div>
        <h3 className="text-lg font-display font-bold text-foreground mb-1">Successor Trustees</h3>
        <p className="text-sm text-muted-foreground mb-4">Individuals or institutions who take over if a trustee dies or becomes incapacitated.</p>

        {successorTrustees.map((s, i) => (
          <div key={i} className="glass-panel p-4 rounded-lg mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Successor {i + 1}</span>
              {successorTrustees.length > 1 && (
                <Button variant="ghost" size="sm" onClick={() => onSuccessorChange(successorTrustees.filter((_, j) => j !== i))}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div><Label>Full Legal Name *</Label><Input className="glass-input mt-1" value={s.full_name} onChange={e => updateSuccessor(i, 'full_name', e.target.value)} /></div>
              <div><Label>Relationship *</Label><Input className="glass-input mt-1" value={s.relationship} onChange={e => updateSuccessor(i, 'relationship', e.target.value)} /></div>
              <div><Label>Contact</Label><Input className="glass-input mt-1" value={s.contact} onChange={e => updateSuccessor(i, 'contact', e.target.value)} /></div>
            </div>
          </div>
        ))}

        <Button variant="outline" size="sm" onClick={() => onSuccessorChange([...successorTrustees, { ...emptySuccessor }])}>
          <Plus className="w-4 h-4 mr-1" /> Add Successor
        </Button>
      </div>
    </div>
  );
}
