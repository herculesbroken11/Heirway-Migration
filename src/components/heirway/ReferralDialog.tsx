import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Gift, Send, CheckCircle, Clock, UserPlus } from 'lucide-react';
import { isValidEmail, isValidPhone, formatPhoneDisplay } from '@/lib/validation';

interface ReferralDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  clientId: string;
}

export default function ReferralDialog({ open, onOpenChange, userId, clientId }: ReferralDialogProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) loadReferrals();
  }, [open]);

  const loadReferrals = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('heirway_referrals')
      .select('*')
      .eq('referrer_user_id', userId)
      .order('created_at', { ascending: false });
    setReferrals(data || []);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim()) { toast.error('First and last name required'); return; }
    if (!isValidEmail(email)) { toast.error('Please enter a valid email'); return; }
    if (!isValidPhone(phone)) { toast.error('Please enter a valid phone number'); return; }

    setSubmitting(true);
    const { error } = await supabase.from('heirway_referrals').insert({
      referrer_user_id: userId,
      referrer_client_id: clientId,
      referee_first_name: firstName.trim(),
      referee_last_name: lastName.trim(),
      referee_email: email.trim(),
      referee_phone: phone.replace(/\D/g, ''),
    } as any);

    if (error) {
      toast.error('Failed to submit referral');
    } else {
      toast.success('Referral submitted! You will earn credits if they become a client.');
      // Notify admin
      try {
        const { data: clientData } = await supabase.from('heirway_clients').select('full_name, email').eq('id', clientId).maybeSingle();
        await supabase.functions.invoke('send-admin-email', {
          body: {
            event_type: 'referral_submitted',
            event_data: {
              referrer_name: (clientData as any)?.full_name || '',
              referrer_email: (clientData as any)?.email || '',
              referee_first_name: firstName.trim(),
              referee_last_name: lastName.trim(),
              referee_email: email.trim(),
              referee_phone: phone.trim(),
            },
          },
        });
      } catch {}
      setFirstName(''); setLastName(''); setEmail(''); setPhone('');
      loadReferrals();
    }
    setSubmitting(false);
  };

  const convertedCount = referrals.filter(r => r.status === 'converted').length;
  const pendingCount = referrals.filter(r => r.status === 'pending').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Gift className="w-5 h-5 text-primary" /> Refer Someone to Heirway
          </DialogTitle>
        </DialogHeader>

        {/* Referral Summary */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-center">
            <p className="text-2xl font-bold text-primary">{convertedCount}</p>
            <p className="text-xs text-muted-foreground">Credits Earned</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Pending Referrals</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Refer a friend or family member. If they become a client, you'll receive referral credits toward your existing or new trusts.
        </p>

        {/* Form */}
        <div className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">First Name</Label>
              <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jane" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Last Name</Label>
              <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Doe" className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Phone</Label>
            <Input
              value={formatPhoneDisplay(phone)}
              onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="(555) 123-4567"
              className="mt-1"
            />
          </div>
          <Button onClick={handleSubmit} disabled={submitting} className="w-full">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            Submit Referral
          </Button>
        </div>

        {/* Past Referrals */}
        {referrals.length > 0 && (
          <div className="mt-4 border-t pt-4">
            <h4 className="text-sm font-medium text-foreground mb-2">Your Referrals</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {referrals.map(r => (
                <div key={r.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/30">
                  <div>
                    <p className="font-medium text-foreground">{r.referee_first_name} {r.referee_last_name}</p>
                    <p className="text-xs text-muted-foreground">{r.referee_email}</p>
                  </div>
                  <Badge variant={r.status === 'converted' ? 'default' : 'outline'} className="text-xs capitalize">
                    {r.status === 'converted' ? <CheckCircle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                    {r.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
