import { useEffect, useState, useRef } from 'react';
import { HeirwayLayout } from '@/components/heirway/HeirwayLayout';
import { GoldHeaderCard } from '@/components/ui/gold-header-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { DOCUMENT_CATEGORIES } from '@/lib/heirwayPlans';
import { FileText, Upload, Trash2, Loader2, FolderOpen, Download } from 'lucide-react';
import { toast } from 'sonner';

export default function HeirwayDocuments() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState('other');
  const [userId, setUserId] = useState('');
  const [clientId, setClientId] = useState('');
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadDocuments(); }, []);

  const loadDocuments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); setInitialLoadDone(true); return; }
    setUserId(user.id);

    const { data: client } = await supabase.from('heirway_clients').select('id').eq('user_id', user.id).maybeSingle();
    if (client) setClientId(client.id);

    const { data } = await supabase.from('heirway_documents').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setDocuments(data || []);
    setLoading(false);
    setInitialLoadDone(true);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !clientId) return;

    if (file.size > 1000 * 1024 * 1024) {
      toast.error('File must be under 1GB');
      return;
    }

    setUploading(true);
    const filePath = `${userId}/${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage.from('client-documents').upload(filePath, file);
    if (uploadError) {
      toast.error('Upload failed: ' + uploadError.message);
      setUploading(false);
      return;
    }

    const { error: dbError } = await supabase.from('heirway_documents').insert({
      client_id: clientId,
      user_id: userId,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      category,
    });

    if (dbError) {
      toast.error('Failed to save document record');
    } else {
      toast.success('Document uploaded');
      loadDocuments();
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDelete = async (doc: any) => {
    await supabase.storage.from('client-documents').remove([doc.file_path]);
    await supabase.from('heirway_documents').delete().eq('id', doc.id);
    toast.success('Document deleted');
    loadDocuments();
  };

  const handleDownload = async (doc: any) => {
    const { data, error } = await supabase.storage.from('client-documents').createSignedUrl(doc.file_path, 3600);
    if (error || !data?.signedUrl) {
      toast.error('Failed to generate download link');
      return;
    }
    window.open(data.signedUrl, '_blank');
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getCategoryLabel = (id: string) => DOCUMENT_CATEGORIES.find(c => c.id === id)?.label || id;

  return (
    <HeirwayLayout>
      <div className="min-h-screen gradient-bg">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 p-4 md:p-6">
          <div className="mb-4 md:mb-6 animate-fade-in">
            <h1 className="text-xl md:text-2xl font-display font-bold text-foreground">Document Vault</h1>
            <p className="text-sm text-muted-foreground">Securely store and organize your estate documents</p>
          </div>

          {/* Upload Section */}
          <div className="glass-panel p-4 mb-4 md:mb-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium text-foreground block mb-1">Category</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="glass-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_CATEGORIES.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  onChange={handleUpload}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                />
                <Button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading || !clientId}
                  className="bg-gradient-to-r from-primary to-accent text-primary-foreground"
                >
                  {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  Upload Document
                </Button>
              </div>
            </div>
            {!clientId && initialLoadDone && (
              <p className="text-xs text-destructive mt-2">Complete your onboarding questionnaire first to enable uploads.</p>
            )}
          </div>

          {/* Documents List */}
          <GoldHeaderCard
            title="Your Documents"
            icon={<FolderOpen className="w-4 h-4 text-primary" />}
            headerAction={<Badge variant="outline">{documents.length} files</Badge>}
          >
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{doc.file_name}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{getCategoryLabel(doc.category)}</Badge>
                          {doc.file_size && <span className="text-xs text-muted-foreground">{formatSize(doc.file_size)}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)} className="text-primary/60 hover:text-primary" title="View / Download">
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(doc)} className="text-destructive/60 hover:text-destructive" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GoldHeaderCard>
        </div>
      </div>
    </HeirwayLayout>
  );
}
