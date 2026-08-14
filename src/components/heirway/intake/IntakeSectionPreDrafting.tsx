import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, Send, MessageCircleQuestion, Loader2, CheckCircle2 } from 'lucide-react';
import { useIntakeVideo } from '@/hooks/useIntakeVideos';
import EnforcedVideoPlayer from '@/components/heirway/learning/EnforcedVideoPlayer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  clientId: string | null;
}

export default function IntakeSectionPreDrafting({ clientId }: Props) {
  const { videoUrl } = useIntakeVideo('pre_drafting');
  const [question, setQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string[]>([]);

  const handleSubmitQuestion = async () => {
    if (!question.trim()) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('heirway_intake_questions' as any).insert({
        user_id: user.id,
        client_id: clientId,
        question: question.trim(),
      } as any);

      if (error) throw error;
      setSubmitted(prev => [...prev, question.trim()]);
      setQuestion('');
      toast.success('Question submitted! Our team will follow up with you.');
    } catch (err: any) {
      toast.error('Failed to submit question');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel p-4 rounded-lg border-primary/20 bg-primary/5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <PlayCircle className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Trust Template Information</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Please watch this important video before completing the next sections. The information covered here is critical to accurately preparing your trust template.
            </p>
          </div>
        </div>
      </div>

      {/* Video */}
      {videoUrl ? (
        <EnforcedVideoPlayer
          videoUrl={videoUrl}
          title="Trust Template Information"
          completed={false}
          onComplete={() => {}}
        />
      ) : (
        <div className="glass-panel rounded-lg border border-primary/20 overflow-hidden">
          <div className="bg-muted/50 aspect-video flex flex-col items-center justify-center gap-3">
            <PlayCircle className="w-16 h-16 text-primary/40" />
            <p className="text-sm text-muted-foreground font-medium">Trust Template Training Video</p>
            <p className="text-xs text-muted-foreground">Video will be available soon</p>
          </div>
        </div>
      )}

      {/* Questions Section */}
      <div className="glass-panel p-5 rounded-lg border border-border space-y-4">
        <div className="flex items-center gap-2">
          <MessageCircleQuestion className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Have Questions?</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          If you have any questions about the information covered in the video or about the upcoming sections, submit them here and our team will follow up with you.
        </p>

        <div className="space-y-2">
          <Label htmlFor="intake-question">Your Question</Label>
          <Textarea
            id="intake-question"
            placeholder="Type your question here..."
            value={question}
            onChange={e => setQuestion(e.target.value)}
            className="glass-input min-h-[100px]"
            maxLength={1000}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{question.length}/1000</span>
            <Button
              size="sm"
              disabled={!question.trim() || submitting}
              onClick={handleSubmitQuestion}
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
              Submit Question
            </Button>
          </div>
        </div>

        {submitted.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border">
            <span className="text-xs font-medium text-muted-foreground">Submitted Questions</span>
            {submitted.map((q, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded bg-primary/5 text-sm">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-foreground">{q}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
