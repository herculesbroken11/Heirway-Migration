import { useState, useEffect, useRef } from 'react';
import { GoldHeaderCard } from '@/components/ui/gold-header-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BookOpen, Plus, Search, Edit, Trash2, Eye, EyeOff, Star, Upload, Loader2, FileText, Video, ExternalLink, File, MessageSquare, CheckCircle, Clock } from 'lucide-react';
import { useContentPlanOptions } from '@/hooks/useContentPlanOptions';

const CONTENT_TYPES = [
  { value: 'article', label: 'Article', icon: FileText },
  { value: 'video', label: 'Video', icon: Video },
  { value: 'document', label: 'Document', icon: File },
  { value: 'external_link', label: 'External Link', icon: ExternalLink },
];

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'trusts', label: 'Trusts' },
  { value: 'tax', label: 'Tax' },
  { value: 'estate_planning', label: 'Estate Planning' },
  { value: 'asset_protection', label: 'Asset Protection' },
  { value: 'education', label: 'Education' },
  { value: 'compliance', label: 'Compliance' },
];

const emptyFormBase = {
  title: '',
  slug: '',
  summary: '',
  content: '',
  content_type: 'article',
  category: 'general',
  tags: '',
  thumbnail_url: '',
  video_url: '',
  document_url: '',
  document_name: '',
  external_url: '',
  is_published: false,
  is_featured: false,
};

interface KBArticle {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  content_type: string;
  category: string;
  tags: string[];
  thumbnail_url: string | null;
  video_url: string | null;
  document_url: string | null;
  document_name: string | null;
  external_url: string | null;
  allowed_plans: string[];
  is_published: boolean;
  is_featured: boolean;
  views_count: number;
  created_at: string;
}

export default function KnowledgebaseManager() {
  const { options: contentPlanOptions } = useContentPlanOptions();
  const defaultAllowedPlans = () => contentPlanOptions.map((o) => o.key);

  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    ...emptyFormBase,
    allowed_plans: [] as string[],
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [learningLessons, setLearningLessons] = useState<any[]>([]);
  const [learningModules, setLearningModules] = useState<any[]>([]);
  const [selectedLessons, setSelectedLessons] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [kbRequests, setKbRequests] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const thumbRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadArticles(); loadKbRequests(); }, []);

  const loadArticles = async () => {
    const { data } = await supabase
      .from('heirway_knowledgebase' as any)
      .select('*')
      .order('created_at', { ascending: false });
    setArticles((data as any as KBArticle[]) || []);
  };

  const loadKbRequests = async () => {
    const { data } = await supabase
      .from('heirway_kb_requests' as any)
      .select('*')
      .order('created_at', { ascending: false });
    setKbRequests((data as any[]) || []);
  };

  const updateRequestStatus = async (id: string, status: string, adminNotes?: string) => {
    const payload: any = { status, updated_at: new Date().toISOString() };
    if (adminNotes !== undefined) payload.admin_notes = adminNotes;
    await supabase.from('heirway_kb_requests' as any).update(payload).eq('id', id);
    toast.success(`Request marked as ${status}`);
    loadKbRequests();
  };

  const openImportDialog = async () => {
    setSelectedLessons(new Set());
    setImportDialogOpen(true);
    const [modsRes, lessonsRes] = await Promise.all([
      supabase.from('heirway_learning_modules' as any).select('*').order('sort_order'),
      supabase.from('heirway_learning_content' as any).select('*').eq('is_active', true).order('sort_order'),
    ]);
    setLearningModules((modsRes.data as any[]) || []);
    setLearningLessons((lessonsRes.data as any[]) || []);
  };

  const handleImportSelected = async () => {
    if (selectedLessons.size === 0) { toast.error('Select at least one video'); return; }
    setImporting(true);
    const { data: { user } } = await supabase.auth.getUser();
    const toImport = learningLessons.filter(l => selectedLessons.has(l.id));
    let count = 0;
    for (const lesson of toImport) {
      const mod = learningModules.find((m: any) => m.id === lesson.module_ref_id);
      const slug = lesson.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const { error } = await supabase.from('heirway_knowledgebase' as any).insert({
        title: lesson.title,
        slug: `${slug}-${Date.now()}`,
        summary: lesson.description || '',
        content: '',
        content_type: 'video',
        category: 'education',
        tags: [mod?.title || 'learning course'].filter(Boolean),
        video_url: lesson.video_url || null,
        thumbnail_url: lesson.thumbnail_url || null,
        allowed_plans: lesson.allowed_plans || ['education', 'foundation', 'business', 'wealth_builder'],
        is_published: true,
        is_featured: false,
        created_by: user?.id,
      });
      if (!error) count++;
    }
    toast.success(`Imported ${count} video${count !== 1 ? 's' : ''} to Knowledge Base`);
    setImportDialogOpen(false);
    setImporting(false);
    loadArticles();
  };

  const generateSlug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyFormBase, allowed_plans: defaultAllowedPlans() });
    setDialogOpen(true);
  };

  const openEdit = (article: KBArticle) => {
    setEditingId(article.id);
    setForm({
      title: article.title,
      slug: article.slug,
      summary: article.summary,
      content: article.content,
      content_type: article.content_type,
      category: article.category,
      tags: article.tags.join(', '),
      thumbnail_url: article.thumbnail_url || '',
      video_url: article.video_url || '',
      document_url: article.document_url || '',
      document_name: article.document_name || '',
      external_url: article.external_url || '',
      allowed_plans: article.allowed_plans,
      is_published: article.is_published,
      is_featured: article.is_featured,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    const slug = form.slug || generateSlug(form.title);
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);

    const payload: any = {
      title: form.title.trim(),
      slug,
      summary: form.summary.trim(),
      content: form.content,
      content_type: form.content_type,
      category: form.category,
      tags,
      thumbnail_url: form.thumbnail_url || null,
      video_url: form.video_url || null,
      document_url: form.document_url || null,
      document_name: form.document_name || null,
      external_url: form.external_url || null,
      allowed_plans: form.allowed_plans,
      is_published: form.is_published,
      is_featured: form.is_featured,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from('heirway_knowledgebase' as any).update(payload).eq('id', editingId));
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      payload.created_by = user?.id;
      ({ error } = await supabase.from('heirway_knowledgebase' as any).insert(payload));
    }

    if (error) {
      toast.error('Failed to save: ' + error.message);
    } else {
      toast.success(editingId ? 'Article updated' : 'Article created');
      setDialogOpen(false);
      loadArticles();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('heirway_knowledgebase' as any).delete().eq('id', id);
    if (error) toast.error('Failed to delete');
    else { toast.success('Article deleted'); loadArticles(); }
  };

  const togglePublished = async (article: KBArticle) => {
    await supabase.from('heirway_knowledgebase' as any).update({ is_published: !article.is_published } as any).eq('id', article.id);
    loadArticles();
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { toast.error('File must be under 50MB'); return; }
    setUploading(true);
    const ext = file.name.split('.').pop();
    const filePath = `kb-documents/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('client-documents').upload(filePath, file);
    if (error) { toast.error('Upload failed'); }
    else {
      setForm(f => ({ ...f, document_url: filePath, document_name: file.name }));
      toast.success('Document uploaded');
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleThumbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10MB'); return; }
    setUploadingThumb(true);
    const ext = file.name.split('.').pop();
    const filePath = `kb-thumbnails/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('learning-videos').upload(filePath, file);
    if (error) { toast.error('Upload failed'); }
    else {
      const { data } = supabase.storage.from('learning-videos').getPublicUrl(filePath);
      setForm(f => ({ ...f, thumbnail_url: data.publicUrl }));
      toast.success('Thumbnail uploaded');
    }
    setUploadingThumb(false);
    if (thumbRef.current) thumbRef.current.value = '';
  };

  const filtered = articles.filter(a => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      a.summary.toLowerCase().includes(q) ||
      a.content.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q) ||
      a.tags.some(tag => tag.toLowerCase().includes(q))
    );
  });


  const displayArticles = filtered.filter(a => {
    if (selectedCategory && a.category !== selectedCategory) return false;
    if (selectedType && a.content_type !== selectedType) return false;
    return true;
  });

  const activeCats = [...new Set(articles.map(a => a.category))].sort();

  return (
    <div className="space-y-6">
      <input ref={fileRef} type="file" className="hidden" onChange={handleDocUpload} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv" />
      <input ref={thumbRef} type="file" className="hidden" onChange={handleThumbUpload} accept="image/*" />

      {/* Header + Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" /> Knowledge Base Manager
          </h2>
          <p className="text-sm text-muted-foreground">{articles.length} articles · {articles.filter(a => a.is_published).length} published</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={openImportDialog}>
            <Video className="w-3.5 h-3.5 mr-1" /> Import from Courses
          </Button>
          <Button size="sm" onClick={openCreate} className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
            <Plus className="w-3.5 h-3.5 mr-1" /> New Article
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-2xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search articles, topics, content..."
          className="pl-12 h-11 rounded-full border-primary/20 bg-card shadow-sm focus-visible:ring-primary/30"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Button
          variant={!selectedCategory ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory(null)}
          className={!selectedCategory ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground' : ''}
        >
          All ({articles.length})
        </Button>
        {activeCats.map(cat => {
          const count = articles.filter(a => a.category === cat).length;
          return (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              className={selectedCategory === cat ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground' : ''}
            >
              {CATEGORIES.find(c => c.value === cat)?.label || cat} ({count})
            </Button>
          );
        })}
        <div className="ml-auto flex gap-1">
          {CONTENT_TYPES.map(type => {
            const Icon = type.icon;
            return (
              <Button
                key={type.value}
                variant={selectedType === type.value ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedType(selectedType === type.value ? null : type.value)}
                className={selectedType === type.value ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="ml-1 hidden sm:inline">{type.label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Articles Grid */}
      {displayArticles.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {searchQuery ? 'No articles match your search.' : 'No articles yet. Create your first one!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayArticles.map(article => (
            <div key={article.id} className="group relative flex flex-col rounded-xl border border-border/40 bg-card overflow-hidden hover:border-primary/30 hover:shadow-md transition-all">
              {!article.is_published && (
                <div className="absolute top-2 right-2 z-10">
                  <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-600 border-amber-500/20">Draft</Badge>
                </div>
              )}
              <div className="flex-1 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-[9px] px-1.5 ${
                    article.category === 'trusts' ? 'bg-primary/10 text-primary border-primary/20' :
                    article.category === 'tax' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                    article.category === 'estate_planning' ? 'bg-purple-500/10 text-purple-600 border-purple-500/20' :
                    article.category === 'asset_protection' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                    'bg-muted text-muted-foreground border-border'
                  }`}>
                    {CATEGORIES.find(c => c.value === article.category)?.label || article.category}
                  </Badge>
                  <Badge variant="outline" className="text-[9px]">
                    {CONTENT_TYPES.find(t => t.value === article.content_type)?.label}
                  </Badge>
                  {article.is_featured && <Star className="w-3 h-3 text-primary fill-primary" />}
                </div>
                <h3 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                  {article.title}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2">{article.summary}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>{new Date(article.created_at).toLocaleDateString()}</span>
                  <span>·</span>
                  <span>{article.views_count} views</span>
                </div>
                {article.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {article.tags.slice(0, 3).map(tag => (
                      <Badge key={tag} variant="outline" className="text-[9px] bg-muted/30">{tag}</Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="px-4 pb-3 flex items-center justify-between border-t border-border/30 pt-2">
                <span className="text-[10px] text-muted-foreground">
                  {article.allowed_plans.join(', ')}
                </span>
                <div className="flex items-center gap-0.5">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => togglePublished(article)} title={article.is_published ? 'Unpublish' : 'Publish'}>
                    {article.is_published ? <Eye className="w-3.5 h-3.5 text-green-600" /> : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(article)}>
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Article</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete "{article.title}".</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(article.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Topic Requests from Users */}
      <GoldHeaderCard
        title={`Topic Requests (${kbRequests.filter(r => r.status === 'pending').length} pending)`}
        icon={<MessageSquare className="w-4 h-4 text-primary" />}
        description="Questions and topic suggestions submitted by members"
      >
        {kbRequests.length === 0 ? (
          <div className="text-center py-6">
            <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No topic requests yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {kbRequests.map((req: any) => (
              <div key={req.id} className="flex items-start justify-between p-3 rounded-lg bg-muted/30 border border-border/40">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {req.status === 'pending' && <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-600 border-amber-500/20"><Clock className="w-2.5 h-2.5 mr-0.5" /> Pending</Badge>}
                    {req.status === 'reviewed' && <Badge variant="outline" className="text-[9px] bg-blue-500/10 text-blue-600 border-blue-500/20"><Eye className="w-2.5 h-2.5 mr-0.5" /> Reviewed</Badge>}
                    {req.status === 'published' && <Badge variant="outline" className="text-[9px] bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle className="w-2.5 h-2.5 mr-0.5" /> Published</Badge>}
                  </div>
                  <p className="text-sm font-medium text-foreground">{req.topic}</p>
                  {req.description && <p className="text-xs text-muted-foreground mt-0.5">{req.description}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">{new Date(req.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                  {req.status === 'pending' && (
                    <Button variant="outline" size="sm" onClick={() => updateRequestStatus(req.id, 'reviewed')}>
                      <Eye className="w-3.5 h-3.5 mr-1" /> Mark Reviewed
                    </Button>
                  )}
                  {req.status !== 'published' && (
                    <Button variant="outline" size="sm" onClick={() => updateRequestStatus(req.id, 'published')}>
                      <CheckCircle className="w-3.5 h-3.5 mr-1" /> Published
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </GoldHeaderCard>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Article' : 'New Article'}</DialogTitle>
            <DialogDescription>Fill in the details for your knowledgebase entry</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Content Type</Label>
                <Select value={form.content_type} onValueChange={v => setForm(f => ({ ...f, content_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => {
                setForm(f => ({
                  ...f,
                  title: e.target.value,
                  slug: editingId ? f.slug : generateSlug(e.target.value),
                }));
              }} placeholder="Article title" />
            </div>

            <div>
              <Label>Slug</Label>
              <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="url-friendly-slug" />
            </div>

            <div>
              <Label>Summary</Label>
              <Textarea value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} placeholder="Brief description shown in cards..." className="min-h-[60px]" />
            </div>

            {(form.content_type === 'article') && (
              <div>
                <Label>Content (HTML supported)</Label>
                <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Article content... HTML tags supported for formatting." className="min-h-[200px] font-mono text-xs" />
              </div>
            )}

            {(form.content_type === 'video' || form.content_type === 'article') && (
              <div>
                <Label>Video URL (YouTube, Vimeo, or direct link)</Label>
                <Input value={form.video_url} onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))} placeholder="https://youtube.com/watch?v=..." />
              </div>
            )}

            {form.content_type === 'document' && (
              <div>
                <Label>Document</Label>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1" />}
                    Upload Document
                  </Button>
                  {form.document_name && <span className="text-xs text-muted-foreground">{form.document_name}</span>}
                </div>
                <div className="mt-2">
                  <Label>Or paste URL</Label>
                  <Input value={form.document_url} onChange={e => setForm(f => ({ ...f, document_url: e.target.value }))} placeholder="https://..." />
                </div>
              </div>
            )}

            {form.content_type === 'external_link' && (
              <div>
                <Label>External URL *</Label>
                <Input value={form.external_url} onChange={e => setForm(f => ({ ...f, external_url: e.target.value }))} placeholder="https://..." />
              </div>
            )}

            <div>
              <Label>Thumbnail</Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => thumbRef.current?.click()} disabled={uploadingThumb}>
                  {uploadingThumb ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1" />}
                  Upload Image
                </Button>
                <Input value={form.thumbnail_url} onChange={e => setForm(f => ({ ...f, thumbnail_url: e.target.value }))} placeholder="Or paste image URL" className="flex-1" />
              </div>
              {form.thumbnail_url && <img src={form.thumbnail_url} alt="Thumb" className="mt-2 h-20 rounded object-cover" />}
            </div>

            <div>
              <Label>Tags (comma separated)</Label>
              <Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="trust, estate, tax planning" />
            </div>

            <div>
              <Label className="mb-2 block">Allowed Plans</Label>
              <div className="flex flex-wrap gap-3">
                {contentPlanOptions.map((plan) => (
                  <label key={plan.key} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <Checkbox
                      checked={form.allowed_plans.includes(plan.key)}
                      onCheckedChange={(checked) => {
                        setForm((f) => ({
                          ...f,
                          allowed_plans: checked
                            ? [...f.allowed_plans, plan.key]
                            : f.allowed_plans.filter((p) => p !== plan.key),
                        }));
                      }}
                    />
                    <span>
                      {plan.displayName}
                      <span className="text-[10px] text-muted-foreground ml-1">({plan.key})</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch checked={form.is_published} onCheckedChange={v => setForm(f => ({ ...f, is_published: v }))} />
                <span className="text-sm">Published</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch checked={form.is_featured} onCheckedChange={v => setForm(f => ({ ...f, is_featured: v }))} />
                <span className="text-sm">Featured</span>
              </label>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : editingId ? 'Update Article' : 'Create Article'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import from Learning Courses Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Videos from Learning Courses</DialogTitle>
            <DialogDescription>Select videos to add to the Knowledge Base</DialogDescription>
          </DialogHeader>
          {learningLessons.length === 0 ? (
            <div className="text-center py-8">
              <Video className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No learning course videos found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {learningModules.map(mod => {
                const modLessons = learningLessons.filter((l: any) => l.module_ref_id === mod.id);
                if (modLessons.length === 0) return null;
                return (
                  <div key={mod.id}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{mod.title}</p>
                    <div className="space-y-1">
                      {modLessons.map((lesson: any) => (
                        <label key={lesson.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/40 cursor-pointer transition-colors">
                          <Checkbox
                            checked={selectedLessons.has(lesson.id)}
                            onCheckedChange={(checked) => {
                              setSelectedLessons(prev => {
                                const next = new Set(prev);
                                if (checked) next.add(lesson.id); else next.delete(lesson.id);
                                return next;
                              });
                            }}
                          />
                          <Video className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">{lesson.title}</p>
                            {lesson.description && <p className="text-xs text-muted-foreground truncate">{lesson.description}</p>}
                          </div>
                          {(lesson.duration_minutes || 0) > 0 && <span className="text-[10px] text-muted-foreground flex-shrink-0">{lesson.duration_minutes} min</span>}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
              <Button onClick={handleImportSelected} disabled={importing || selectedLessons.size === 0} className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground">
                {importing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing...</> : `Import ${selectedLessons.size} Video${selectedLessons.size !== 1 ? 's' : ''}`}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
