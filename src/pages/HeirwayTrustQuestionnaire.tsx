import { Link } from 'react-router-dom';
import { useForceLightMode } from '@/hooks/useForceLightMode';
import HeirwayQuestionnaire from '@/components/heirway/HeirwayQuestionnaire';
import heirwayLogo from '@/assets/heirway-logo-transparent.png';

export default function HeirwayTrustQuestionnaire() {
  useForceLightMode();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 bg-card/90 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/heirway/dashboard" className="shrink-0">
            <img src={heirwayLogo} alt="Heirway" className="h-28 w-auto" />
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12 md:py-20">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-medium mb-3">Private Trust Recommendation</p>
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-3">
            Let's Find the Right Plan for You
          </h1>
          <p className="text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Answer a few questions about your situation so we can recommend the best private trust plan for your needs.
          </p>
        </div>
        <HeirwayQuestionnaire />
      </div>
    </div>
  );
}
