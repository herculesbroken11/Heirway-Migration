import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useDashboardData } from '@/hooks/useDashboardData';
import { RiskQueue } from '@/components/dashboard/RiskQueue';
import { ActivityMonitor } from '@/components/dashboard/ActivityMonitor';
import { ProfileDistributionCard } from '@/components/dashboard/ProfileDistribution';
import { StructuralMix } from '@/components/dashboard/StructuralMix';
import { BottleneckAnalysis } from '@/components/dashboard/BottleneckAnalysis';
import { AuthorityDistribution } from '@/components/dashboard/AuthorityDistribution';
import { ReadinessPool } from '@/components/dashboard/ReadinessPool';
import { HealthMetrics } from '@/components/dashboard/HealthMetrics';
import { IntelligencePrompts } from '@/components/dashboard/IntelligencePrompts';
import { NotificationCenter } from '@/components/dashboard/NotificationCenter';
import { Brain, Link2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function Dashboard() {
  const data = useDashboardData();
  const [linkCopied, setLinkCopied] = useState(false);

  const handleCopyDiagnosticLink = async () => {
    const link = `${window.location.origin}/diagnostic`;
    await navigator.clipboard.writeText(link);
    setLinkCopied(true);
    toast.success('Diagnostic link copied to clipboard');
    setTimeout(() => setLinkCopied(false), 2000);
  };

  return (
    <AppLayout>
      <div className="min-h-screen gradient-bg">
        {/* Decorative elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-info/3 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 p-4 md:p-6">
          {/* Header */}
          <div className="mb-4 md:mb-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 md:p-2.5 rounded-xl bg-primary/10 backdrop-blur-sm border border-primary/20">
                  <Brain className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-display font-bold text-foreground">Diagnostic Intelligence</h1>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Risk patterns • Profile insights • System health
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleCopyDiagnosticLink}
                  variant="outline"
                  size="sm"
                  className="rounded-xl gap-2 bg-card/50"
                >
                  {linkCopied ? <Check className="w-4 h-4 text-success" /> : <Link2 className="w-4 h-4" />}
                  {linkCopied ? 'Copied!' : 'Copy Diagnostic Link'}
                </Button>
                <NotificationCenter />
              </div>
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
            {/* Left Column - Risk & Profiles */}
            <div className="lg:col-span-2 space-y-3 md:space-y-4">
              <div className="animate-fade-in" style={{ animationDelay: '50ms' }}>
                <RiskQueue items={data.riskQueue} isLoading={data.isLoading} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
                  <ProfileDistributionCard 
                    primary={data.primaryProfileDist} 
                    secondary={data.secondaryProfileDist}
                    isLoading={data.isLoading} 
                  />
                </div>
                <div className="animate-fade-in" style={{ animationDelay: '150ms' }}>
                  <StructuralMix data={data.structuralMix} isLoading={data.isLoading} />
                </div>
              </div>
            </div>

            {/* Right Column - Intelligence & Readiness */}
            <div className="space-y-3 md:space-y-4">
              <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
                <IntelligencePrompts prompts={data.intelligencePrompts} isLoading={data.isLoading} />
              </div>
              <div className="animate-fade-in" style={{ animationDelay: '150ms' }}>
                <AuthorityDistribution data={data.authorityDist} isLoading={data.isLoading} />
              </div>
              <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
                <ReadinessPool clients={data.readyPool} isLoading={data.isLoading} />
              </div>
            </div>
          </div>

          {/* Bottom Section - Activity, Bottlenecks & Health */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mt-3 md:mt-4">
            <div className="animate-fade-in" style={{ animationDelay: '300ms' }}>
              <ActivityMonitor metrics={data.activityMetrics} isLoading={data.isLoading} />
            </div>
            <div className="animate-fade-in" style={{ animationDelay: '350ms' }}>
              <BottleneckAnalysis items={data.bottlenecks} isLoading={data.isLoading} />
            </div>
            <div className="animate-fade-in" style={{ animationDelay: '400ms' }}>
              <HealthMetrics data={data.healthMetrics} isLoading={data.isLoading} />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
