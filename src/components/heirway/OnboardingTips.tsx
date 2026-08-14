import { useState, useEffect } from 'react';
import { useClientProfile, type ClientTier } from '@/hooks/useClientProfile';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard, BarChart3, BookOpen, Building2, FileText, Users,
  ChevronRight, ChevronLeft, Sparkles, Shield, Plus, Search,
} from 'lucide-react';

interface TipStep {
  icon: React.ElementType;
  title: string;
  description: string;
  minTier: ClientTier;
}

const ALL_TIPS: TipStep[] = [
  {
    icon: LayoutDashboard,
    title: 'Your Dashboard',
    description: 'Your dashboard shows your estate overview at a glance — total net worth, assets protected vs exposed, and risk alerts. Check here regularly to monitor your estate health.',
    minTier: 'free',
  },
  {
    icon: BarChart3,
    title: 'Asset Tracker',
    description: 'Add your assets (real estate, accounts, businesses, silver, etc.) from the dashboard. Each asset can be marked as protected or exposed, and the system will generate risk alerts for unprotected items.',
    minTier: 'free',
  },
  {
    icon: Plus,
    title: 'Adding Assets',
    description: 'Click "Add Asset" on your dashboard to log a new asset. Choose the type, enter its value, and indicate whether it\'s held in a private trust. You can edit or remove assets anytime.',
    minTier: 'free',
  },
  {
    icon: BookOpen,
    title: 'Learning Modules',
    description: 'Access training videos organized by module in the Learning section. Free users get introductory content. Education subscribers unlock the full library with monthly live trainings.',
    minTier: 'free',
  },
  {
    icon: Search,
    title: 'Knowledge Base',
    description: 'Browse articles, guides, and resources in the Knowledge Base. Use the search and category filters to find answers about trusts, estate planning, tax strategies, and more.',
    minTier: 'free',
  },
  {
    icon: FileText,
    title: 'Document Vault',
    description: 'Upload and organize important documents like wills, deeds, insurance policies, and tax returns in your secure Document Vault. Documents are categorized for easy access.',
    minTier: 'free',
  },
  {
    icon: Building2,
    title: 'Trust Vault',
    description: 'Your Trust Vault is your command center for managing private trusts. View trust progress stages, assigned trustees and beneficiaries, meeting minutes, and linked assets — all in one place.',
    minTier: 'trust',
  },
  {
    icon: Shield,
    title: 'Adding & Managing Trusts',
    description: 'Your trust structures are set up through your plan. Track each trust\'s progress from document processing through to completion. You can view trust details, update bank account status, and manage annual meeting dates.',
    minTier: 'trust',
  },
  {
    icon: Users,
    title: 'Family Governance',
    description: 'Invite trustees and beneficiaries to your trusts. Manage who has access, set power levels, and track beneficiary learning progress — all from the Family Governance section.',
    minTier: 'trust',
  },
];

function getTierOrder(tier: ClientTier): number {
  return tier === 'free' ? 0 : tier === 'education' ? 1 : 2;
}

interface OnboardingTipsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function OnboardingTips({ open, onOpenChange }: OnboardingTipsProps) {
  const { tier } = useClientProfile();
  const [step, setStep] = useState(0);

  const tips = ALL_TIPS.filter(t => getTierOrder(tier) >= getTierOrder(t.minTier));

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const current = tips[step];
  if (!current) return null;

  const Icon = current.icon;
  const isLast = step === tips.length - 1;
  const isFirst = step === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs">
              <Sparkles className="w-3 h-3 mr-1" />
              Tip {step + 1} of {tips.length}
            </Badge>
          </div>
          <DialogTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            {current.title}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed pt-2">
            {current.description}
          </DialogDescription>
        </DialogHeader>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 py-2">
          {tips.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === step ? 'bg-primary w-5' : 'bg-muted-foreground/20 hover:bg-muted-foreground/40'
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep(s => s - 1)}
            disabled={isFirst}
            className="text-muted-foreground"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          {isLast ? (
            <Button size="sm" onClick={() => onOpenChange(false)}>
              Got it!
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setStep(s => s + 1)}>
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
