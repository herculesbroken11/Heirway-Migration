import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, AlertCircle } from 'lucide-react';
import heirwayIcon from '@/assets/heirway-icon.png';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ForgotPasswordDialog } from '@/components/auth/ForgotPasswordDialog';

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resending, setResending] = useState(false);
  const [isFirstUser, setIsFirstUser] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

  const handleResendVerification = async () => {
    if (!loginEmail) {
      toast.error('Enter your email above first');
      return;
    }
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: loginEmail,
        options: { emailRedirectTo: `${window.location.origin}/set-password` },
      });
      if (error) {
        toast.error('Could not resend', { description: error.message });
      } else {
        toast.success('Verification email sent', {
          description: 'Check your inbox (and spam folder).',
        });
      }
    } finally {
      setResending(false);
    }
  };
  
  // Check if there are any existing users (for showing first admin message)
  useEffect(() => {
    const checkFirstUser = async () => {
      const { count } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true });
      setIsFirstUser(count === 0);
    };
    checkFirstUser();
  }, []);
  
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  // Format phone number as user types
  const formatPhoneNumber = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  // Validate phone number (must be exactly 10 digits)
  const isValidPhoneNumber = (phone: string): boolean => {
    const digits = phone.replace(/\D/g, '');
    return digits.length === 10;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setSignupPhone(formatted);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNeedsVerification(false);
    setIsLoading(true);

    try {
      const { data, error } = await signIn(loginEmail, loginPassword);
      if (error) {
        const isUnverified = /email not confirmed|not confirmed|email_not_confirmed/i.test(error.message);
        if (isUnverified) {
          setNeedsVerification(true);
          setError('Your email address has not been verified yet.');
        } else {
          setError(error.message);
          toast.error('Login failed', { description: error.message });
        }
      } else {
        toast.success('Welcome back!');
        // Check role — admins go to admin dashboard, clients go to heirway
        const { data: roleData } = await supabase.rpc('get_current_user_role');
        if (roleData === 'admin' || roleData === 'super_admin') {
          navigate('/dashboard');
        } else {
          // Check for heirway client record
          const userId = data.user?.id;
          if (userId) {
            const { data: clientRecord } = await supabase
              .from('heirway_clients')
              .select('id')
              .eq('user_id', userId)
              .maybeSingle();
            navigate(clientRecord ? '/heirway/dashboard' : '/heirway');
          } else {
            navigate('/heirway');
          }
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!disclaimerAccepted) {
      setError('You must agree to the data consent disclaimer to create an account');
      return;
    }

    // Validate phone number
    if (!isValidPhoneNumber(signupPhone)) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setIsLoading(true);

    try {
      const { error, data } = await signUp(signupEmail, signupPassword, signupName);
      if (error) {
        setError(error.message);
        toast.error('Signup failed', { description: error.message });
      } else {
        // Log consent for signup
        await supabase.from('consent_log' as any).insert({
          user_id: data?.user?.id || null,
          email: signupEmail,
          full_name: signupName,
          consent_type: 'terms_and_privacy',
          form_context: 'signup',
          privacy_policy_version: '03/11/2026',
          terms_version: '03/11/2026',
        } as any);

        toast.success('Account created!', { description: 'You can now access the dashboard.' });
        navigate('/dashboard');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 shadow-elevated">
            <img src={heirwayIcon} alt="Heirway" className="w-10 h-10 object-contain" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">Heirway Admin Intelligence Console</h1>
          <p className="text-muted-foreground mt-2 text-center">
            Prospect psychology assessment platform
          </p>
        </div>

        <Card className="shadow-elevated border-border/50">
          <Tabs defaultValue="login" className="w-full">
            <CardHeader className="pb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Create Account</TabsTrigger>
              </TabsList>
            </CardHeader>
            
            <CardContent>
              <TabsContent value="login" className="mt-0">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@company.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <PasswordInput
                      id="login-password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="flex justify-end">
                    <ForgotPasswordDialog />
                  </div>

                  {error && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{error}</span>
                      </div>
                      {needsVerification && (
                        <div className="text-sm bg-muted/50 border border-border rounded-lg p-3 space-y-2">
                          <p className="text-muted-foreground">
                            We sent a verification link to <span className="font-medium text-foreground">{loginEmail}</span> when you signed up. Click that link to activate your account.
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={handleResendVerification}
                            disabled={resending}
                          >
                            {resending ? (
                              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>
                            ) : (
                              'Resend verification email'
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-0">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name *</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Smith"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">Phone Number *</Label>
                    <Input
                      id="signup-phone"
                      type="tel"
                      placeholder="(555) 123-4567"
                      value={signupPhone}
                      onChange={handlePhoneChange}
                      required
                      disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground">Enter a valid 10-digit phone number</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email *</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@company.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password *</Label>
                    <PasswordInput
                      id="signup-password"
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                      minLength={6}
                      disabled={isLoading}
                    />
                  </div>

                  <label className="flex items-start gap-3 text-left p-3 rounded-lg border border-border bg-muted/30 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={disclaimerAccepted}
                      onChange={(e) => setDisclaimerAccepted(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-primary text-primary focus:ring-primary"
                    />
                    <span className="text-xs text-muted-foreground leading-relaxed">
                      By checking this box, I agree to Heirway's <Link to="/privacy" target="_blank" className="text-primary underline">Privacy Policy</Link> and <Link to="/terms" target="_blank" className="text-primary underline">Terms of Service</Link>. This acts as my electronic signature and consent to the collection and use of my personal information (name, email, phone number) for account management and communication purposes. I can request data deletion at any time. <span className="text-destructive">*</span>
                    </span>
                  </label>

                  <div className="text-left p-3 rounded-lg border border-border bg-muted/20">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      <span className="font-semibold text-foreground">SMS Notifications:</span> By providing your mobile number and creating an account, you agree to receive account notification text messages from Heirway, including password change confirmations, login alerts, email verification reminders, payment receipts, and trust meeting reminders. Message frequency varies based on account activity. Message and data rates may apply. Reply <span className="font-semibold">STOP</span> to unsubscribe or <span className="font-semibold">HELP</span> for help. See our <Link to="/privacy" target="_blank" className="text-primary underline">Privacy Policy</Link> and <Link to="/terms" target="_blank" className="text-primary underline">Terms of Service</Link>. Your number will not be shared with third parties or affiliates for marketing purposes.
                    </p>
                  </div>
                  
                  {error && (
                    <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                  
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {isFirstUser ? 'Creating admin account...' : 'Creating account...'}
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                  
                  {isFirstUser ? (
                    <p className="text-xs text-muted-foreground text-center">
                      This will be the admin account for this application.
                    </p>
                  ) : (
                    <p className="text-xs text-destructive/80 text-center">
                      Admin login only. Prospects should use the diagnostic form link provided.
                    </p>
                  )}
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
