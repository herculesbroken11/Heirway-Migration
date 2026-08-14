import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForceLightMode } from '@/hooks/useForceLightMode';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CalendarCheck, Loader2, CheckCircle } from 'lucide-react';
import heirwayLogo from '@/assets/heirway-logo-transparent.png';

const MEETING_TYPES = [
  { value: 'initial_consultation', label: 'Initial Consultation' },
  { value: 'trust_planning', label: 'Trust Planning Session' },
  { value: 'document_review', label: 'Document Review' },
  { value: 'general_question', label: 'General Question' },
];

export default function HeirwayMeetingRequest() {
  useForceLightMode();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [meetingType, setMeetingType] = useState('initial_consultation');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }
      setUserId(user.id);
      const { data: client } = await supabase
        .from('heirway_clients')
        .select('id, plan_status')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!client) { navigate('/login'); return; }
      // If already past meeting request stage, go to dashboard
      if (client.plan_status !== 'intake_complete') {
        navigate('/heirway/dashboard');
        return;
      }
      setClientId(client.id);
    };
    load();
  }, [navigate]);

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error("Please describe what you'd like to discuss");
      return;
    }
    if (!clientId || !userId) return;
    setLoading(true);
    try {
      // Create the admin request
      const { error } = await supabase.from('heirway_admin_requests' as any).insert({
        user_id: userId,
        client_id: clientId,
        request_type: 'meeting_request',
        description: `[${MEETING_TYPES.find(t => t.value === meetingType)?.label}] ${description.trim()}`,
      } as any);
      if (error) throw error;

      // Notify super admins via edge function
      await supabase.functions.invoke('notify-admin-request', {
        body: {
          request_type: 'meeting_request',
          description: description.trim(),
          meeting_type: meetingType,
        },
      });

      // Send meeting request confirmation email to user
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        supabase.functions.invoke('send-transactional-email', {
          body: {
            template: 'meeting_request_confirmation',
            to: user.email,
            props: {
              fullName: user.user_metadata?.full_name || '',
              requestType: MEETING_TYPES.find(t => t.value === meetingType)?.label || 'Meeting',
            },
          },
        }).catch(err => console.error('Meeting email error:', err));
      }

      // Update client status — give them free-tier dashboard access while they wait
      await supabase.from('heirway_clients').update({
        plan_status: 'active',
        selected_plan: null,
      }).eq('id', clientId);

      setSubmitted(true);
      toast.success('Meeting request submitted!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 p-4 md:p-8 max-w-lg mx-auto">
        <div className="flex justify-center mb-8">
          <img src={heirwayLogo} alt="Heirway" className="h-36 w-auto" />
        </div>

        {submitted ? (
          <Card className="glass-panel animate-fade-in">
            <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-display font-bold text-foreground mb-2">Request Submitted!</h2>
              <p className="text-muted-foreground mb-2">
                Your meeting request has been sent to our team. We'll reach out to schedule your session shortly.
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                In the meantime, you can explore your dashboard and start setting things up.
              </p>
              <Button
                onClick={() => navigate('/heirway/dashboard')}
                className="bg-gradient-to-r from-primary to-accent text-primary-foreground"
              >
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="glass-panel animate-fade-in">
            <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
            <CardContent className="p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <CalendarCheck className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-display font-bold text-foreground">Schedule a Meeting</h2>
                  <p className="text-sm text-muted-foreground">Before accessing your dashboard, let's set up a time to connect.</p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-6">
                Your intake is complete! To ensure we serve you best, please submit a meeting request 
                so our team can review your information and guide you through the next steps.
              </p>

              <div className="space-y-4">
                <div>
                  <Label>Meeting Type</Label>
                  <Select value={meetingType} onValueChange={setMeetingType}>
                    <SelectTrigger className="glass-input mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MEETING_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>What would you like to discuss? *</Label>
                  <Textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Tell us about your goals, questions, or anything specific you'd like to cover in the meeting..."
                    className="glass-input mt-1 min-h-[120px]"
                  />
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground"
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Submit Meeting Request
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
