import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PROFILE_DETAILS, type ProfileDetail } from '@/lib/scoring';
import { Lightbulb, Briefcase, DollarSign } from 'lucide-react';

interface ProfileExplanationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileName: string | null;
}

export function ProfileExplanationDialog({
  open,
  onOpenChange,
  profileName,
}: ProfileExplanationDialogProps) {
  if (!profileName) return null;

  const details: ProfileDetail | undefined = PROFILE_DETAILS[profileName];

  if (!details) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="glass-panel border-primary/20 max-w-md">
          <DialogHeader>
            <DialogTitle>{profileName}</DialogTitle>
            <DialogDescription>Profile details not available.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel border-primary/20 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">{profileName}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {details.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="p-3 rounded-lg bg-muted/30 border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              What This Means
            </p>
            <p className="text-sm text-foreground">{details.meaning}</p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-warning" />
              <span className="font-semibold text-sm">Recommended Approach</span>
            </div>
            <ul className="space-y-1.5 ml-6">
              {details.approach.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-warning mt-2 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="w-4 h-4 text-accent" />
              <span className="font-semibold text-sm">Assets Needed</span>
            </div>
            <ul className="space-y-1.5 ml-6">
              {details.assets.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="p-3 rounded-xl bg-success/5 border border-success/20">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-success" />
              <span className="font-semibold text-sm">Pricing Strategy</span>
            </div>
            <p className="text-sm text-muted-foreground ml-6">{details.pricing}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
