import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, Loader2, BookOpen } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  userId: string;
}

interface LessonRow {
  id: string;
  title: string;
  module_id: string;
  module_title: string;
  completed: boolean;
  completed_at: string | null;
}

export default function ClientLearningProgress({ userId }: Props) {
  const [rows, setRows] = useState<LessonRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [contentRes, modulesRes, progressRes] = await Promise.all([
        supabase.from('heirway_learning_content').select('id, title, module_id, sort_order').eq('is_active', true),
        supabase.from('heirway_learning_modules').select('id, title').eq('is_active', true),
        supabase.from('heirway_learning_progress').select('lesson_id, module_id, completed, completed_at').eq('user_id', userId),
      ]);

      const moduleMap = new Map((modulesRes.data || []).map((m: any) => [m.id, m.title]));
      const progressMap = new Map(
        (progressRes.data || []).map((p: any) => [`${p.module_id}::${p.lesson_id}`, p])
      );

      const merged: LessonRow[] = (contentRes.data || [])
        .map((c: any) => {
          const key = `${c.module_id}::${c.id}`;
          const p = progressMap.get(key);
          return {
            id: c.id,
            title: c.title,
            module_id: c.module_id,
            module_title: moduleMap.get(c.module_id) || 'Module',
            completed: !!p?.completed,
            completed_at: p?.completed_at || null,
          };
        })
        .sort((a, b) => a.module_title.localeCompare(b.module_title) || a.title.localeCompare(b.title));

      setRows(merged);
      setLoading(false);
    })();
  }, [userId]);

  if (loading) {
    return <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  }

  if (rows.length === 0) {
    return <p className="text-xs text-muted-foreground">No learning content available yet.</p>;
  }

  const total = rows.length;
  const completed = rows.filter(r => r.completed).length;
  const pct = total > 0 ? (completed / total) * 100 : 0;

  // Group by module
  const byModule = rows.reduce<Record<string, LessonRow[]>>((acc, r) => {
    (acc[r.module_title] ||= []).push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">Overall Progress</span>
          <span className="font-semibold">{completed} / {total} lessons ({pct.toFixed(0)}%)</span>
        </div>
        <Progress value={pct} className="h-2" />
      </div>

      <div className="space-y-3">
        {Object.entries(byModule).map(([moduleTitle, lessons]) => {
          const modCompleted = lessons.filter(l => l.completed).length;
          return (
            <div key={moduleTitle} className="border border-border/50 rounded-lg p-3 bg-card/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                  <span className="text-sm font-semibold text-foreground">{moduleTitle}</span>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {modCompleted}/{lessons.length}
                </Badge>
              </div>
              <div className="space-y-1">
                {lessons.map(l => (
                  <div key={l.id} className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-muted/30">
                    <div className="flex items-center gap-2 min-w-0">
                      {l.completed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      )}
                      <span className={`truncate ${l.completed ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {l.title}
                      </span>
                    </div>
                    {l.completed && l.completed_at && (
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                        {format(new Date(l.completed_at), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
