import { useState, useEffect } from 'react';
import { GoldHeaderCard } from '@/components/ui/gold-header-card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Shield, CheckCircle, Clock, FileText, Printer } from 'lucide-react';

const STAGES = [
  { key: 'assigning_creator', label: 'Assigning Creator', percent: 25 },
  { key: 'processing_documents', label: 'Processing Documents', percent: 50 },
  { key: 'ready_to_sign', label: 'Ready to Print & Sign', percent: 75 },
  { key: 'trusts_complete', label: 'Trusts Complete', percent: 100 },
];

interface TrustProgressProps {
  userId: string;
  clientId: string;
}

export default function TrustProgress({ userId, clientId }: TrustProgressProps) {
  const [trusts, setTrusts] = useState<any[]>([]);

  useEffect(() => {
    loadTrusts();
  }, [userId]);

  const loadTrusts = async () => {
    const { data } = await supabase
      .from('heirway_trust_progress' as any)
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true });
    setTrusts((data as any[]) || []);
  };

  const getStageInfo = (stage: string) => STAGES.find(s => s.key === stage) || STAGES[0];

  // Filter out completed trusts - they shouldn't show on the client dashboard
  const activeTrusts = trusts.filter(t => t.stage !== 'trusts_complete');

  if (activeTrusts.length === 0) {
    return null; // Don't render if no active (in-progress) trusts
  }

  return (
    <GoldHeaderCard
      title="Trust Development"
      icon={<Shield className="w-4 h-4 text-primary" />}
      description="Track the progress of your trust templates"
    >
      <div className="space-y-4">
        {activeTrusts.map((trust: any) => {
          const stageInfo = getStageInfo(trust.stage);

          return (
            <div key={trust.id} className="p-4 rounded-lg bg-muted/30 border border-border/40">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <h4 className="text-sm font-semibold text-foreground">{trust.trust_name}</h4>
                </div>
                <Badge
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary/20"
                >
                  <Clock className="w-3 h-3 mr-1" /> In Progress
                </Badge>
              </div>

              <div className="mb-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{stageInfo.label}</span>
                  <span className="text-xs font-medium text-primary">{stageInfo.percent}%</span>
                </div>
                <Progress value={stageInfo.percent} className="h-2" />
              </div>

              {/* Stage dots */}
              <div className="flex items-center gap-1 mt-3">
                {STAGES.map((s, i) => {
                  const currentIdx = STAGES.findIndex(st => st.key === trust.stage);
                  const isPast = i <= currentIdx;
                  return (
                    <div key={s.key} className="flex items-center flex-1">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        isPast ? 'bg-primary' : 'bg-muted-foreground/20'
                      }`} />
                      {i < STAGES.length - 1 && (
                        <div className={`h-0.5 flex-1 ${
                          i < currentIdx ? 'bg-primary' : 'bg-muted-foreground/20'
                        }`} />
                      )}
                    </div>
                  );
                })}
              </div>

              {trust.stage_notes && (
                <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
                  <FileText className="w-3 h-3" /> {trust.stage_notes}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </GoldHeaderCard>
  );
}
