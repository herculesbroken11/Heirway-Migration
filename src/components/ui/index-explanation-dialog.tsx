import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { INDEX_METADATA } from '@/lib/scoring';

interface IndexExplanationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  indexKey: keyof typeof INDEX_METADATA | null;
  score?: number;
  interpretation?: {
    level: 'low' | 'moderate' | 'high';
    label: string;
    description: string;
  };
}

export function IndexExplanationDialog({
  open,
  onOpenChange,
  indexKey,
  score,
  interpretation,
}: IndexExplanationDialogProps) {
  if (!indexKey) return null;

  const meta = INDEX_METADATA[indexKey];

  const getBandColor = (level: 'low' | 'moderate' | 'high') => {
    switch (level) {
      case 'low':
        return 'bg-success/10 text-success border-success/20';
      case 'moderate':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'high':
        return 'bg-destructive/10 text-destructive border-destructive/20';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel border-primary/20 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-primary font-mono text-xl">{meta.abbrev}</span>
            <span>{meta.name}</span>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {meta.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {score !== undefined && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
              <span className="text-sm text-muted-foreground">Current Score</span>
              <span className="text-2xl font-bold text-primary">
                {score}
                <span className="text-sm text-muted-foreground font-normal">
                  /{meta.maxScore}
                </span>
              </span>
            </div>
          )}

          {interpretation && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Interpretation:</span>
                <Badge
                  className={`${getBandColor(interpretation.level)} border rounded-lg text-xs`}
                >
                  {interpretation.label}
                </Badge>
              </div>
              <p className="text-sm text-foreground/80">{interpretation.description}</p>
            </div>
          )}

          <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Purpose
            </p>
            <p className="text-sm text-foreground">{meta.purpose}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
