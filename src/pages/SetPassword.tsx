import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Lock, ArrowRight, Loader2, AlertCircle, Mail } from 'lucide-react';
import { useForceLightMode } from '@/hooks/useForceLightMode';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import heirwayLogo from '@/assets/heirway-logo-transparent.png';

export default function SetPassword() {
  useForceLightMode();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionReady, setSessionReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    let mounted = true;

    const markSessionReady = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted || !session) return false;
      setLinkError(null);
      setSessionReady(true);
      return true;
    };

    const setFriendlyLinkError = (message?: string) => {
      if (!mounted) return;
      const isExpired = /expired|otp_expired/i.test(message || '');
      setLinkError(
        isExpired
          ? 'This verification link has expired or has already been used. Request a new one below.'
          : message || 'This verification link is invalid. Request a new one below.'
      );
      setSessionReady(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && session) {
        setLinkError(null);
        setSessionReady(true);
      }
    });

    const initialize = async () => {
      const hash = window.location.hash.slice(1);
      const hashParams = new URLSearchParams(hash);
      const errorCode =
        hashParams.get('error_code') ||
        hashParams.get('error') ||
        searchParams.get('error_code') ||
        searchParams.get('error');
      const errorDescription =
        hashParams.get('error_description') || searchParams.get('error_description');

      if (errorCode) {
        setFriendlyLinkError(
          decodeURIComponent(errorDescription || errorCode || 'This verification link is invalid.').replace(/\+/g, ' ')
        );
        return;
      }

      try {
        const code = searchParams.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setFriendlyLinkError(error.message);
            return;
          }

          const hasSession = await markSessionReady();
          if (hasSession) return;
        }

        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            setFriendlyLinkError(error.message);
            return;
          }

          const hasSession = await markSessionReady();
          if (hasSession) return;
        }

        await markSessionReady();
      } catch (err) {
        setFriendlyLinkError((err as Error).message || 'We could not verify your link.');
      }
    };

    initialize();

    const timeout = setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!mounted || session) return;
        setFriendlyLinkError(
          'We could not verify your link. It may have expired or already been used. Request a new one below.'
        );
      });
    }, 8000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [searchParams]);

  const handleSetPassword = async () => {
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
      } else {
        // Sync registered user to Go High Level (await so navigation doesn't cancel the request)
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: clientRecord } = await supabase
              .from('heirway_clients')
              .select('full_name, email, phone, address_street, address_city, address_state, address_zip, state, selected_plan, recommended_plan')
              .eq('user_id', user.id)
              .maybeSingle();

            const meta = (user.user_metadata || {}) as Record<string, any>;
            const { error: ghlErr } = await supabase.functions.invoke('ghl-sync', {
              body: {
                source: 'registered_user',
                record: {
                  full_name: clientRecord?.full_name || meta.full_name || '',
                  email: clientRecord?.email || user.email || '',
                  phone: clientRecord?.phone || meta.phone || '',
                  address_street: clientRecord?.address_street || meta.address_street || '',
                  address_city: clientRecord?.address_city || meta.address_city || '',
                  address_state: clientRecord?.address_state || meta.address_state || '',
                  address_zip: clientRecord?.address_zip || meta.address_zip || '',
                  state: clientRecord?.state || '',
                  selected_plan: clientRecord?.selected_plan || sessionStorage.getItem('heirway_selected_plan') || '',
                  recommended_plan: clientRecord?.recommended_plan || '',
                  registered_at: new Date().toISOString(),
                },
              },
            });
            if (ghlErr) console.error('GHL registered_user sync failed:', ghlErr);
          }
        } catch (err) {
          console.error('GHL sync prep error:', err);
        }

        toast.success('Password created successfully!');
        navigate('/heirway/dashboard');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!resendEmail || !/^\S+@\S+\.\S+$/.test(resendEmail)) {
      toast.error('Enter a valid email address');
      return;
    }
    setResending(true);
    try {
      const { error: resendErr } = await supabase.auth.resend({
        type: 'signup',
        email: resendEmail,
        options: { emailRedirectTo: `${window.location.origin}/set-password` },
      });
      if (resendErr) {
        // If signup resend fails (user already confirmed), try password recovery instead
        const { error: recoveryErr } = await supabase.auth.resetPasswordForEmail(resendEmail, {
          redirectTo: `${window.location.origin}/set-password`,
        });
        if (recoveryErr) {
          toast.error(recoveryErr.message);
          return;
        }
      }
      toast.success('Check your email for a new verification link.');
    } catch {
      toast.error('Could not send verification email. Please try again.');
    } finally {
      setResending(false);
    }
  };

  // ----- Error state: expired / invalid link -----
  if (linkError) {
    return (
      <div className="min-h-screen gradient-bg flex flex-col items-center justify-center p-4">
        <div className="mb-6 relative z-10">
          <img src={heirwayLogo} alt="Heirway" className="h-40 w-auto" />
        </div>
        <Card className="glass-panel max-w-md w-full relative z-10 animate-fade-in">
          <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
          <CardContent className="p-8 space-y-6">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <h2 className="text-xl font-display font-bold text-foreground mb-2">
                Verification Link Issue
              </h2>
              <p className="text-sm text-muted-foreground">{linkError}</p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="resend_email" className="text-sm text-muted-foreground">Your email</Label>
              <Input
                id="resend_email"
                type="email"
                placeholder="you@example.com"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                className="h-12 bg-muted/30 border-border/40"
              />
              <Button
                onClick={handleResend}
                disabled={resending}
                className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground h-12"
              >
                {resending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
                {resending ? 'Sending...' : 'Send New Verification Email'}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/login')}
              >
                Back to Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ----- Loading state (with timeout fallback above) -----
  if (!sessionReady) {
    return (
      <div className="min-h-screen gradient-bg flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Verifying your link...</p>
      </div>
    );
  }

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
        <CardContent className="p-8 space-y-6">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-display font-bold text-foreground mb-2">
              Create Your Password
            </h2>
            <p className="text-sm text-muted-foreground">
              Set a password to secure your Heirway account.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="new_password" className="text-sm text-muted-foreground">Password</Label>
              <PasswordInput
                id="new_password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                className="h-12 bg-muted/30 border-border/40 mt-1"
              />
            </div>
            <div>
              <Label htmlFor="confirm_new_password" className="text-sm text-muted-foreground">Confirm Password</Label>
              <PasswordInput
                id="confirm_new_password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                className="h-12 bg-muted/30 border-border/40 mt-1"
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <Button
            onClick={handleSetPassword}
            disabled={loading || password.length < 8 || password !== confirmPassword}
            className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground h-12"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {loading ? 'Setting Password...' : 'Set Password & Continue'}
            {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
