import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { useForceLightMode } from '@/hooks/useForceLightMode';
import heirwayLogo from '@/assets/heirway-logo-transparent.png';

const BOOKING_URL = 'https://api.leadconnectorhq.com/widget/booking/SUmVKbdDpXy6hp9f0FvO';

export default function HeirwayOnboardingCall() {
  useForceLightMode();

  const navigate = useNavigate();

  useEffect(() => {
    // Load the GHL form embed script
    const script = document.createElement('script');
    script.src = 'https://link.msgsndr.com/js/form_embed.js';
    script.type = 'text/javascript';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div className="min-h-screen gradient-bg">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 p-4 md:p-8 max-w-3xl mx-auto">
        <div className="flex flex-col items-center mb-6">
          <img src={heirwayLogo} alt="Heirway" className="h-28 w-auto" />
        </div>

        {/* Success banner */}
        <Card className="glass-panel mb-6 animate-fade-in">
          <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
          <CardContent className="p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-xl font-display font-bold text-foreground mb-1">
              Payment Successful!
            </h1>
            <p className="text-sm text-muted-foreground">
              Your enrollment is confirmed. Book your onboarding call below to get started with your estate planning journey.
            </p>
          </CardContent>
        </Card>

        {/* Embedded calendar */}
        <Card className="glass-panel animate-fade-in">
          <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
          <CardContent className="p-4 md:p-6">
            <h2 className="text-lg font-display font-bold text-foreground mb-4 text-center">
              Schedule Your Onboarding Call
            </h2>
            <iframe
              src={BOOKING_URL}
              style={{ width: '100%', border: 'none', overflow: 'hidden', minHeight: '600px' }}
              scrolling="no"
              id="SUmVKbdDpXy6hp9f0FvO_1773243277839"
              title="Book Onboarding Call"
            />
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/heirway/dashboard')}
            className="text-muted-foreground hover:text-foreground"
          >
            Skip for now — go to dashboard
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
