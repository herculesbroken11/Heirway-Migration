import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, AlertTriangle, Info } from 'lucide-react';

interface IntelligencePrompt {
  message: string;
  type: 'info' | 'warning' | 'insight';
}

interface IntelligencePromptsProps {
  prompts: IntelligencePrompt[];
  isLoading: boolean;
}

const typeConfig = {
  info: {
    icon: Info,
    bgColor: 'bg-accent/10',
    borderColor: 'border-accent/30',
    textColor: 'text-accent',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning/30',
    textColor: 'text-warning',
  },
  insight: {
    icon: Lightbulb,
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/30',
    textColor: 'text-primary',
  },
};

export function IntelligencePrompts({ prompts, isLoading }: IntelligencePromptsProps) {
  return (
    <Card className="glass-panel overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
            <Lightbulb className="w-4 h-4 text-primary" />
          </div>
          Intelligence Prompts
        </CardTitle>
        <CardDescription className="text-xs">
          Pattern insights to guide thinking, not activity
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-muted/30 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {prompts.map((prompt, idx) => {
              const config = typeConfig[prompt.type];
              const Icon = config.icon;
              
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-3 p-3 rounded-lg ${config.bgColor} border ${config.borderColor}`}
                >
                  <Icon className={`w-4 h-4 ${config.textColor} flex-shrink-0 mt-0.5`} />
                  <p className="text-sm text-foreground/90 leading-relaxed">{prompt.message}</p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
