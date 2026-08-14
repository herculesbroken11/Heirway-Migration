import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Mail, Phone, Sparkles } from "lucide-react";
import heirwayLogo from "@/assets/heirway-logo.png";

const AssessmentComplete = () => {
  const location = useLocation();
  const name = location.state?.name || "there";

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  return (
    <div className="min-h-screen gradient-bg">
      {/* Decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      <header className="relative z-10 border-b border-border/20 bg-card/30 backdrop-blur-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <img src={heirwayLogo} alt="Heirway" className="h-10 w-auto" />
            <div>
              <h1 className="text-xl font-display font-bold text-foreground">Trust Structural Readiness & Risk Review</h1>
              <p className="text-sm text-muted-foreground">Comprehensive Planning Assessment</p>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-16 max-w-2xl">
        <Card className="glass-panel overflow-hidden text-center animate-fade-in">
          {/* Decorative header gradient */}
          <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-primary to-emerald-500" />
          
          <CardContent className="pt-12 pb-12">
            <div className="mx-auto w-24 h-24 rounded-2xl bg-success/10 backdrop-blur-sm border border-success/20 flex items-center justify-center mb-6">
              <CheckCircle className="h-12 w-12 text-success" />
            </div>

            <h1 className="text-3xl font-display font-bold text-foreground mb-4">
              Thank You, {name.split(" ")[0]}!
            </h1>

            <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
              Your submission has been sent successfully. Our team will review your responses and reach out to discuss next steps.
            </p>

            <div className="glass-card p-6 max-w-md mx-auto text-left">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-foreground">What happens next?</h2>
              </div>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                    <CheckCircle className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-muted-foreground">Our advisors will analyze your diagnostic results</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-muted-foreground">You'll receive a personalized follow-up within 24-48 hours</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                    <Phone className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-muted-foreground">We'll schedule a consultation to discuss your options</span>
                </li>
              </ul>
            </div>

            <p className="text-sm text-muted-foreground mt-8">
              Questions? Send us a message through our{" "}
              <a href="/heirway#contact" className="text-primary hover:underline font-medium">
                contact form
              </a>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AssessmentComplete;
