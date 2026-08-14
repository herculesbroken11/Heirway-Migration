import { useState } from 'react';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[\d\s\-+().]{7,20}$/;

type FieldKey = 'firstName' | 'lastName' | 'email' | 'phone' | 'message';

export default function ContactFormSection() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    message: '',
  });
  const [optIn, setOptIn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const requiredMark = attempted ? <span className="text-destructive">*</span> : null;

  const updateField = (key: FieldKey, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAttempted(true);

    const firstName = form.firstName.trim().slice(0, 60);
    const lastName = form.lastName.trim().slice(0, 60);
    const email = form.email.trim().toLowerCase().slice(0, 255);
    const phone = form.phone.trim().slice(0, 20);
    const message = form.message.trim().slice(0, 5000);

    if (firstName.length < 1) {
      toast.error('Please enter your first name.');
      return;
    }
    if (lastName.length < 1) {
      toast.error('Please enter your last name.');
      return;
    }
    if (!EMAIL_REGEX.test(email)) {
      toast.error('Please enter a valid email address.');
      return;
    }
    if (!PHONE_REGEX.test(phone)) {
      toast.error('Please enter a valid phone number.');
      return;
    }
    if (message.length < 10) {
      toast.error('Please enter a message with a bit more detail.');
      return;
    }
    if (!optIn) {
      toast.error('Please agree to receive communications to continue.');
      return;
    }

    setIsSubmitting(true);

    const fullName = `${firstName} ${lastName}`;

    try {
      const { error } = await supabase.from('contact_messages').insert({
        full_name: fullName,
        email,
        phone,
        message,
        opt_in: optIn,
      } as any);

      if (error) throw error;

      supabase.functions.invoke('send-admin-email', {
        body: {
          event_type: 'contact_inquiry',
          event_data: {
            name: fullName,
            email,
            phone,
            message,
          },
        },
      }).catch(err => console.error('Admin contact email error:', err));

      setForm({ firstName: '', lastName: '', email: '', phone: '', message: '' });
      setOptIn(false);
      toast.success('Message sent. Our team can now review it in the dashboard.');
    } catch (error) {
      toast.error('We could not send your message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-16 md:py-24 bg-muted/20">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.15em] text-primary font-medium mb-3">Contact</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-3">Send us a message</h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            Have a question about the platform, your next step, or which plan makes sense for you? Send a message and our team will review it.
          </p>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardContent className="p-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <Label htmlFor="contact-first-name">First Name {requiredMark}</Label>
                  <Input
                    id="contact-first-name"
                    value={form.firstName}
                    onChange={(e) => updateField('firstName', e.target.value)}
                    placeholder="First name"
                    className="mt-1"
                    maxLength={60}
                    autoComplete="given-name"
                    disabled={isSubmitting}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="contact-last-name">Last Name {requiredMark}</Label>
                  <Input
                    id="contact-last-name"
                    value={form.lastName}
                    onChange={(e) => updateField('lastName', e.target.value)}
                    placeholder="Last name"
                    className="mt-1"
                    maxLength={60}
                    autoComplete="family-name"
                    disabled={isSubmitting}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="contact-email">Email {requiredMark}</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="you@example.com"
                    className="mt-1"
                    maxLength={255}
                    autoComplete="email"
                    disabled={isSubmitting}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="contact-phone">Phone {requiredMark}</Label>
                  <Input
                    id="contact-phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="(555) 123-4567"
                    className="mt-1"
                    maxLength={20}
                    autoComplete="tel"
                    disabled={isSubmitting}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="contact-message">Message {requiredMark}</Label>
                <Textarea
                  id="contact-message"
                  value={form.message}
                  onChange={(e) => updateField('message', e.target.value)}
                  placeholder="How can we help?"
                  className="mt-1 min-h-[140px]"
                  maxLength={5000}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <label className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-muted/20 cursor-pointer">
                <Checkbox
                  checked={optIn}
                  onCheckedChange={(checked) => setOptIn(checked === true)}
                  className="mt-0.5"
                  disabled={isSubmitting}
                />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  By checking this box, I agree to receive marketing and informational emails and SMS text messages from Heirway at the email address and phone number provided. Message frequency varies. Message and data rates may apply. Reply STOP to unsubscribe from SMS, or use the unsubscribe link in any email. Consent is not a condition of purchase. See our <a href="/privacy" target="_blank" className="text-primary underline">Privacy Policy</a> and <a href="/terms" target="_blank" className="text-primary underline">Terms of Service</a>.
                </span>
              </label>

              <div className="flex justify-center md:justify-end">
                <Button type="submit" disabled={isSubmitting} className="rounded-full px-6 bg-gradient-to-r from-primary to-accent text-primary-foreground">
                  <Send className="w-4 h-4 mr-2" />
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
