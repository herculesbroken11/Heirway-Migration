import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';

interface ActivityMetrics {
  started7d: number;
  started14d: number;
  started30d: number;
  completed: number;
  abandoned: number;
  notOriented: number;
}

interface ActivityMonitorProps {
  metrics: ActivityMetrics;
  isLoading: boolean;
}

export function ActivityMonitor({ metrics, isLoading }: ActivityMonitorProps) {
  const statItems = [
    { label: '7 Days', value: metrics.started7d, subLabel: 'started' },
    { label: '14 Days', value: metrics.started14d, subLabel: 'started' },
    { label: '30 Days', value: metrics.started30d, subLabel: 'started' },
  ];

  return (
    <Card className="glass-panel overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
            <Activity className="w-4 h-4 text-primary" />
          </div>
          Assessment Activity
        </CardTitle>
        <CardDescription className="text-xs">
          System-level diagnostic flow signals
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="grid grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted/30 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {statItems.map((item) => (
                <div key={item.label} className="text-center p-3 rounded-lg bg-card/40 border border-border/30">
                  <p className="text-2xl font-bold text-foreground">{item.value}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{item.label}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-lg bg-success/10 border border-success/20 text-center">
                <p className="text-lg font-semibold text-success">{metrics.completed}</p>
                <p className="text-[10px] text-success/80">Completed</p>
              </div>
              <div className="p-2.5 rounded-lg bg-warning/10 border border-warning/20 text-center">
                <p className="text-lg font-semibold text-warning">{metrics.notOriented}</p>
                <p className="text-[10px] text-warning/80">Not Oriented</p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/30 border border-border/20 text-center">
                <p className="text-lg font-semibold text-muted-foreground">{metrics.abandoned}</p>
                <p className="text-[10px] text-muted-foreground">Abandoned</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
