import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { completePasswordRecovery } from '@/lib/passwordRecoveryCompletion';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import heirwayIcon from '@/assets/heirway-icon.png';
import { toast } from 'sonner';

export default function ResetPassword() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecovery, setIsRecovery] = useState(false);
  const [checking, setChecking] = useState(true);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Listen for the PASSWORD_RECOVERY event (fires when recovery link is processed)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setIsRecovery(true);
        setChecking(false);
      }
    });

    const initialize = async () => {
      try {
        // 1) PKCE-style recovery link: ?code=...
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        if (code) {
          const { error: exchErr } = await supabase.auth.exchangeCodeForSession(code);
          if (mounted) {
            if (exchErr) setError(exchErr.message);
            else setIsRecovery(true);
            setChecking(false);
          }
          return;
        }

        // 2) Legacy hash-style recovery link: #access_token=...&refresh_token=...&type=recovery
        if (window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
          const access_token = hashParams.get('access_token');
          const refresh_token = hashParams.get('refresh_token');
          const type = hashParams.get('type');
          if (access_token && refresh_token && type === 'recovery') {
            const { error: setErr } = await supabase.auth.setSession({ access_token, refresh_token });
            if (mounted) {
              if (setErr) setError(setErr.message);
              else setIsRecovery(true);
              setChecking(false);
            }
            return;
          }
        }

        // 3) Fallback: existing session (e.g. PASSWORD_RECOVERY already handled)
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          if (session) setIsRecovery(true);
          setChecking(false);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err?.message || 'Could not validate reset link');
          setChecking(false);
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const result = await completePasswordRecovery({
        updatePassword: async () => {
          const { error } = await supabase.auth.updateUser({ password });
          return { error };
        },
        // Global: revoke recovery (and other) refresh tokens after a password change.
        signOut: async () => supabase.auth.signOut({ scope: 'global' }),
        onPasswordUpdated: () => {
          toast.success('Password updated successfully!');
        },
        onBeforeSignOut: () => {
          setCompleted(true);
          queryClient.clear();
        },
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      // Keep success UI visible briefly, then force login (avoids Login auto-route race).
      await new Promise((resolve) => setTimeout(resolve, 900));
      navigate('/login?mode=login', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isRecovery && !completed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full shadow-elevated border-border/50">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-display font-bold text-foreground mb-2">Invalid or Expired Link</h2>
            <p className="text-muted-foreground mb-4">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <Button onClick={() => navigate('/login')} className="w-full">
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full shadow-elevated border-border/50">
          <CardContent className="p-6 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
            <h2 className="text-xl font-display font-bold text-foreground">Password updated</h2>
            <p className="text-sm text-muted-foreground">
              Your password has been changed. Please sign in with your new password.
            </p>
            <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 shadow-elevated">
            <img src={heirwayIcon} alt="Heirway" className="w-10 h-10 object-contain" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">Set New Password</h1>
          <p className="text-muted-foreground mt-2 text-center">Enter your new password below</p>
        </div>

        <Card className="shadow-elevated border-border/50">
          <CardContent className="p-6">
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <PasswordInput
                  id="new-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <PasswordInput
                  id="confirm-password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating password...
                  </>
                ) : (
                  'Update Password'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
