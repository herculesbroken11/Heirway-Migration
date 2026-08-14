import { useState, useEffect, useMemo } from 'react';
import { HeirwayLayout } from '@/components/heirway/HeirwayLayout';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useClientProfile } from '@/hooks/useClientProfile';
import { useUpgradeRoute } from '@/hooks/useUpgradeRoute';
import { Search, FileText, Video, ExternalLink, BookOpen, Star, Lock, Eye, ArrowRight, Loader2, X, File, MessageSquarePlus, Send, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';

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
  is_featured: boolean;
  views_count: number;
  created_at: string;
}

const CONTENT_TYPE_ICONS: Record<string, React.ReactNode> = {
  article: <FileText className="w-4 h-4" />,
  video: <Video className="w-4 h-4" />,
  document: <File className="w-4 h-4" />,
  external_link: <ExternalLink className="w-4 h-4" />,
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  article: 'Article',
  video: 'Video',
  document: 'Document',
  external_link: 'External Link',
};

const CATEGORY_COLORS: Record<string, string> = {
  general: 'bg-muted text-muted-foreground border-border',
  trusts: 'bg-primary/10 text-primary border-primary/20',
  tax: 'bg-green-500/10 text-green-600 border-green-500/20',
  estate_planning: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  asset_protection: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  education: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  compliance: 'bg-red-500/10 text-red-600 border-red-500/20',
};

const CATEGORY_LABELS: Record<string, string> = {
  general: 'General',
  trusts: 'Trusts',
  tax: 'Tax',
  estate_planning: 'Estate Planning',
  asset_protection: 'Asset Protection',
  education: 'Education',
  compliance: 'Compliance',
};

export default function HeirwayKnowledgebase() {
  const { client, loading: profileLoading } = useClientProfile();
  const goToUpgrade = useUpgradeRoute();
  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<KBArticle | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestTopic, setRequestTopic] = useState('');
  const [requestDescription, setRequestDescription] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const userPlan = client?.selected_plan || 'free';

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    const { data } = await supabase
      .from('heirway_knowledgebase' as any)
      .select('*')
      .eq('is_published', true)
      .order('is_featured', { ascending: false })
      .order('views_count', { ascending: false });
    setArticles((data as any as KBArticle[]) || []);
    setLoading(false);
  };

  const hasAccess = (article: KBArticle) => {
    if (!article.allowed_plans || article.allowed_plans.length === 0) return true;
    return article.allowed_plans.includes(userPlan);
  };

  const categories = useMemo(() => {
    const cats = new Set(articles.map(a => a.category));
    return Array.from(cats).sort();
  }, [articles]);

  const filteredArticles = useMemo(() => {
    let filtered = articles;
    if (selectedCategory) filtered = filtered.filter(a => a.category === selectedCategory);
    if (selectedType) filtered = filtered.filter(a => a.content_type === selectedType);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.content.toLowerCase().includes(q) ||
        a.tags.some(tag => tag.toLowerCase().includes(q)) ||
        a.category.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [articles, searchQuery, selectedCategory, selectedType]);

  const featuredArticles = useMemo(() => articles.filter(a => a.is_featured && hasAccess(a)), [articles, userPlan]);
  const topArticles = useMemo(() => [...articles].sort((a, b) => b.views_count - a.views_count).slice(0, 5), [articles]);

  const openArticle = async (article: KBArticle) => {
    if (!hasAccess(article)) {
      goToUpgrade();
      return;
    }

    // Increment view count
    supabase.from('heirway_knowledgebase' as any).update({ views_count: (article.views_count || 0) + 1 } as any).eq('id', article.id).then(() => {});

    if (article.content_type === 'external_link' && article.external_url) {
      window.open(article.external_url, '_blank');
      return;
    }

    if (article.content_type === 'document' && article.document_url) {
      // If it's a storage path, create signed URL
      if (article.document_url.startsWith('kb-documents/')) {
        const { data } = await supabase.storage.from('client-documents').createSignedUrl(article.document_url, 300);
        if (data?.signedUrl) window.open(data.signedUrl, '_blank');
      } else {
        window.open(article.document_url, '_blank');
      }
      return;
    }

    setSelectedArticle(article);
    setViewDialogOpen(true);
  };

  const handleSubmitRequest = async () => {
    if (!requestTopic.trim()) { toast.error('Please enter a topic'); return; }
    setSubmittingRequest(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Please log in'); setSubmittingRequest(false); return; }
    const { error } = await supabase.from('heirway_kb_requests' as any).insert({
      user_id: user.id,
      client_id: client?.id || null,
      topic: requestTopic.trim(),
      description: requestDescription.trim(),
    } as any);
    if (error) { toast.error('Failed to submit request'); }
    else {
      toast.success('Topic request submitted! Our team will review it.');
      setRequestTopic('');
      setRequestDescription('');
      setRequestDialogOpen(false);
    }
    setSubmittingRequest(false);
  };

  if (loading || profileLoading) {
    return (
      <HeirwayLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </HeirwayLayout>
    );
  }

  return (
    <HeirwayLayout>
      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        {/* Hero / Search */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <BookOpen className="w-6 h-6 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Knowledge Base</h1>
          </div>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Search articles, documents, videos, and resources to help you manage your trusts and estate plan.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRequestDialogOpen(true)}
            className="mx-auto"
          >
            <MessageSquarePlus className="w-4 h-4 mr-1.5" /> Request a Topic
          </Button>
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search articles, topics, tags..."
              className="pl-12 h-12 text-base rounded-full border-primary/20 bg-card shadow-sm focus-visible:ring-primary/30"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <Button
            variant={!selectedCategory ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(null)}
            className={!selectedCategory ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground' : ''}
          >
            All
          </Button>
          {categories.map(cat => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              className={selectedCategory === cat ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground' : ''}
            >
              {CATEGORY_LABELS[cat] || cat}
            </Button>
          ))}
          <div className="ml-auto flex gap-1">
            {['article', 'video', 'document', 'external_link'].map(type => (
              <Button
                key={type}
                variant={selectedType === type ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedType(selectedType === type ? null : type)}
                className={selectedType === type ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}
              >
                {CONTENT_TYPE_ICONS[type]}
                <span className="ml-1 hidden sm:inline">{CONTENT_TYPE_LABELS[type]}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Featured Articles */}
        {!searchQuery && !selectedCategory && !selectedType && featuredArticles.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <Star className="w-4 h-4 text-primary" /> Featured
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredArticles.slice(0, 3).map(article => (
                <ArticleCard key={article.id} article={article} hasAccess={hasAccess(article)} onClick={() => openArticle(article)} />
              ))}
            </div>
          </div>
        )}

        {/* Top Articles */}
        {!searchQuery && !selectedCategory && !selectedType && topArticles.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <Eye className="w-4 h-4 text-muted-foreground" /> Popular Articles
            </h2>
            <div className="space-y-2">
              {topArticles.map((article, i) => (
                <button
                  key={article.id}
                  onClick={() => openArticle(article)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-card border border-border/40 hover:border-primary/30 hover:bg-muted/30 transition-colors text-left"
                >
                  <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{article.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{article.summary}</p>
                  </div>
                  {!hasAccess(article) && <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                  <Badge variant="outline" className={`text-[9px] ${CATEGORY_COLORS[article.category] || CATEGORY_COLORS.general}`}>
                    {CATEGORY_LABELS[article.category] || article.category}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* All Articles Grid */}
        <div>
          {(searchQuery || selectedCategory || selectedType) && (
            <h2 className="text-lg font-semibold text-foreground mb-3">
              {filteredArticles.length} result{filteredArticles.length !== 1 ? 's' : ''}
            </h2>
          )}
          {filteredArticles.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No articles found. Try adjusting your search or filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredArticles.map(article => (
                <ArticleCard key={article.id} article={article} hasAccess={hasAccess(article)} onClick={() => openArticle(article)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Article View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selectedArticle && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className={`text-[10px] ${CATEGORY_COLORS[selectedArticle.category] || CATEGORY_COLORS.general}`}>
                    {CATEGORY_LABELS[selectedArticle.category] || selectedArticle.category}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {CONTENT_TYPE_ICONS[selectedArticle.content_type]}
                    <span className="ml-1">{CONTENT_TYPE_LABELS[selectedArticle.content_type]}</span>
                  </Badge>
                </div>
                <DialogTitle className="text-xl">{selectedArticle.title}</DialogTitle>
                {selectedArticle.summary && (
                  <p className="text-sm text-muted-foreground">{selectedArticle.summary}</p>
                )}
              </DialogHeader>

              {selectedArticle.thumbnail_url && !selectedArticle.video_url && (
                <img src={selectedArticle.thumbnail_url} alt={selectedArticle.title} className="w-full rounded-lg object-cover max-h-64 mt-2" />
              )}

              {selectedArticle.content_type === 'video' && (
                <div className="mt-4">
                  {selectedArticle.video_url ? (
                    selectedArticle.video_url.includes('youtube.com') || selectedArticle.video_url.includes('youtu.be') ? (
                      <iframe
                        src={selectedArticle.video_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                        className="w-full aspect-video rounded-lg"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : selectedArticle.video_url.includes('vimeo.com') ? (
                      <iframe
                        src={selectedArticle.video_url.replace('vimeo.com/', 'player.vimeo.com/video/')}
                        className="w-full aspect-video rounded-lg"
                        allowFullScreen
                      />
                    ) : (
                      <video controls className="w-full rounded-lg">
                        <source src={selectedArticle.video_url} />
                      </video>
                    )
                  ) : (
                    <div className="w-full aspect-video rounded-lg bg-muted/50 border border-border flex flex-col items-center justify-center gap-2">
                      <Video className="w-10 h-10 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground font-medium">Video content coming soon</p>
                    </div>
                  )}
                </div>
              )}

              {selectedArticle.content_type !== 'video' && selectedArticle.video_url && (
                <div className="mt-4">
                  {selectedArticle.video_url.includes('youtube.com') || selectedArticle.video_url.includes('youtu.be') ? (
                    <iframe
                      src={selectedArticle.video_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                      className="w-full aspect-video rounded-lg"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : selectedArticle.video_url.includes('vimeo.com') ? (
                    <iframe
                      src={selectedArticle.video_url.replace('vimeo.com/', 'player.vimeo.com/video/')}
                      className="w-full aspect-video rounded-lg"
                      allowFullScreen
                    />
                  ) : (
                    <video controls className="w-full rounded-lg">
                      <source src={selectedArticle.video_url} />
                    </video>
                  )}
                </div>
              )}

              {selectedArticle.content ? (
                <div
                  className="prose prose-sm max-w-none mt-4 text-foreground prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-a:text-primary"
                  dangerouslySetInnerHTML={{ __html: selectedArticle.content }}
                />
              ) : selectedArticle.content_type !== 'video' && !selectedArticle.video_url && !selectedArticle.document_url ? (
                <div className="text-center py-8 mt-4">
                  <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground font-medium">Content coming soon</p>
                </div>
              ) : null}

              {selectedArticle.document_url && (
                <Button variant="outline" className="mt-4" onClick={() => {
                  if (selectedArticle.document_url?.startsWith('kb-documents/')) {
                    supabase.storage.from('client-documents').createSignedUrl(selectedArticle.document_url, 300).then(({ data }) => {
                      if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                    });
                  } else {
                    window.open(selectedArticle.document_url!, '_blank');
                  }
                }}>
                  <File className="w-4 h-4 mr-2" /> Download {selectedArticle.document_name || 'Document'}
                </Button>
              )}

              {selectedArticle.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-4 pt-4 border-t border-border">
                  {selectedArticle.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-[10px] bg-muted/50">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Request Topic Dialog */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquarePlus className="w-5 h-5 text-primary" />
              Request a Topic
            </DialogTitle>
            <DialogDescription>
              Suggest a question or topic you'd like us to cover in the Knowledge Base.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-foreground">Topic / Question *</label>
              <Input
                value={requestTopic}
                onChange={e => setRequestTopic(e.target.value)}
                placeholder="e.g. How do irrevocable trusts protect assets?"
                maxLength={200}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Additional Details</label>
              <Textarea
                value={requestDescription}
                onChange={e => setRequestDescription(e.target.value)}
                placeholder="Any specific context or details you'd like covered..."
                className="min-h-[80px]"
                maxLength={1000}
              />
            </div>
            <Button
              onClick={handleSubmitRequest}
              disabled={submittingRequest || !requestTopic.trim()}
              className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground"
            >
              {submittingRequest ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Submit Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </HeirwayLayout>
  );
}

function ArticleCard({ article, hasAccess, onClick }: { article: KBArticle; hasAccess: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col rounded-xl border border-border/40 bg-card overflow-hidden hover:border-primary/30 hover:shadow-md transition-all text-left"
    >
      {!hasAccess && (
        <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-10 flex items-center justify-center">
          <div className="flex flex-col items-center gap-1">
            <Lock className="w-6 h-6 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">Upgrade to access</span>
          </div>
        </div>
      )}


      <div className="flex-1 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`text-[9px] px-1.5 ${CATEGORY_COLORS[article.category] || CATEGORY_COLORS.general}`}>
            {CATEGORY_LABELS[article.category] || article.category}
          </Badge>
          {article.is_featured && (
            <Star className="w-3 h-3 text-primary fill-primary" />
          )}
        </div>
        <h3 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {article.title}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-2">{article.summary}</p>
        <div className="flex items-center gap-2 pt-1">
          <Badge variant="outline" className="text-[9px]">
            {CONTENT_TYPE_ICONS[article.content_type]}
            <span className="ml-1">{CONTENT_TYPE_LABELS[article.content_type]}</span>
          </Badge>
          {article.tags.slice(0, 2).map(tag => (
            <Badge key={tag} variant="outline" className="text-[9px] bg-muted/30">{tag}</Badge>
          ))}
        </div>
      </div>

      <div className="px-4 pb-3">
        <span className="text-xs text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
          {article.content_type === 'external_link' ? 'Open link' : 'Read more'} <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </button>
  );
}
