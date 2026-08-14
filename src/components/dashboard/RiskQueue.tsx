import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface RiskQueueItem {
  id: string;
  clientName: string;
  primaryProfile: string;
  dominantRiskIndex: string;
  riskScore: number;
  reasonFlagged: string;
  phase: string;
}

interface RiskQueueProps {
  items: RiskQueueItem[];
  isLoading: boolean;
}

// Use warm gold/amber spectrum - no blues
const indexColors: Record<string, string> = {
  LAI: 'bg-destructive/20 text-destructive border-destructive/30',
  ISI: 'bg-warning/20 text-warning border-warning/30',
  ADI: 'bg-accent/20 text-accent border-accent/30',
  CSI: 'bg-primary/20 text-primary border-primary/30',
  AETI: 'bg-secondary/20 text-secondary-foreground border-secondary/30',
  SCS: 'bg-success/20 text-success border-success/30',
  PFI: 'bg-muted text-muted-foreground border-border',
};

const phaseLabels: Record<string, string> = {
  new: 'Intake',
  contacted: 'Contacted',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  closed_won: 'Active',
  closed_lost: 'Closed',
};

export function RiskQueue({ items, isLoading }: RiskQueueProps) {
  return (
    <Card className="glass-panel overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-1.5 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="w-4 h-4 text-destructive" />
          </div>
          Risk & Attention Queue
        </CardTitle>
        <CardDescription className="text-xs">
          Clients requiring human judgment due to psychological, authority, or structural risk
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted/30 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No clients flagged for attention</p>
        ) : (
          <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
            {items.map((item) => (
              <Link
                key={item.id}
                to={`/assessment/${item.id}/results`}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-destructive/5 border border-destructive/20 hover:bg-destructive/10 hover:border-destructive/30 transition-colors block"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate">
                      {item.clientName}
                    </span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                      {phaseLabels[item.phase] || item.phase}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{item.reasonFlagged}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge className={`text-[10px] font-mono ${indexColors[item.dominantRiskIndex] || 'bg-muted'}`}>
                    {item.dominantRiskIndex}: {item.riskScore}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
