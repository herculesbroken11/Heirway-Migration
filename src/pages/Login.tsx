import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ForgotPasswordDialog } from '@/components/auth/ForgotPasswordDialog';
import { toast } from 'sonner';
import { HEIRWAY_PLANS } from '@/lib/heirwayPlans';
import { useForceLightMode } from '@/hooks/useForceLightMode';
import heirwayLogo from '@/assets/heirway-logo-transparent.png';

export default function Login() {
  useForceLightMode();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const hasSelectedPlan = !!sessionStorage.getItem('heirway_selected_plan');
  const isFreePath = sessionStorage.getItem('heirway_free_path') === 'true';
  const urlParams = new URLSearchParams(window.location.search);
  const forceLogin = urlParams.get('mode') === 'login';
  const [isLogin, setIsLogin] = useState(forceLogin || (!hasSelectedPlan && !isFreePath));
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', fullName: '', addressStreet: '', addressCity: '', addressState: '', addressZip: '' });

  const generateSecurePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    const array = new Uint8Array(24);
    crypto.getRandomValues(array);
    let password = 'Aa1!';
    for (let i = 0; i < 24; i += 1) password += chars[array[i] % chars.length];
    return password;
  };

  // If already logged in, route based on role
  useEffect(() => {
    if (user && !authLoading) {
      const postLoginRedirect = sessionStorage.getItem('heirway_post_login_redirect');
      if (postLoginRedirect) {
        sessionStorage.removeItem('heirway_post_login_redirect');
        navigate(postLoginRedirect);
        return;
      }
      routeUser(user.id);
    }
  }, [user, authLoading]);

  const routeUser = async (userId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    // Check role
    const { data: roleData } = await supabase.rpc('get_current_user_role');
    if (roleData === 'admin' || roleData === 'super_admin') {
      navigate('/admin/heirway');
      return;
    }

    // Check for heirway client record
    const { data: clientRecord } = await supabase
      .from('heirway_clients')
      .select('id, plan_status, selected_plan')
      .eq('user_id', userId)
      .maybeSingle();

    if (clientRecord) {
      // If intake is in progress, resume it
      if (clientRecord.plan_status === 'intake_in_progress') {
        if (clientRecord.selected_plan) {
          sessionStorage.setItem('heirway_selected_plan', clientRecord.selected_plan);
        }
        navigate('/heirway/intake');
      } else if (clientRecord.plan_status === 'intake_complete' && clientRecord.selected_plan === 'wealth_builder') {
        navigate('/heirway/meeting-request');
      } else if (clientRecord.plan_status === 'meeting_pending') {
        navigate('/heirway/dashboard');
      } else if (clientRecord.plan_status === 'intake_complete') {
        navigate('/heirway/checkout');
      } else {
        navigate('/heirway/dashboard');
      }
    } else {
      const selectedPlan = sessionStorage.getItem('heirway_selected_plan');
      sessionStorage.removeItem('heirway_free_path');
      
      // Trust plans (foundation, business) always go to intake
      if (selectedPlan === 'foundation' || selectedPlan === 'business') {
        navigate('/heirway/intake');
      } else {
        // Auto-create client record for free/education users so they appear in admin
        const { data: { user: authUser } } = await supabase.auth.getUser();
        await supabase.from('heirway_clients').insert({
          user_id: userId,
          email: authUser?.email || '',
          full_name: authUser?.user_metadata?.full_name || null,
          state: authUser?.user_metadata?.address_state || 'N/A',
          address_street: authUser?.user_metadata?.address_street || null,
          address_city: authUser?.user_metadata?.address_city || null,
          address_state: authUser?.user_metadata?.address_state || null,
          address_zip: authUser?.user_metadata?.address_zip || null,
          recommended_plan: selectedPlan || 'free',
          selected_plan: selectedPlan === 'education' ? 'education' : null,
          plan_status: 'active',
        });
        navigate('/heirway/dashboard');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (error) throw error;
        toast.success('Welcome back!');
        await routeUser(authData.user.id);
      } else {
        const tempPassword = generateSecurePassword();
        const { data: signUpData, error } = await supabase.auth.signUp({
          email: form.email,
          password: tempPassword,
          options: {
            data: {
              full_name: form.fullName,
              address_street: form.addressStreet,
              address_city: form.addressCity,
              address_state: form.addressState,
              address_zip: form.addressZip,
            },
            emailRedirectTo: `${window.location.origin}/set-password`,
          },
        });
        if (error) {
          // Supabase sometimes surfaces an explicit "already registered" error
          const msg = (error.message || '').toLowerCase();
          if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
            await supabase.auth.resend({
              type: 'signup',
              email: form.email,
              options: { emailRedirectTo: `${window.location.origin}/set-password` },
            });
            toast.info('An account with this email already exists. We\'ve sent a new verification link — please check your inbox.');
            navigate('/verify-email');
            return;
          }
          throw error;
        }

        // When the email is already registered, Supabase returns a user with an empty identities array
        // (no error, for security). Detect that and resend verification instead of creating a duplicate.
        const identities = signUpData.user?.identities ?? [];
        if (signUpData.user && identities.length === 0) {
          await supabase.auth.resend({
            type: 'signup',
            email: form.email,
            options: { emailRedirectTo: `${window.location.origin}/set-password` },
          });
          toast.info('An account with this email already exists. We\'ve sent a new verification link — please check your inbox.');
          navigate('/verify-email');
          return;
        }

        if (signUpData.session) {
          await supabase.auth.signOut();
        }

        // Create a prospect record so direct signups appear in the Prospects tab
        // (same as quiz-funnel leads, distinguished by source)
        supabase.from('prospects').insert({
          name: form.fullName || form.email,
          email: form.email,
          status: 'new',
          quiz_answers: {
            source: 'direct_signup',
            address_street: form.addressStreet || null,
            address_city: form.addressCity || null,
            address_state: form.addressState || null,
            address_zip: form.addressZip || null,
            signed_up_at: new Date().toISOString(),
          },
        }).then(({ error }) => {
          if (error) console.error('Prospect creation error:', error);
        });

        // Notify admins of new account
        supabase.functions.invoke('send-admin-email', {
          body: {
            event_type: 'new_account',
            event_data: {
              name: form.fullName || '',
              email: form.email,
            },
          },
        }).catch(err => console.error('Admin new account email error:', err));

        toast.success('Check your email to verify your account and create your password.');
        navigate('/verify-email');
      }
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="min-h-screen gradient-bg flex flex-col items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="mb-6 relative z-10">
        <img src={heirwayLogo} alt="Heirway" className="h-40 w-auto" />
      </div>

      <Card className="glass-panel max-w-md w-full relative z-10 animate-fade-in">
        <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
        <CardContent className="p-6 md:p-8">
          <h2 className="text-xl font-display font-bold text-foreground mb-1 text-center">
            {isLogin ? 'Welcome Back' : sessionStorage.getItem('heirway_quiz_result') ? 'Create a Free Account to See Your Results' : 'Create Your Account'}
          </h2>
          <p className="text-sm text-muted-foreground mb-6 text-center">
            {isLogin ? 'Sign in to access your portal' : 'We will email you a link to verify your account and create your password'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={form.fullName}
                    onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
                    className="glass-input mt-1"
                    placeholder="John Smith"
                    required={!isLogin}
                  />
                </div>
                <div>
                  <Label htmlFor="addressStreet">Street Address</Label>
                  <Input
                    id="addressStreet"
                    value={form.addressStreet}
                    onChange={e => setForm(p => ({ ...p, addressStreet: e.target.value }))}
                    className="glass-input mt-1"
                    placeholder="123 Main St"
                    required={!isLogin}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="addressCity">City</Label>
                    <Input
                      id="addressCity"
                      value={form.addressCity}
                      onChange={e => setForm(p => ({ ...p, addressCity: e.target.value }))}
                      className="glass-input mt-1"
                      placeholder="Dallas"
                      required={!isLogin}
                    />
                  </div>
                  <div>
                    <Label htmlFor="addressState">State</Label>
                    <Input
                      id="addressState"
                      value={form.addressState}
                      onChange={e => setForm(p => ({ ...p, addressState: e.target.value }))}
                      className="glass-input mt-1"
                      placeholder="TX"
                      maxLength={2}
                      required={!isLogin}
                    />
                  </div>
                </div>
                <div className="w-1/2">
                  <Label htmlFor="addressZip">ZIP Code</Label>
                  <Input
                    id="addressZip"
                    value={form.addressZip}
                    onChange={e => setForm(p => ({ ...p, addressZip: e.target.value }))}
                    className="glass-input mt-1"
                    placeholder="75001"
                    maxLength={10}
                    required={!isLogin}
                  />
                </div>
              </>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className="glass-input mt-1"
                placeholder="john@example.com"
                required
              />
            </div>
            {isLogin && (
              <div>
                <Label htmlFor="password">Password</Label>
                <PasswordInput
                  id="password"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  className="glass-input mt-1"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            )}

            {isLogin && (
              <div className="flex justify-end">
                <ForgotPasswordDialog />
              </div>
            )}

            <Button type="submit" className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isLogin ? 'Sign In' : 'Send Verification Email'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-primary hover:underline"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>

          {!isLogin && (
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              By signing up, you agree to our{' '}
              <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>
              {' '}and{' '}
              <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
            </p>
          )}

          <div className="mt-3 text-center">
            <Link to="/heirway" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
