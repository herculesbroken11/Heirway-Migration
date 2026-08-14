import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, ArrowLeft } from 'lucide-react';
import { useForceLightMode } from '@/hooks/useForceLightMode';
import heirwayLogo from '@/assets/heirway-logo-transparent.png';

export default function EmailVerification() {
  useForceLightMode();

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
        <CardContent className="p-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="w-8 h-8 text-primary" />
          </div>

          <div>
            <h2 className="text-xl font-display font-bold text-foreground mb-2">
              Check Your Email
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We've sent a verification link to your email address. Click the link to create your password and access the Heirway portal.
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 text-xs text-muted-foreground space-y-1">
            <p>• Check your spam or junk folder if you don't see it</p>
            <p>• The link will expire in 24 hours</p>
            <p>• You'll be prompted to create your password after verifying</p>
          </div>

          <div className="pt-2 space-y-3">
            <Button asChild variant="outline" className="w-full">
              <Link to="/login?mode=login">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Sign In
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
