import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';

interface AuthorityData {
  founderLed: number;
  cpaGated: number;
  attorneyGated: number;
  boardGated: number;
  multiAuthority: number;
}

interface AuthorityDistributionProps {
  data: AuthorityData;
  isLoading: boolean;
}

export function AuthorityDistribution({ data, isLoading }: AuthorityDistributionProps) {
  const items = [
    { label: 'Founder-led', value: data.founderLed, color: 'bg-success' },
    { label: 'CPA-gated', value: data.cpaGated, color: 'bg-chart-2' },
    { label: 'Attorney-gated', value: data.attorneyGated, color: 'bg-chart-3' },
    { label: 'Board/Partner-gated', value: data.boardGated, color: 'bg-chart-4' },
    { label: 'Multi-authority', value: data.multiAuthority, color: 'bg-destructive' },
  ];

  return (
    <Card className="glass-panel overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-1.5 rounded-lg bg-accent/10 border border-accent/20">
            <Shield className="w-4 h-4 text-accent" />
          </div>
          Authority Distribution
        </CardTitle>
        <CardDescription className="text-xs">
          How decisions are actually controlled across the client base
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-6 bg-muted/30 rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-2.5">
            {items.map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground/80">{item.label}</span>
                  <span className="font-mono text-muted-foreground">{item.value}%</span>
                </div>
                <div className="h-1.5 bg-border/30 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${item.color} rounded-full transition-all duration-500`}
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
