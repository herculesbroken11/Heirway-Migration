import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { HeirwayLayout } from '@/components/heirway/HeirwayLayout';
import { useForceLightMode } from '@/hooks/useForceLightMode';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { User, Mail, Lock, Loader2, Check, Shield, ArrowRight } from 'lucide-react';
import { HEIRWAY_PLANS } from '@/lib/heirwayPlans';
import BillingSection from '@/components/heirway/settings/BillingSection';
import DeleteAccountSection from '@/components/heirway/settings/DeleteAccountSection';

export default function HeirwaySettings() {
  useForceLightMode();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [clientName, setClientName] = useState('');
  const [loading, setLoading] = useState(true);

  // Name form
  const [newName, setNewName] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Email form
  const [newEmail, setNewEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  // Password form
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const loadUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUser(user);

    const { data: clientData } = await supabase
      .from('heirway_clients')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    setClient(clientData);

    const name = clientData?.full_name || user.user_metadata?.full_name || '';
    setClientName(name);
    setNewName(name);
    setNewEmail(user.email || '');
    setLoading(false);
  };

  useEffect(() => {
    loadUserData();

    // Show payoff success message
    if (searchParams.get('payoff') === 'success') {
      toast.success('Your plan has been paid off! Your subscription has been completed.');
    }

    // Listen for auth changes (e.g. email confirmation completing)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'USER_UPDATED' && session?.user) {
        const u = session.user;
        setUser(u);
        setNewEmail(u.email || '');
        // Sync confirmed email to heirway_clients
        await supabase.from('heirway_clients').update({ email: u.email } as any).eq('user_id', u.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleUpdateName = async () => {
    if (!newName.trim()) { toast.error('Name cannot be empty'); return; }
    setSavingName(true);
    try {
      // Update auth metadata
      const { error: authErr } = await supabase.auth.updateUser({
        data: { full_name: newName.trim() },
      });
      if (authErr) throw authErr;

      // Update profiles table
      await supabase.from('profiles').update({ full_name: newName.trim() }).eq('user_id', user.id);

      // Update heirway_clients table
      await supabase.from('heirway_clients').update({ full_name: newName.trim() } as any).eq('user_id', user.id);

      setClientName(newName.trim());
      toast.success('Name updated successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update name');
    } finally {
      setSavingName(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!newEmail.trim()) { toast.error('Email cannot be empty'); return; }
    if (newEmail === user?.email) { toast.info('Email is the same'); return; }
    setSavingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) throw error;
      toast.success('A confirmation email has been sent to your new address. Please check your inbox.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update email');
    } finally {
      setSavingEmail(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Password updated successfully');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <HeirwayLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </HeirwayLayout>
    );
  }

  return (
    <HeirwayLayout>
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Account Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your profile, plan, and security</p>
        </div>

        {/* Active Plan */}
        <Card className="glass-panel">
          <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-display font-bold text-foreground">Active Plan</h3>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-foreground">
                  {client?.selected_plan ? (HEIRWAY_PLANS[client.selected_plan]?.name || client.selected_plan) : 'Free'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {client?.selected_plan && HEIRWAY_PLANS[client.selected_plan]
                    ? HEIRWAY_PLANS[client.selected_plan].price + (HEIRWAY_PLANS[client.selected_plan].priceType === 'monthly' ? '/mo' : ' one-time')
                    : 'No active subscription'}
                </p>
                {client?.plan_status && (
                  <Badge variant="outline" className="mt-2 text-xs capitalize">
                    {client.plan_status.replace(/_/g, ' ')}
                  </Badge>
                )}
              </div>
              {client?.selected_plan !== 'wealth_builder' && (
                <Button size="sm" variant="outline" onClick={() => navigate('/heirway/pricing')}>
                  <ArrowRight className="w-4 h-4 mr-1" /> Change Plan
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        {/* Billing Summary */}
        <BillingSection client={client} />

        {/* Name */}
        <Card className="glass-panel">
          <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-display font-bold text-foreground">Display Name</h3>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Full Name</Label>
              <Input
                className="glass-input mt-1"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Your full name"
              />
            </div>
            <Button onClick={handleUpdateName} disabled={savingName || newName.trim() === clientName} size="sm">
              {savingName ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
              Save Name
            </Button>
          </CardContent>
        </Card>

        {/* Email */}
        <Card className="glass-panel">
          <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-display font-bold text-foreground">Email Address</h3>
            </div>
            <p className="text-xs text-muted-foreground">Current email: <span className="font-medium text-foreground">{user?.email}</span></p>
            <div>
              <Label className="text-xs text-muted-foreground">New Email</Label>
              <Input
                className="glass-input mt-1"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="new@email.com"
              />
            </div>
            <p className="text-xs text-muted-foreground">A confirmation link will be sent to both your current and new email address.</p>
            <Button onClick={handleUpdateEmail} disabled={savingEmail || newEmail === user?.email} size="sm">
              {savingEmail ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
              Update Email
            </Button>
          </CardContent>
        </Card>

        {/* Password */}
        <Card className="glass-panel">
          <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-display font-bold text-foreground">Change Password</h3>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">New Password</Label>
              <PasswordInput
                className="glass-input mt-1"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Confirm Password</Label>
              <PasswordInput
                className="glass-input mt-1"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button onClick={handleUpdatePassword} disabled={savingPassword || !newPassword} size="sm">
              {savingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
              Update Password
            </Button>
          </CardContent>
        </Card>
        {/* Delete Account */}
        <DeleteAccountSection />
      </div>
    </HeirwayLayout>
  );
}
