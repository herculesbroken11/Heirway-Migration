import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Video, Loader2, Trash2, ExternalLink } from 'lucide-react';

interface IntakeVideo {
  id: string;
  section_key: string;
  video_url: string;
  title: string;
  updated_at: string;
}

const SECTIONS = [
  { key: 'pre_drafting', label: 'Pre-Drafting Requirements', description: 'Required video shown before Trustees & Beneficiaries sections' },
  { key: 'trustees', label: 'Understanding Trustees', description: 'Shown at the top of the Trustees intake section' },
  { key: 'beneficiaries', label: 'Understanding Beneficiaries', description: 'Shown at the top of the Beneficiaries intake section' },
];

export default function IntakeVideoManager() {
  const [videos, setVideos] = useState<IntakeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  const fetchVideos = async () => {
    const { data } = await supabase.from('heirway_intake_videos').select('*');
    setVideos((data as IntakeVideo[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchVideos(); }, []);

  const getVideoForSection = (key: string) => videos.find(v => v.section_key === key);

  const handleUpload = async (sectionKey: string, file: File) => {
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload MP4, WebM, MOV, or M4V files');
      return;
    }
    if (file.size > 1000 * 1024 * 1024) {
      toast.error('File must be under 1GB');
      return;
    }

    setUploading(sectionKey);
    const ext = file.name.split('.').pop();
    const filePath = `intake-${sectionKey}-${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from('learning-videos').upload(filePath, file);
    if (uploadError) {
      toast.error('Upload failed: ' + uploadError.message);
      setUploading(null);
      return;
    }

    const { data: urlData } = supabase.storage.from('learning-videos').getPublicUrl(filePath);
    const videoUrl = urlData.publicUrl;
    const section = SECTIONS.find(s => s.key === sectionKey)!;

    const existing = getVideoForSection(sectionKey);
    if (existing) {
      await supabase.from('heirway_intake_videos').update({
        video_url: videoUrl,
        title: section.label,
        updated_at: new Date().toISOString(),
      }).eq('section_key', sectionKey);
    } else {
      await supabase.from('heirway_intake_videos').insert({
        section_key: sectionKey,
        video_url: videoUrl,
        title: section.label,
      } as any);
    }

    toast.success(`${section.label} video uploaded`);
    setUploading(null);
    fetchVideos();
  };

  const handleUrlSubmit = async (sectionKey: string, url: string) => {
    const section = SECTIONS.find(s => s.key === sectionKey)!;
    const existing = getVideoForSection(sectionKey);

    if (existing) {
      await supabase.from('heirway_intake_videos').update({
        video_url: url,
        title: section.label,
        updated_at: new Date().toISOString(),
      }).eq('section_key', sectionKey);
    } else {
      await supabase.from('heirway_intake_videos').insert({
        section_key: sectionKey,
        video_url: url,
        title: section.label,
      } as any);
    }

    toast.success(`${section.label} video URL saved`);
    fetchVideos();
  };

  const handleRemove = async (sectionKey: string) => {
    await supabase.from('heirway_intake_videos').delete().eq('section_key', sectionKey);
    toast.success('Video removed');
    fetchVideos();
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-display font-bold text-foreground">Intake Training Videos</h3>
        <p className="text-sm text-muted-foreground">Upload or paste URLs for training videos shown during the client intake process.</p>
      </div>

      {SECTIONS.map(section => {
        const video = getVideoForSection(section.key);
        return <SectionCard key={section.key} section={section} video={video} uploading={uploading === section.key} onUpload={(f) => handleUpload(section.key, f)} onUrlSubmit={(u) => handleUrlSubmit(section.key, u)} onRemove={() => handleRemove(section.key)} />;
      })}
    </div>
  );
}

function SectionCard({ section, video, uploading, onUpload, onUrlSubmit, onRemove }: {
  section: { key: string; label: string; description: string };
  video?: { video_url: string; updated_at: string };
  uploading: boolean;
  onUpload: (f: File) => void;
  onUrlSubmit: (url: string) => void;
  onRemove: () => void;
}) {
  const [urlInput, setUrlInput] = useState('');
  const [mode, setMode] = useState<'upload' | 'url'>('upload');

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-primary" />
              <span className="font-semibold text-foreground">{section.label}</span>
              {video ? <Badge variant="default" className="text-[10px]">Active</Badge> : <Badge variant="secondary" className="text-[10px]">No video</Badge>}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{section.description}</p>
          </div>
          {video && (
            <Button variant="ghost" size="sm" onClick={onRemove} className="text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>

        {video && (
          <div className="rounded-lg overflow-hidden border bg-black aspect-video">
            <video src={video.video_url} controls className="w-full h-full object-contain" controlsList="nodownload" />
          </div>
        )}

        <div className="flex gap-2">
          <Button variant={mode === 'upload' ? 'default' : 'outline'} size="sm" onClick={() => setMode('upload')}>
            <Upload className="w-3 h-3 mr-1" /> Upload File
          </Button>
          <Button variant={mode === 'url' ? 'default' : 'outline'} size="sm" onClick={() => setMode('url')}>
            <ExternalLink className="w-3 h-3 mr-1" /> Paste URL
          </Button>
        </div>

        {mode === 'upload' ? (
          <div>
            <Label className="text-xs">Upload video (MP4, WebM, MOV — max 1GB)</Label>
            <Input type="file" accept="video/mp4,video/webm,video/quicktime,video/x-m4v" className="mt-1" disabled={uploading} onChange={e => { if (e.target.files?.[0]) onUpload(e.target.files[0]); }} />
            {uploading && <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Uploading…</div>}
          </div>
        ) : (
          <div className="flex gap-2">
            <Input placeholder="https://..." value={urlInput} onChange={e => setUrlInput(e.target.value)} className="flex-1" />
            <Button size="sm" disabled={!urlInput.trim()} onClick={() => { onUrlSubmit(urlInput.trim()); setUrlInput(''); }}>Save</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
