import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface BottleneckItem {
  reason: string;
  count: number;
  avgDaysStalled: number;
}

interface BottleneckAnalysisProps {
  items: BottleneckItem[];
  isLoading: boolean;
}

export function BottleneckAnalysis({ items, isLoading }: BottleneckAnalysisProps) {
  return (
    <Card className="glass-panel overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-1.5 rounded-lg bg-warning/10 border border-warning/20">
            <AlertCircle className="w-4 h-4 text-warning" />
          </div>
          Bottleneck Analysis
        </CardTitle>
        <CardDescription className="text-xs">
          Where cognition, authority, or clarity breaks down
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-muted/30 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No bottlenecks identified</p>
        ) : (
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div
                key={item.reason}
                className="flex items-center justify-between p-3 rounded-lg bg-card/40 border border-border/30"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-muted-foreground/50">{idx + 1}</span>
                  <div>
                    <p className="text-sm font-medium">{item.reason}</p>
                    <p className="text-[10px] text-muted-foreground">
                      ~{item.avgDaysStalled} days avg stall time
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-foreground">{item.count}</p>
                  <p className="text-[10px] text-muted-foreground">clients</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
