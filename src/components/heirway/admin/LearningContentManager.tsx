import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GoldHeaderCard } from '@/components/ui/gold-header-card';
import { toast } from 'sonner';
import {
  Plus, Pencil, Trash2, Video, BookOpen, Send, Eye, EyeOff, ChevronDown, ChevronUp, Loader2, Upload,
} from 'lucide-react';

interface LearningModule {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string | null;
  difficulty: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  allowed_plans: string[];
}

interface LearningLesson {
  id: string;
  module_ref_id: string | null;
  title: string;
  description: string;
  difficulty: string;
  video_url: string | null;
  thumbnail_url: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  duration_minutes: number;
  sort_order: number;
  is_free: boolean;
  is_active: boolean;
  allowed_plans: string[];
}

const DIFFICULTY_OPTIONS = ['beginner', 'intermediate', 'advanced'];

const PLAN_OPTIONS = [
  { value: 'free', label: 'Free' },
  { value: 'education', label: 'Education' },
  { value: 'foundation', label: 'Foundation' },
  { value: 'business', label: 'Business' },
  { value: 'wealth_builder', label: 'Wealth Builder' },
];

const ALL_PLANS = PLAN_OPTIONS.map(p => p.value);

const emptyModuleForm = { title: '', description: '', thumbnail_url: '', sort_order: 0, is_active: true, allowed_plans: [...ALL_PLANS] };

const emptyLessonForm = {
  title: '', description: '', difficulty: 'beginner', video_url: '', thumbnail_url: '',
  attachment_url: '', attachment_name: '', duration_minutes: 0, sort_order: 0, is_free: false, is_active: true, allowed_plans: [...ALL_PLANS],
};

interface Props {
  clients: { id: string; user_id: string; full_name: string | null }[];
}

export default function LearningContentManager({ clients }: Props) {
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [lessons, setLessons] = useState<LearningLesson[]>([]);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<LearningModule | null>(null);
  const [moduleForm, setModuleForm] = useState(emptyModuleForm);
  const [thumbnailInputMode, setThumbnailInputMode] = useState<'url' | 'upload'>('upload');
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<LearningLesson | null>(null);
  const [lessonForm, setLessonForm] = useState(emptyLessonForm);
  const [lessonModuleId, setLessonModuleId] = useState<string>('');
  const [sendNotification, setSendNotification] = useState(false);
  const [addToKnowledgebase, setAddToKnowledgebase] = useState(false);
  const [detectingDuration, setDetectingDuration] = useState(false);
  const [videoInputMode, setVideoInputMode] = useState<'url' | 'upload'>('url');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const [modsRes, lessonsRes] = await Promise.all([
      supabase.from('heirway_learning_modules' as any).select('*').order('sort_order'),
      supabase.from('heirway_learning_content' as any).select('*').order('sort_order'),
    ]);
    setModules((modsRes.data as any[]) || []);
    setLessons((lessonsRes.data as any[]) || []);
    setLoading(false);
  };

  // ─── Plan checkbox helper ────────────────────────────────
  const PlanCheckboxes = ({ plans, onChange }: { plans: string[]; onChange: (plans: string[]) => void }) => (
    <div>
      <Label className="text-xs mb-1.5 block">Accessible Plans</Label>
      <div className="flex flex-wrap gap-3">
        {PLAN_OPTIONS.map(p => (
          <label key={p.value} className="flex items-center gap-1.5 text-xs cursor-pointer">
            <Checkbox
              checked={plans.includes(p.value)}
              onCheckedChange={(checked) => {
                if (checked) onChange([...plans, p.value]);
                else onChange(plans.filter(v => v !== p.value));
              }}
            />
            {p.label}
          </label>
        ))}
      </div>
    </div>
  );

  // ─── Module CRUD ─────────────────────────────────────────
  const openAddModule = () => {
    setEditingModule(null);
    setModuleForm({ ...emptyModuleForm, sort_order: modules.length });
    setThumbnailInputMode('upload');
    setModuleDialogOpen(true);
  };

  const openEditModule = (mod: LearningModule) => {
    setEditingModule(mod);
    setModuleForm({
      title: mod.title, description: mod.description, thumbnail_url: mod.thumbnail_url || '',
      sort_order: mod.sort_order, is_active: mod.is_active, allowed_plans: mod.allowed_plans || [...ALL_PLANS],
    });
    setThumbnailInputMode(mod.thumbnail_url?.includes('learning-videos') ? 'upload' : 'url');
    setModuleDialogOpen(true);
  };

  const handleThumbnailUpload = async (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) { toast.error('Supported formats: JPG, PNG, WebP, GIF'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10MB'); return; }

    setUploadingThumbnail(true);
    const ext = file.name.split('.').pop() || 'jpg';
    const filePath = `module-covers/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from('learning-videos').upload(filePath, file, { cacheControl: '3600', upsert: false });
    if (error) { toast.error('Upload failed: ' + error.message); setUploadingThumbnail(false); return; }

    const { data: urlData } = supabase.storage.from('learning-videos').getPublicUrl(filePath);
    setModuleForm(p => ({ ...p, thumbnail_url: urlData.publicUrl }));
    setUploadingThumbnail(false);
    toast.success('Cover image uploaded');
  };

  const handleSaveModule = async () => {
    if (!moduleForm.title.trim()) { toast.error('Title is required'); return; }
    if (moduleForm.allowed_plans.length === 0) { toast.error('Select at least one plan'); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const payload: any = {
      title: moduleForm.title.trim(), description: moduleForm.description.trim(),
      thumbnail_url: moduleForm.thumbnail_url.trim() || null,
      sort_order: moduleForm.sort_order, is_active: moduleForm.is_active, created_by: user?.id,
      allowed_plans: moduleForm.allowed_plans,
    };
    if (editingModule) {
      const { error } = await supabase.from('heirway_learning_modules' as any).update(payload).eq('id', editingModule.id);
      if (error) { toast.error('Failed to update'); return; }
      toast.success('Module updated');
    } else {
      const { error } = await supabase.from('heirway_learning_modules' as any).insert(payload);
      if (error) { toast.error('Failed to create module'); return; }
      toast.success('Module created');
    }
    setModuleDialogOpen(false);
    loadAll();
  };

  const handleDeleteModule = async (id: string) => {
    await supabase.from('heirway_learning_modules' as any).delete().eq('id', id);
    toast.success('Module deleted');
    loadAll();
  };

  // ─── Lesson CRUD ─────────────────────────────────────────
  const openAddLesson = (moduleId: string) => {
    setEditingLesson(null);
    setLessonModuleId(moduleId);
    const modLessons = lessons.filter(l => l.module_ref_id === moduleId);
    setLessonForm({ ...emptyLessonForm, sort_order: modLessons.length });
    setSendNotification(false);
    setAddToKnowledgebase(false);
    setVideoInputMode('url');
    setUploadProgress('');
    setLessonDialogOpen(true);
  };

  const openEditLesson = (lesson: LearningLesson) => {
    setEditingLesson(lesson);
    setLessonModuleId(lesson.module_ref_id || '');
    setLessonForm({
      title: lesson.title, description: lesson.description, difficulty: lesson.difficulty,
      video_url: lesson.video_url || '', thumbnail_url: lesson.thumbnail_url || '',
      attachment_url: lesson.attachment_url || '', attachment_name: lesson.attachment_name || '',
      duration_minutes: lesson.duration_minutes || 0, sort_order: lesson.sort_order,
      is_free: lesson.is_free, is_active: lesson.is_active, allowed_plans: lesson.allowed_plans || [...ALL_PLANS],
    });
    setSendNotification(false);
    setAddToKnowledgebase(false);
    setVideoInputMode(lesson.video_url?.includes('learning-videos') ? 'upload' : 'url');
    setUploadProgress('');
    setLessonDialogOpen(true);
  };

  const handleSaveLesson = async () => {
    if (!lessonForm.title.trim()) { toast.error('Title is required'); return; }
    if (lessonForm.allowed_plans.length === 0) { toast.error('Select at least one plan'); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const payload: any = {
      module_ref_id: lessonModuleId, module_id: lessonModuleId,
      title: lessonForm.title.trim(), description: lessonForm.description.trim(),
      difficulty: lessonForm.difficulty, video_url: lessonForm.video_url.trim() || null,
      thumbnail_url: lessonForm.thumbnail_url.trim() || null,
      attachment_url: lessonForm.attachment_url.trim() || null,
      attachment_name: lessonForm.attachment_name.trim() || null,
      duration_minutes: lessonForm.duration_minutes, sort_order: lessonForm.sort_order,
      is_free: lessonForm.is_free, is_active: lessonForm.is_active, created_by: user?.id,
      allowed_plans: lessonForm.allowed_plans,
    };
    if (editingLesson) {
      const { error } = await supabase.from('heirway_learning_content' as any).update(payload).eq('id', editingLesson.id);
      if (error) { toast.error('Failed to update'); return; }
      toast.success('Lesson updated');
    } else {
      const { error } = await supabase.from('heirway_learning_content' as any).insert(payload);
      if (error) { toast.error('Failed to add lesson'); return; }
      toast.success('Lesson added');
      if (sendNotification && user) {
        const mod = modules.find(m => m.id === lessonModuleId);
        await supabase.from('heirway_admin_notifications').insert({
          title: `New Video: ${lessonForm.title.trim()}`,
          message: `A new lesson "${lessonForm.title.trim()}" has been added to ${mod?.title || 'Learning Portal'}. Check it out!`,
          notification_type: 'learning_module', created_by: user.id, is_active: true, target_client_id: null,
        });
        toast.success('Push notification sent to all clients');
      }
      // Add to Knowledge Base if checked
      if (addToKnowledgebase && user) {
        const mod = modules.find(m => m.id === lessonModuleId);
        const slug = lessonForm.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        await supabase.from('heirway_knowledgebase' as any).insert({
          title: lessonForm.title.trim(),
          slug,
          summary: lessonForm.description.trim(),
          content: '',
          content_type: 'video',
          category: 'education',
          tags: [mod?.title || 'learning course'].filter(Boolean),
          video_url: lessonForm.video_url.trim() || null,
          thumbnail_url: lessonForm.thumbnail_url.trim() || null,
          allowed_plans: lessonForm.allowed_plans,
          is_published: true,
          is_featured: false,
          created_by: user.id,
        });
        toast.success('Also added to Knowledge Base');
      }
    }
    setLessonDialogOpen(false);
    loadAll();
  };

  const handleDeleteLesson = async (id: string) => {
    await supabase.from('heirway_learning_content' as any).delete().eq('id', id);
    toast.success('Lesson deleted');
    loadAll();
  };

  const handleVideoUpload = async (file: File) => {
    if (!file) return;
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) { toast.error('Video file must be under 500MB'); return; }
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'];
    if (!allowedTypes.includes(file.type)) { toast.error('Supported formats: MP4, WebM, MOV, M4V'); return; }

    setUploadingVideo(true);
    setUploadProgress('Uploading...');
    const ext = file.name.split('.').pop() || 'mp4';
    const filePath = `${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from('learning-videos').upload(filePath, file, {
      cacheControl: '3600', upsert: false,
    });

    if (error) {
      toast.error('Upload failed: ' + error.message);
      setUploadingVideo(false);
      setUploadProgress('');
      return;
    }

    const { data: urlData } = supabase.storage.from('learning-videos').getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;

    setLessonForm(p => ({ ...p, video_url: publicUrl }));
    setUploadProgress('Uploaded ✓');
    setUploadingVideo(false);
    toast.success('Video uploaded');
    detectVideoDuration(publicUrl);
  };

  const detectVideoDuration = (url: string) => {
    if (!url.trim()) return;
    const videoExtensions = /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i;
    if (!videoExtensions.test(url)) return;

    setDetectingDuration(true);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = url.trim();
    video.onloadedmetadata = () => {
      const minutes = Math.round(video.duration / 60);
      setLessonForm(p => ({ ...p, duration_minutes: minutes > 0 ? minutes : 1 }));
      setDetectingDuration(false);
      video.remove();
    };
    video.onerror = () => {
      setDetectingDuration(false);
      video.remove();
    };
    setTimeout(() => { setDetectingDuration(false); video.remove(); }, 10000);
  };

  const difficultyColor = (d: string) => {
    if (d === 'beginner') return 'bg-green-500/10 text-green-600 border-green-500/20';
    if (d === 'intermediate') return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    return 'bg-red-500/10 text-red-600 border-red-500/20';
  };

  const planBadgeLabel = (plans: string[]) => {
    if (!plans || plans.length === ALL_PLANS.length) return 'All Plans';
    return plans.map(p => PLAN_OPTIONS.find(o => o.value === p)?.label || p).join(', ');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Create course modules and add video lessons inside each.</p>
        <Button size="sm" onClick={openAddModule}>
          <Plus className="w-4 h-4 mr-1" /> New Module
        </Button>
      </div>

      {modules.length === 0 && !loading && (
        <div className="text-center py-12">
          <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No modules created yet. Create your first course module to get started.</p>
        </div>
      )}

      {modules.map(mod => {
        const modLessons = lessons.filter(l => l.module_ref_id === mod.id);
        const isExpanded = expandedModule === mod.id;
        return (
          <div key={mod.id} className={`glass-panel overflow-hidden ${!mod.is_active ? 'opacity-60' : ''}`}>
            <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
            <div className="p-4">
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => setExpandedModule(isExpanded ? null : mod.id)}>
                {mod.thumbnail_url ? (
                  <img src={mod.thumbnail_url} alt="" className="w-20 h-14 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-20 h-14 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-foreground">{mod.title}</h3>
                    {!mod.is_active && <Badge variant="outline" className="text-[9px] bg-destructive/10 text-destructive border-destructive/20">Hidden</Badge>}
                    <Badge variant="outline" className="text-[9px]">{modLessons.length} video{modLessons.length !== 1 ? 's' : ''}</Badge>
                    <Badge variant="outline" className="text-[9px]">{planBadgeLabel(mod.allowed_plans)}</Badge>
                  </div>
                  {mod.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{mod.description}</p>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={e => { e.stopPropagation(); openEditModule(mod); }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive/60 hover:text-destructive" onClick={e => { e.stopPropagation(); handleDeleteModule(mod.id); }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </div>

              {isExpanded && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lessons</p>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openAddLesson(mod.id)}>
                      <Plus className="w-3 h-3 mr-1" /> Add Video
                    </Button>
                  </div>
                  {modLessons.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-3 text-center">No lessons yet. Add your first video.</p>
                  ) : (
                    modLessons.map((lesson, i) => (
                      <div key={lesson.id} className={`flex items-center gap-3 p-3 rounded-lg border border-border/40 ${lesson.is_active ? 'bg-muted/30' : 'bg-muted/10 opacity-60'}`}>
                        <span className="text-xs font-bold text-muted-foreground w-5 text-center">{i + 1}</span>
                        <Video className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-foreground truncate">{lesson.title}</p>
                            <Badge variant="outline" className={`text-[9px] capitalize ${difficultyColor(lesson.difficulty)}`}>{lesson.difficulty}</Badge>
                            {lesson.is_free && <Badge variant="outline" className="text-[9px]">Free</Badge>}
                            {(lesson.duration_minutes || 0) > 0 && <span className="text-[10px] text-muted-foreground">{lesson.duration_minutes} min</span>}
                            {lesson.attachment_name && <Badge variant="outline" className="text-[9px]">📎 {lesson.attachment_name}</Badge>}
                            <Badge variant="outline" className="text-[9px]">{planBadgeLabel(lesson.allowed_plans)}</Badge>
                          </div>
                          {lesson.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{lesson.description}</p>}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditLesson(lesson)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive/60 hover:text-destructive" onClick={() => handleDeleteLesson(lesson.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Module Dialog */}
      <Dialog open={moduleDialogOpen} onOpenChange={setModuleDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingModule ? 'Edit Module' : 'Create Module'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Module Title *</Label>
              <Input className="glass-input mt-1 h-8 text-xs" value={moduleForm.title} onChange={e => setModuleForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Welcome to Heirway" />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea className="glass-input mt-1 text-xs min-h-[60px]" value={moduleForm.description} onChange={e => setModuleForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief module description..." />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Cover Image</Label>
              <div className="flex gap-1 mb-2">
                <Button type="button" size="sm" variant={thumbnailInputMode === 'upload' ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => setThumbnailInputMode('upload')}>
                  <Upload className="w-3 h-3 mr-1" /> Upload Image
                </Button>
                <Button type="button" size="sm" variant={thumbnailInputMode === 'url' ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => setThumbnailInputMode('url')}>
                  Paste URL
                </Button>
              </div>
              {thumbnailInputMode === 'url' ? (
                <Input className="glass-input h-8 text-xs" value={moduleForm.thumbnail_url} onChange={e => setModuleForm(p => ({ ...p, thumbnail_url: e.target.value }))} placeholder="https://..." />
              ) : (
                <div className="space-y-2">
                  <label className="flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-border hover:border-primary/40 cursor-pointer transition-colors bg-muted/20">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={e => { const file = e.target.files?.[0]; if (file) handleThumbnailUpload(file); e.target.value = ''; }}
                      disabled={uploadingThumbnail}
                    />
                    {uploadingThumbnail ? (
                      <span className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</span>
                    ) : (
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Upload className="w-4 h-4" /> Click to select image (JPG, PNG, WebP — max 10MB)
                      </span>
                    )}
                  </label>
                </div>
              )}
              {moduleForm.thumbnail_url && (
                <div className="mt-2">
                  <img src={moduleForm.thumbnail_url} alt="Preview" className="w-full h-24 object-cover rounded-lg border border-border" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs">Sort Order</Label>
              <Input type="number" className="glass-input mt-1 h-8 text-xs" value={moduleForm.sort_order} onChange={e => setModuleForm(p => ({ ...p, sort_order: Number(e.target.value) }))} />
            </div>
            <PlanCheckboxes plans={moduleForm.allowed_plans} onChange={plans => setModuleForm(p => ({ ...p, allowed_plans: plans }))} />
            <div className="flex items-center gap-2">
              <Switch checked={moduleForm.is_active} onCheckedChange={v => setModuleForm(p => ({ ...p, is_active: v }))} />
              <Label className="text-xs">Active (visible to clients)</Label>
            </div>
            <Button className="w-full" onClick={handleSaveModule}>
              {editingModule ? <><Pencil className="w-4 h-4 mr-1" /> Update Module</> : <><Plus className="w-4 h-4 mr-1" /> Create Module</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lesson Dialog */}
      <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLesson ? 'Edit Video Lesson' : 'Add Video Lesson'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Lesson Title *</Label>
              <Input className="glass-input mt-1 h-8 text-xs" value={lessonForm.title} onChange={e => setLessonForm(p => ({ ...p, title: e.target.value }))} placeholder="Lesson title" />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea className="glass-input mt-1 text-xs min-h-[60px]" value={lessonForm.description} onChange={e => setLessonForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description..." />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Video Source</Label>
              <div className="flex gap-1 mb-2">
                <Button type="button" size="sm" variant={videoInputMode === 'url' ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => setVideoInputMode('url')}>
                  Paste URL
                </Button>
                <Button type="button" size="sm" variant={videoInputMode === 'upload' ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => setVideoInputMode('upload')}>
                  <Upload className="w-3 h-3 mr-1" /> Upload File
                </Button>
              </div>
              {videoInputMode === 'url' ? (
                <>
                  <Input className="glass-input h-8 text-xs" value={lessonForm.video_url} onChange={e => {
                    setLessonForm(p => ({ ...p, video_url: e.target.value }));
                  }} onBlur={e => detectVideoDuration(e.target.value)} placeholder="https://youtube.com/embed/... or direct .mp4 link" />
                  {detectingDuration && (
                    <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Detecting duration…</p>
                  )}
                </>
              ) : (
                <div className="space-y-2">
                  <label className="flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-border hover:border-primary/40 cursor-pointer transition-colors bg-muted/20">
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime,video/x-m4v"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleVideoUpload(file);
                        e.target.value = '';
                      }}
                      disabled={uploadingVideo}
                    />
                    {uploadingVideo ? (
                      <span className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</span>
                    ) : (
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Upload className="w-4 h-4" /> Click to select video (MP4, WebM, MOV — max 500MB)
                      </span>
                    )}
                  </label>
                  {uploadProgress && <p className="text-[10px] text-green-600 font-medium">{uploadProgress}</p>}
                  {lessonForm.video_url && videoInputMode === 'upload' && (
                    <p className="text-[10px] text-muted-foreground truncate">File: {lessonForm.video_url.split('/').pop()}</p>
                  )}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Duration (min) {detectingDuration ? '' : '· auto-detected for .mp4'}</Label>
                <Input type="number" className="glass-input mt-1 h-8 text-xs" value={lessonForm.duration_minutes} onChange={e => setLessonForm(p => ({ ...p, duration_minutes: Number(e.target.value) }))} />
              </div>
              <div>
                <Label className="text-xs">Sort Order</Label>
                <Input type="number" className="glass-input mt-1 h-8 text-xs" value={lessonForm.sort_order} onChange={e => setLessonForm(p => ({ ...p, sort_order: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Attachment URL</Label>
                <Input className="glass-input mt-1 h-8 text-xs" value={lessonForm.attachment_url} onChange={e => setLessonForm(p => ({ ...p, attachment_url: e.target.value }))} placeholder="https://..." />
              </div>
              <div>
                <Label className="text-xs">Attachment Name</Label>
                <Input className="glass-input mt-1 h-8 text-xs" value={lessonForm.attachment_name} onChange={e => setLessonForm(p => ({ ...p, attachment_name: e.target.value }))} placeholder="e.g. Worksheet.pdf" />
              </div>
            </div>
            <PlanCheckboxes plans={lessonForm.allowed_plans} onChange={plans => setLessonForm(p => ({ ...p, allowed_plans: plans }))} />
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={lessonForm.is_free} onCheckedChange={v => setLessonForm(p => ({ ...p, is_free: v }))} />
                <Label className="text-xs">Free</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={lessonForm.is_active} onCheckedChange={v => setLessonForm(p => ({ ...p, is_active: v }))} />
                <Label className="text-xs">Active</Label>
              </div>
            </div>
            {!editingLesson && (
              <div className="space-y-2">
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <div className="flex items-center gap-3">
                    <Switch checked={sendNotification} onCheckedChange={setSendNotification} />
                    <div>
                      <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                        <Send className="w-3.5 h-3.5 text-primary" /> Send push notification
                      </p>
                      <p className="text-xs text-muted-foreground">Notify all clients about this new video</p>
                    </div>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-accent/5 border border-accent/10">
                  <div className="flex items-center gap-3">
                    <Switch checked={addToKnowledgebase} onCheckedChange={setAddToKnowledgebase} />
                    <div>
                      <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-accent" /> Add to Knowledge Base
                      </p>
                      <p className="text-xs text-muted-foreground">Also publish this video as a Knowledge Base article</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <Button className="w-full" onClick={handleSaveLesson}>
              {editingLesson ? <><Pencil className="w-4 h-4 mr-1" /> Update Lesson</> : <><Plus className="w-4 h-4 mr-1" /> Add Lesson</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
