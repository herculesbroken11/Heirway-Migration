import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart } from 'lucide-react';

interface HealthData {
  avgDaysToDecision: number;
  pctRequiringPilots: number;
  pctAuthorityGated: number;
  pctPausedResumed: number;
}

interface HealthMetricsProps {
  data: HealthData;
  isLoading: boolean;
}

export function HealthMetrics({ data, isLoading }: HealthMetricsProps) {
  const metrics = [
    { label: 'Avg Days to Decision', value: `${data.avgDaysToDecision}d`, subtext: 'Orientation → Decision' },
    { label: 'Requiring Pilots', value: `${data.pctRequiringPilots}%`, subtext: 'ISI ≥ 4' },
    { label: 'Authority-gated', value: `${data.pctAuthorityGated}%`, subtext: 'ADI ≥ 5' },
    { label: 'Paused & Resumed', value: `${data.pctPausedResumed}%`, subtext: 'Re-engagement rate' },
  ];

  return (
    <Card className="glass-panel overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-1.5 rounded-lg bg-secondary/10 border border-secondary/20">
            <Heart className="w-4 h-4 text-secondary-foreground" />
          </div>
          System Health
        </CardTitle>
        <CardDescription className="text-xs">
          Decision quality and process calm metrics
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-muted/30 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {metrics.map((metric) => (
              <div 
                key={metric.label}
                className="p-3 rounded-lg bg-card/40 border border-border/30 text-center"
              >
                <p className="text-xl font-bold text-foreground">{metric.value}</p>
                <p className="text-[10px] text-muted-foreground">{metric.label}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
