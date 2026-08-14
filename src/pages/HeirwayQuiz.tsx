import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useForceLightMode } from '@/hooks/useForceLightMode';
import PrivateTrustQuiz from '@/components/heirway/PrivateTrustQuiz';
import heirwayLogo from '@/assets/heirway-logo-transparent.png';

export default function HeirwayQuiz() {
  useForceLightMode();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-card/90 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/heirway" className="shrink-0">
            <img src={heirwayLogo} alt="Heirway" className="h-28 w-auto" />
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm flex-1 justify-center">
            {['Why Heirway', 'How it Works', 'Pricing', 'FAQ'].map(l => (
              <Link
                key={l}
                to={l === 'Pricing' ? '/heirway/pricing' : `/heirway#${l.toLowerCase().replace(/\s+/g, '-')}`}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {l}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login?mode=login">
              <Button variant="ghost" className="rounded-full px-5 h-9 text-sm">Login</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Quiz */}
      <div className="max-w-4xl mx-auto px-6 py-12 md:py-20">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-medium mb-3">Get Started</p>
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-3">
            Find Out Where You Stand
          </h1>
          <p className="text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Answer a few questions to uncover gaps in your current plan and get a personalized recommendation.
          </p>
        </div>
        <PrivateTrustQuiz />
      </div>
    </div>
  );
}
