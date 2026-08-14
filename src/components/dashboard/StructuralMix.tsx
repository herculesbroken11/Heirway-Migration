import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers } from 'lucide-react';

interface StructuralMixData {
  minimal: number;
  coreStack: number;
  advanced: number;
}

interface StructuralMixProps {
  data: StructuralMixData;
  isLoading: boolean;
}

export function StructuralMix({ data, isLoading }: StructuralMixProps) {
  const segments = [
    { label: 'Minimal', percentage: data.minimal, color: 'bg-chart-5', description: 'SCS ≤ 4' },
    { label: 'Core Stack', percentage: data.coreStack, color: 'bg-chart-3', description: 'SCS 5-10' },
    { label: 'Advanced', percentage: data.advanced, color: 'bg-chart-1', description: 'SCS > 10' },
  ];

  const total = data.minimal + data.coreStack + data.advanced;

  return (
    <Card className="glass-panel overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-1.5 rounded-lg bg-chart-3/10 border border-chart-3/20">
            <Layers className="w-4 h-4 text-chart-3" />
          </div>
          Structural Complexity
        </CardTitle>
        <CardDescription className="text-xs">
          Architecture demand across the client base
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="h-20 bg-muted/30 rounded-lg animate-pulse" />
        ) : (
          <>
            {/* Stacked bar */}
            <div className="h-6 rounded-lg overflow-hidden flex mb-4">
              {segments.map((seg) => (
                <div
                  key={seg.label}
                  className={`${seg.color} transition-all duration-500`}
                  style={{ width: total > 0 ? `${(seg.percentage / total) * 100}%` : '33%' }}
                />
              ))}
            </div>
            
            {/* Legend */}
            <div className="grid grid-cols-3 gap-2">
              {segments.map((seg) => (
                <div key={seg.label} className="text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-0.5">
                    <div className={`w-2 h-2 rounded-full ${seg.color}`} />
                    <span className="text-xs font-medium">{seg.percentage}%</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{seg.label}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
