import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { HeirwayLayout } from '@/components/heirway/HeirwayLayout';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useClientProfile } from '@/hooks/useClientProfile';
import { BookOpen, Lock, Video, ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2, Play, Download, Shield, ArrowRight } from 'lucide-react';
import EnforcedVideoPlayer from '@/components/heirway/learning/EnforcedVideoPlayer';
import { toast } from 'sonner';
import { useUpgradeRoute } from '@/hooks/useUpgradeRoute';

interface LearningModule {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string | null;
  difficulty: string;
  sort_order: number;
  allowed_plans: string[];
}

interface LearningLesson {
  id: string;
  module_ref_id: string;
  title: string;
  description: string;
  video_url: string | null;
  duration_minutes: number;
  sort_order: number;
  is_free: boolean;
  is_active: boolean;
  attachment_url: string | null;
  attachment_name: string | null;
  allowed_plans: string[];
}

export default function HeirwayLearning() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { tier, user, planName, loading: profileLoading, wealthBuilderTrustsComplete, wealthBuilderEducationActive } = useClientProfile();
  const goToUpgrade = useUpgradeRoute();
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [lessons, setLessons] = useState<LearningLesson[]>([]);
  const [progressData, setProgressData] = useState<any[]>([]);
  const [userId, setUserId] = useState('');

  const activeModuleId = searchParams.get('module');
  const activeLessonId = searchParams.get('lesson');

  // Map tier to the actual plan name for allowed_plans check
  const effectivePlan = planName || (tier === 'free' ? 'free' : tier === 'education' ? 'education' : 'free');

  useEffect(() => {
    if (profileLoading || !user) return;
    setUserId(user.id);
    loadData(user.id);
  }, [profileLoading, user]);

  const loadData = async (uid: string) => {
    const [modsRes, lessonsRes, progressRes] = await Promise.all([
      supabase.from('heirway_learning_modules' as any).select('*').eq('is_active', true).order('sort_order'),
      supabase.from('heirway_learning_content' as any).select('*').eq('is_active', true).order('sort_order'),
      supabase.from('heirway_learning_progress').select('*').eq('user_id', uid),
    ]);
    setModules((modsRes.data as any[]) || []);
    setLessons((lessonsRes.data as any[]) || []);
    setProgressData(progressRes.data || []);
  };

  const canAccessModule = (mod: LearningModule): boolean => {
    const plans = mod.allowed_plans;
    if (!plans || plans.length === 0) return true;
    return plans.includes(effectivePlan);
  };

  const canAccessLesson = (lesson: LearningLesson): boolean => {
    if (lesson.is_free) return true;
    const plans = lesson.allowed_plans;
    if (!plans || plans.length === 0) return true;
    return plans.includes(effectivePlan);
  };

  const isCompleted = (lessonId: string) =>
    progressData.some(p => p.lesson_id === lessonId && p.completed);

  const markComplete = async (lessonId: string) => {
    if (isCompleted(lessonId)) return;
    const existing = progressData.find(p => p.lesson_id === lessonId);
    if (existing) {
      await supabase.from('heirway_learning_progress')
        .update({ completed: true, completed_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      const lesson = lessons.find(l => l.id === lessonId);
      await supabase.from('heirway_learning_progress').insert({
        user_id: userId, module_id: lesson?.module_ref_id || '', lesson_id: lessonId,
        completed: true, completed_at: new Date().toISOString(),
      });
    }
    toast.success('Lesson completed!');
    loadData(userId);
  };

  const getModuleLessons = (moduleId: string) => lessons.filter(l => l.module_ref_id === moduleId);
  const getModuleProgress = (moduleId: string) => {
    const modLessons = getModuleLessons(moduleId);
    const completed = modLessons.filter(l => isCompleted(l.id)).length;
    return { completed, total: modLessons.length, percent: modLessons.length > 0 ? Math.round((completed / modLessons.length) * 100) : 0 };
  };

  // ─── Course Detail View ────────────────────────────────
  if (activeModuleId) {
    const mod = modules.find(m => m.id === activeModuleId);
    const modLessons = getModuleLessons(activeModuleId);
    const currentLesson = activeLessonId
      ? modLessons.find(l => l.id === activeLessonId)
      : modLessons[0];
    const currentIndex = currentLesson ? modLessons.indexOf(currentLesson) : 0;
    const progress = getModuleProgress(activeModuleId);

    // Check module-level access
    const moduleAccessible = mod ? canAccessModule(mod) : true;

    const goToLesson = (lesson: LearningLesson) => {
      if (!moduleAccessible || !canAccessLesson(lesson)) { toast.error('Upgrade your plan to access this content'); return; }
      setSearchParams({ module: activeModuleId, lesson: lesson.id });
    };

    const goPrev = () => {
      if (currentIndex > 0) goToLesson(modLessons[currentIndex - 1]);
    };
    const goNext = () => {
      if (currentIndex < modLessons.length - 1) goToLesson(modLessons[currentIndex + 1]);
    };

    const isDirectVideo = (url: string | null) => {
      if (!url) return false;
      // YouTube or Vimeo = not direct
      if (/youtube\.com|youtu\.be|vimeo\.com/i.test(url)) return false;
      return true; // storage URLs, direct file links
    };

    const getEmbedUrl = (url: string | null) => {
      if (!url) return null;
      const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?\s]+)/);
      if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
      const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
      if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
      return url;
    };

    return (
      <HeirwayLayout>
        <div className="min-h-screen gradient-bg">
          <div className="relative z-10 p-4 md:p-6">
            <button onClick={() => setSearchParams({})} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
              <ArrowLeft className="w-4 h-4" /> Back to Courses
            </button>

            {!moduleAccessible ? (
              <div className="text-center py-16">
                <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <h2 className="text-lg font-bold text-foreground mb-2">Module Locked</h2>
                <p className="text-sm text-muted-foreground mb-4">Upgrade your plan to access this course module.</p>
                <Button onClick={goToUpgrade}>View Plans</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                <div className="lg:col-span-2">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <h1 className="text-lg md:text-xl font-display font-bold text-foreground">
                      {currentLesson?.title || mod?.title}
                    </h1>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={goPrev} disabled={currentIndex === 0}>
                        <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                      </Button>
                      {currentLesson && isCompleted(currentLesson.id) && (
                        <Badge variant="default" className="gap-1 text-xs">
                          <CheckCircle2 className="w-3 h-3" /> Completed
                        </Badge>
                      )}
                      <Button variant="outline" size="sm" onClick={goNext} disabled={currentIndex >= modLessons.length - 1}>
                        Next <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>

                  {currentLesson && canAccessLesson(currentLesson) ? (
                    currentLesson.video_url && isDirectVideo(currentLesson.video_url) ? (
                      <EnforcedVideoPlayer
                        videoUrl={currentLesson.video_url}
                        title={currentLesson.title}
                        completed={isCompleted(currentLesson.id)}
                        onComplete={() => markComplete(currentLesson.id)}
                      />
                    ) : currentLesson.video_url ? (
                      <div className="aspect-video rounded-lg overflow-hidden bg-foreground/95 border border-border">
                        <iframe
                          src={getEmbedUrl(currentLesson.video_url) || ''}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title={currentLesson.title}
                        />
                      </div>
                    ) : (
                      <div className="aspect-video rounded-lg overflow-hidden bg-foreground/95 border border-border flex items-center justify-center">
                        <div className="text-center">
                          <Video className="w-12 h-12 text-muted mx-auto mb-2" />
                          <p className="text-muted text-sm">Video coming soon</p>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="aspect-video rounded-lg bg-muted/20 border border-border flex items-center justify-center">
                      <div className="text-center">
                        <Lock className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm font-medium text-muted-foreground">Upgrade to access this video</p>
                        <Button size="sm" className="mt-3" onClick={goToUpgrade}>View Plans</Button>
                      </div>
                    </div>
                  )}

                  {currentLesson && (
                    <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-border/40">
                      {currentLesson.description && (
                        <p className="text-sm text-muted-foreground">{currentLesson.description}</p>
                      )}
                      {currentLesson.attachment_url && currentLesson.attachment_name && (
                        <a href={currentLesson.attachment_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 mt-2 text-xs text-primary hover:underline font-medium">
                          <Download className="w-3.5 h-3.5" /> {currentLesson.attachment_name}
                        </a>
                      )}
                    </div>
                  )}
                </div>

                <div className="lg:col-span-1">
                  <div className="glass-panel p-4 sticky top-4">
                    <h3 className="text-sm font-bold text-foreground mb-1">Course Content</h3>
                    <p className="text-xs text-muted-foreground mb-3">{progress.completed} of {progress.total} completed</p>
                    <Progress value={progress.percent} className="h-1.5 mb-4" />

                    <div className="space-y-1">
                      {modLessons.map((lesson) => {
                        const completed = isCompleted(lesson.id);
                        const isCurrent = lesson.id === currentLesson?.id;
                        const locked = !canAccessLesson(lesson);
                        return (
                          <button
                            key={lesson.id}
                            onClick={() => goToLesson(lesson)}
                            disabled={locked}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                              isCurrent ? 'bg-primary/10 border border-primary/20' :
                              locked ? 'opacity-50 cursor-not-allowed' :
                              'hover:bg-muted/50'
                            }`}
                          >
                            {completed ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                            ) : locked ? (
                              <Lock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                            ) : (
                              <Play className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${completed ? 'text-muted-foreground' : 'text-foreground'} truncate`}>
                                {lesson.title}
                              </p>
                              {(lesson.duration_minutes || 0) > 0 && (
                                <p className="text-[10px] text-muted-foreground">{lesson.duration_minutes} min</p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </HeirwayLayout>
    );
  }

  // ─── Course Grid View ──────────────────────────────────
  const totalLessons = lessons.length;
  const totalCompleted = progressData.filter(p => p.completed).length;
  const overallPercent = totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0;

  const tierLabel = planName === 'wealth_builder'
    ? (wealthBuilderTrustsComplete ? 'Wealth Builder — Lifetime Access' : wealthBuilderEducationActive ? 'Wealth Builder — Education Access' : 'Free Access')
    : tier === 'trust' ? 'Full Access' : tier === 'education' ? 'Education Plan' : 'Free Access';

  // Show loading spinner while profile is still loading to prevent tier flash
  if (profileLoading) {
    return (
      <HeirwayLayout>
        <div className="min-h-screen gradient-bg flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </HeirwayLayout>
    );
  }

  return (
    <HeirwayLayout>
      <div className="min-h-screen gradient-bg">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 p-4 md:p-6">
          <div className="mb-4 md:mb-6 animate-fade-in">
            <h1 className="text-xl md:text-2xl font-display font-bold text-foreground">My Courses</h1>
            <p className="text-sm text-muted-foreground">Continue your learning journey · <span className="text-primary font-medium">{tierLabel}</span></p>
          </div>

          {tier === 'free' && (
            <div className="glass-panel p-6 mb-4 md:mb-6 animate-fade-in border-primary/40 bg-gradient-to-br from-primary/5 to-accent/5">
              <div className="flex flex-col md:flex-row md:items-center gap-5">
                <div className="flex-1">
                  <Badge className="bg-primary/10 text-primary border-primary/20 mb-2 text-xs">Most Popular</Badge>
                  <h3 className="font-display font-bold text-foreground text-lg mb-1">Heirway Education</h3>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-3xl font-display font-bold text-foreground">$19.99</span>
                    <span className="text-sm text-muted-foreground">/ month</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                    Access monthly private trust education trainings and build your knowledge before committing to a full plan.
                  </p>
                  <div className="space-y-1.5">
                    {['Everything in Free', 'Monthly live & recorded private trust trainings', 'Progress tracking & completion badges'].map((feat, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        <span className="text-xs text-muted-foreground">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2 md:min-w-[180px]">
                  <Button
                    onClick={() => {
                      sessionStorage.setItem('heirway_selected_plan', 'education');
                      navigate('/heirway/checkout');
                    }}
                    className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground"
                  >
                    Get Started
                  </Button>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => navigate('/heirway/trust-questionnaire')}>
                    View Trust Plans
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Set Up a Private Trust CTA - only for free tier */}
          {tier === 'free' && (
            <div className="glass-panel p-5 mb-4 md:mb-6 animate-fade-in border-accent/30 bg-gradient-to-r from-primary/5 to-accent/5">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Ready to protect your assets?</h3>
                    <p className="text-xs text-muted-foreground">Get started with a personalized private trust plan recommendation.</p>
                  </div>
                </div>
                <Button onClick={() => navigate('/heirway/trust-questionnaire')} className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
                  Set Up a Private Trust <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {modules.length === 0 ? (
            <div className="text-center py-16 animate-fade-in">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No courses available yet. Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {modules.map((mod, i) => {
                const modLessons = getModuleLessons(mod.id);
                const progress = getModuleProgress(mod.id);
                const isLocked = !canAccessModule(mod);
                return (
                  <div
                    key={mod.id}
                    className={`glass-panel overflow-hidden cursor-pointer group transition-all animate-fade-in ${
                      isLocked ? 'opacity-75 hover:border-muted-foreground/30' : 'hover:border-primary/30'
                    }`}
                    style={{ animationDelay: `${i * 60}ms` }}
                    onClick={() => {
                      if (isLocked) {
                        toast.error('Upgrade your plan to access this module');
                        return;
                      }
                      setSearchParams({ module: mod.id });
                    }}
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video bg-muted/30 overflow-hidden">
                      {mod.thumbnail_url ? (
                        <img src={mod.thumbnail_url} alt={mod.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-foreground/90 to-foreground/70">
                          <div className="text-center">
                            <BookOpen className="w-10 h-10 text-muted mx-auto mb-1" />
                            <p className="text-muted text-xs">{mod.title}</p>
                          </div>
                        </div>
                      )}
                      {/* Locked overlay */}
                      {isLocked && (
                        <div className="absolute inset-0 bg-background/60 flex items-center justify-center backdrop-blur-sm">
                          <div className="text-center">
                            <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-1" />
                            <p className="text-xs font-medium text-muted-foreground">Upgrade to Unlock</p>
                          </div>
                        </div>
                      )}
                      {/* Progress badge overlay */}
                      {!isLocked && progress.total > 0 && (
                        <div className="absolute top-3 right-3">
                          <Badge className={`text-xs font-bold shadow-lg ${
                            progress.percent === 100
                              ? 'bg-green-500 hover:bg-green-600 text-white border-0'
                              : progress.percent > 0
                              ? 'bg-green-500 hover:bg-green-600 text-white border-0'
                              : 'bg-muted text-muted-foreground border-0'
                          }`}>
                            {progress.percent}% Complete
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Card content */}
                    <div className="p-4">
                      <h3 className="text-base font-bold text-foreground mb-1">{mod.title}</h3>
                      {mod.description && (
                        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{mod.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Play className="w-3.5 h-3.5" />
                          <span>{modLessons.length} video{modLessons.length !== 1 ? 's' : ''}</span>
                        </div>
                        {isLocked ? (
                          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Locked
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-primary group-hover:underline">
                            {progress.completed > 0 ? 'Continue Learning →' : 'Start Learning →'}
                          </span>
                        )}
                      </div>
                      {!isLocked && <Progress value={progress.percent} className="h-1.5 mt-3" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </HeirwayLayout>
  );
}
