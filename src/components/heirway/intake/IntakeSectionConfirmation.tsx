import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import heirwayIcon from '@/assets/heirway-icon.png';

interface Props {
  confirmed: boolean;
  onConfirmedChange: (v: boolean) => void;
}

export default function IntakeSectionConfirmation({ confirmed, onConfirmedChange }: Props) {
  return (
    <div className="space-y-6">
      <div className="glass-panel p-6 rounded-lg text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <img src={heirwayIcon} alt="Heirway" className="w-10 h-10 object-contain" />
        </div>
        <h3 className="text-xl font-display font-bold text-foreground mb-2">Almost There!</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
          Please review your information and confirm below. After submission, our team will begin preparing your trust structure and you'll receive a "What to Expect Next" overview.
        </p>

        <label className="flex items-start gap-3 text-left p-4 rounded-lg border border-border bg-muted/30 cursor-pointer max-w-lg mx-auto">
          <Checkbox
            checked={confirmed}
            onCheckedChange={(checked) => onConfirmedChange(checked === true)}
            className="mt-0.5"
          />
          <span className="text-sm text-foreground leading-relaxed">
            I certify that the information provided is accurate to the best of my knowledge. By checking this box, I agree to Heirway's <Link to="/privacy" target="_blank" className="text-primary underline">Privacy Policy</Link> and <Link to="/terms" target="_blank" className="text-primary underline">Terms of Service</Link>. This acts as my electronic signature. <span className="text-destructive">*</span>
          </span>
        </label>

        {confirmed && (
          <div className="flex items-center justify-center gap-2 mt-4 text-primary animate-fade-in">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">Ready to submit</span>
          </div>
        )}
      </div>
    </div>
  );
}
