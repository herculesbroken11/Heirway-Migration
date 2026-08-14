import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

interface ProfileDistribution {
  profile: string;
  count: number;
  percentage: number;
}

interface ProfileDistributionProps {
  primary: ProfileDistribution[];
  secondary: ProfileDistribution[];
  isLoading: boolean;
}

// Use gold/amber spectrum - no blues
const profileColors: Record<string, string> = {
  'Loss Averse Overpayer': 'bg-chart-1',
  'Authority Gated Optimizer': 'bg-chart-2',
  'Control Sensitive Operator': 'bg-chart-3',
  'Rational Maximizer': 'bg-chart-4',
  'Legacy Builder': 'bg-chart-5',
  'Asset Rich Cash Constrained Landowner': 'bg-chart-6',
  'Institutional or Investment Firm': 'bg-chart-7',
};

function ProfileBar({ profile, percentage }: { profile: string; percentage: number }) {
  const colorClass = profileColors[profile] || 'bg-primary';
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="truncate text-foreground/80">{profile}</span>
        <span className="font-mono text-muted-foreground ml-2">{percentage}%</span>
      </div>
      <div className="h-1.5 bg-border/30 rounded-full overflow-hidden">
        <div 
          className={`h-full ${colorClass} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export function ProfileDistributionCard({ primary, secondary, isLoading }: ProfileDistributionProps) {
  return (
    <Card className="glass-panel overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
            <Users className="w-4 h-4 text-primary" />
          </div>
          Profile Distribution
        </CardTitle>
        <CardDescription className="text-xs">
          Calibration view — who the system is attracting
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-8 bg-muted/30 rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">Primary Profiles</p>
              <div className="space-y-2">
                {primary.slice(0, 4).map((p) => (
                  <ProfileBar key={p.profile} profile={p.profile} percentage={p.percentage} />
                ))}
              </div>
            </div>
            {secondary.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">Secondary Profiles</p>
                <div className="space-y-2">
                  {secondary.slice(0, 3).map((p) => (
                    <ProfileBar key={p.profile} profile={p.profile} percentage={p.percentage} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
