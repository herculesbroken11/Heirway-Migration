import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ReadyClient {
  id: string;
  clientName: string;
  primaryProfile: string;
  scsScore: number;
}

interface ReadinessPoolProps {
  clients: ReadyClient[];
  isLoading: boolean;
}

export function ReadinessPool({ clients, isLoading }: ReadinessPoolProps) {
  return (
    <Card className="glass-panel overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-1.5 rounded-lg bg-success/10 border border-success/20">
            <CheckCircle2 className="w-4 h-4 text-success" />
          </div>
          Execution Readiness
        </CardTitle>
        <CardDescription className="text-xs">
          Clients psychologically and structurally ready for execution
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 bg-muted/30 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : clients.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No clients currently in readiness pool</p>
        ) : (
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
            {clients.map((client) => (
              <Link
                key={client.id}
                to={`/assessment/${client.id}/results`}
                className="flex items-center justify-between p-2.5 rounded-lg bg-success/5 border border-success/20 hover:bg-success/10 hover:border-success/30 transition-colors block"
              >
                <div className="min-w-0">
                  <span className="text-sm font-medium truncate block">
                    {client.clientName}
                  </span>
                  <p className="text-[10px] text-muted-foreground truncate">{client.primaryProfile}</p>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono bg-success/10 text-success border-success/30">
                  SCS: {client.scsScore}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
