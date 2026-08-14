import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { GoldHeaderCard } from '@/components/ui/gold-header-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getTrustLabel, getTrustBgClass } from '@/lib/trustTypes';
import { FileText, Plus, Clock, Printer, ChevronDown, ChevronUp, Lock, Hash, Trash2, Upload, Loader2, CheckCircle, Eye, CalendarIcon } from 'lucide-react';

interface TrustOption {
  id: string;
  trust_name: string;
  trust_type: string;
}

interface MeetingMinutesProps {
  userId: string;
  clientId: string;
  showOnlyWhenComplete?: boolean;
}

export default function MeetingMinutes({ userId, clientId, showOnlyWhenComplete }: MeetingMinutesProps) {
  const [minutes, setMinutes] = useState<any[]>([]);
  const [trusts, setTrusts] = useState<TrustOption[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', content: '', meeting_date: new Date().toISOString().split('T')[0], trust_id: '', minute_number: '' });
  const [uploadMode, setUploadMode] = useState<'file' | 'notes'>('file');
  const [directFile, setDirectFile] = useState<File | null>(null);
  const directFileRef = useRef<HTMLInputElement>(null);
  const [allTrustsComplete, setAllTrustsComplete] = useState(false);
  const [trustsLoaded, setTrustsLoaded] = useState(false);
  const [approvedDeleteRequests, setApprovedDeleteRequests] = useState<any[]>([]);
  const [signedDocs, setSignedDocs] = useState<Record<string, any>>({}); // minuteId -> doc
  const [uploadingMinuteId, setUploadingMinuteId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingUploadMinuteId, setPendingUploadMinuteId] = useState<string | null>(null);

  useEffect(() => { loadMinutes(); loadTrusts(); loadApprovedDeletes(); }, [userId, clientId]);

  const loadTrusts = async () => {
    const { data } = await supabase
      .from('heirway_trust_progress' as any)
      .select('*')
      .eq('client_id', clientId);
    const trustData = (data as any[]) || [];
    setTrusts(trustData);
    const complete = trustData.length > 0 && trustData.some((t: any) => t.stage === 'trusts_complete');
    setAllTrustsComplete(complete);
    setTrustsLoaded(true);
  };

  const loadApprovedDeletes = async () => {
    const { data } = await supabase
      .from('heirway_admin_requests' as any)
      .select('*')
      .eq('user_id', userId)
      .eq('request_type', 'delete_meeting_minute')
      .in('status', ['completed', 'approved']);
    setApprovedDeleteRequests((data as any[]) || []);
  };

  const loadMinutes = async () => {
    const { data } = await supabase
      .from('heirway_meeting_minutes' as any)
      .select('*')
      .eq('client_id', clientId)
      .order('minute_number', { ascending: true });
    const minutesData = (data as any[]) || [];
    setMinutes(minutesData);
    // Load signed docs for all minutes
    loadSignedDocs(minutesData);
  };

  const loadSignedDocs = async (minutesList: any[]) => {
    if (minutesList.length === 0) return;
    const { data } = await supabase
      .from('heirway_documents')
      .select('*')
      .eq('user_id', userId)
      .like('category', 'meeting_minute_signed_%');
    const docs: Record<string, any> = {};
    (data || []).forEach((doc: any) => {
      const minuteId = doc.category.replace('meeting_minute_signed_', '');
      docs[minuteId] = doc;
    });
    setSignedDocs(docs);
  };

  const getNextMinuteNumber = (trustId: string) => {
    const trustMinutes = minutes.filter(m => m.trust_id === trustId);
    return trustMinutes.length + 1;
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (!form.trust_id) { toast.error('Please select a trust'); return; }
    if (!form.minute_number || isNaN(Number(form.minute_number))) { toast.error('Please enter a valid minute number'); return; }

    if (uploadMode === 'file' && !directFile) { toast.error('Please select a file to upload'); return; }
    if (uploadMode === 'notes' && !form.content.trim()) { toast.error('Please enter meeting notes'); return; }

    const content = uploadMode === 'file' ? '(Uploaded document — see signed version)' : form.content.trim();

    const { data: inserted, error } = await supabase.from('heirway_meeting_minutes' as any).insert({
      user_id: userId,
      client_id: clientId,
      trust_id: form.trust_id,
      title: form.title.trim(),
      content,
      meeting_date: form.meeting_date,
      minute_number: Number(form.minute_number),
    } as any).select('id').single();

    if (error) { toast.error('Failed to save'); return; }

    // If file upload mode, upload the file as a signed document
    if (uploadMode === 'file' && directFile && inserted) {
      const minuteId = (inserted as any).id;
      const ext = directFile.name.split('.').pop();
      const filePath = `${userId}/meeting_minutes/${minuteId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from('client-documents').upload(filePath, directFile);
      if (uploadError) {
        toast.error('File upload failed: ' + uploadError.message);
      } else {
        const minuteNum = Number(form.minute_number);
        await supabase.from('heirway_documents').insert({
          client_id: clientId,
          user_id: userId,
          file_name: `Meeting Minutes #${minuteNum} — Signed`,
          file_path: filePath,
          file_size: directFile.size,
          category: `meeting_minute_signed_${minuteId}`,
        });
      }
    }

    toast.success('Meeting minutes saved');
    setDialogOpen(false);
    setForm({ title: '', content: '', meeting_date: new Date().toISOString().split('T')[0], trust_id: '', minute_number: '' });
    // uploadMode is always 'file'
    setDirectFile(null);
    loadMinutes();
  };

  const getTrustForMinute = (minute: any) => trusts.find(t => t.id === minute.trust_id);

  const handlePrint = (minute: any) => {
    const trust = getTrustForMinute(minute);
    const minuteNum = minute.minute_number || '—';
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
      <head><title>${minute.title} — Meeting Minutes #${minuteNum}</title>
        <style>
          body{font-family:serif;padding:40px;max-width:700px;margin:auto}
          h1{font-size:20px;margin-bottom:4px}
          .meta{color:#666;font-size:13px;margin-bottom:4px}
          .trust-name{font-size:15px;font-weight:bold;margin-bottom:20px;color:#333}
          .content{white-space:pre-wrap;line-height:1.7;font-size:15px;margin-bottom:40px}
          .signature-section{border-top:1px solid #ccc;padding-top:24px;margin-top:40px}
          .signature-block{margin-bottom:30px}
          .signature-line{border-bottom:1px solid #333;width:300px;margin-bottom:6px;height:30px}
          .signature-label{font-size:12px;color:#666}
          .minute-number{font-size:14px;color:#888;margin-bottom:16px}
        </style>
      </head>
      <body>
        <div class="minute-number">Meeting Minutes #${minuteNum}</div>
        <h1>${minute.title}</h1>
        <div class="trust-name">${trust?.trust_name || 'Trust'}</div>
        <div class="meta">${new Date(minute.meeting_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        <hr style="margin:16px 0;border:none;border-top:1px solid #ddd"/>
        <div class="content">${minute.content}</div>
        <div class="signature-section">
          <p style="font-size:14px;font-weight:bold;margin-bottom:20px">Signatures</p>
          <div class="signature-block">
            <div class="signature-line"></div>
            <div class="signature-label">Trust Manager / Managing Trustee — Signature & Date</div>
          </div>
          <div class="signature-block">
            <div class="signature-line"></div>
            <div class="signature-label">Trustee — Signature & Date</div>
          </div>
          <div class="signature-block">
            <div class="signature-line"></div>
            <div class="signature-label">Trustee — Signature & Date</div>
          </div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleSignedUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const minuteId = pendingUploadMinuteId;
    if (!file || !minuteId) return;

    if (file.size > 20 * 1024 * 1024) {
      toast.error('File must be under 20MB');
      return;
    }

    setUploadingMinuteId(minuteId);
    const minute = minutes.find(m => m.id === minuteId);
    const minuteNum = minute?.minute_number || '—';
    const ext = file.name.split('.').pop();
    const filePath = `${userId}/meeting_minutes/${minuteId}/${Date.now()}.${ext}`;

    // If there's already a signed doc, remove the old one first
    const existingDoc = signedDocs[minuteId];
    if (existingDoc) {
      await supabase.storage.from('client-documents').remove([existingDoc.file_path]);
      await supabase.from('heirway_documents').delete().eq('id', existingDoc.id);
    }

    const { error: uploadError } = await supabase.storage.from('client-documents').upload(filePath, file);
    if (uploadError) {
      toast.error('Upload failed: ' + uploadError.message);
      setUploadingMinuteId(null);
      return;
    }

    const { error: dbError } = await supabase.from('heirway_documents').insert({
      client_id: clientId,
      user_id: userId,
      file_name: `Meeting Minutes #${minuteNum} — Signed`,
      file_path: filePath,
      file_size: file.size,
      category: `meeting_minute_signed_${minuteId}`,
    });

    if (dbError) {
      toast.error('Failed to save document record');
    } else {
      toast.success('Signed document uploaded');
      loadMinutes();
    }
    setUploadingMinuteId(null);
    setPendingUploadMinuteId(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleViewSignedDoc = async (doc: any) => {
    const { data } = await supabase.storage.from('client-documents').createSignedUrl(doc.file_path, 300);
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    } else {
      toast.error('Could not generate download link');
    }
  };

  const triggerUpload = (minuteId: string) => {
    setPendingUploadMinuteId(minuteId);
    setTimeout(() => fileRef.current?.click(), 50);
  };

  const completedTrusts = trusts.filter((t: any) => t.stage === 'trusts_complete');

  if (showOnlyWhenComplete && trustsLoaded && !allTrustsComplete) {
    return (
      <GoldHeaderCard
        title="Meeting Minutes"
        icon={<FileText className="w-4 h-4 text-primary" />}
        description="Record and print trust meeting notes"
      >
        <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/10 border border-border/40">
          <Lock className="w-5 h-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">Available After Trust Completion</p>
            <p className="text-xs text-muted-foreground">Meeting minutes become available once at least one trust reaches "Trusts Complete" status.</p>
          </div>
        </div>
      </GoldHeaderCard>
    );
  }

  return (
    <>
      {/* Hidden file input for signed doc uploads */}
      <input
        ref={fileRef}
        type="file"
        onChange={handleSignedUpload}
        className="hidden"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
      />

      <GoldHeaderCard
        title="Meeting Minutes"
        icon={<FileText className="w-4 h-4 text-primary" />}
        description="Record and print trust meeting notes for trustee signatures"
        headerAction={
          <Button size="sm" onClick={() => {
            const defaultNum = form.trust_id ? String(getNextMinuteNumber(form.trust_id)) : '';
            setForm(f => ({ ...f, minute_number: defaultNum }));
            setUploadMode('file');
            setDirectFile(null);
            setDialogOpen(true);
          }} className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
            <Plus className="w-3.5 h-3.5 mr-1" /> New Entry
          </Button>
        }
      >
        {minutes.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No meeting minutes recorded yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {minutes.map((m: any) => {
              const trust = getTrustForMinute(m);
              const minuteNum = m.minute_number || '—';
              const hasSignedDoc = !!signedDocs[m.id];
              const isUploading = uploadingMinuteId === m.id;
              return (
                <div key={m.id} className="rounded-lg bg-muted/30 border border-border/40 overflow-hidden">
                  <button
                    onClick={() => setExpanded(expanded === m.id ? null : m.id)}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[9px] font-mono">
                            <Hash className="w-2.5 h-2.5 mr-0.5" />{minuteNum}
                          </Badge>
                          <p className="text-sm font-medium text-foreground truncate">{m.title}</p>
                          {hasSignedDoc && (
                            <Badge variant="outline" className="text-[9px] bg-green-500/10 text-green-600 border-green-500/20">
                              <CheckCircle className="w-2.5 h-2.5 mr-0.5" /> Signed
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(m.meeting_date).toLocaleDateString()}
                          </p>
                          {trust && (
                            <Badge variant="outline" className={`text-[9px] ${getTrustBgClass(trust.trust_type)}`}>
                              {trust.trust_name}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {expanded === m.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </button>
                  {expanded === m.id && (
                    <div className="px-3 pb-3 border-t border-border/40">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap py-3">{m.content}</p>

                      {/* Signed document section */}
                      {hasSignedDoc ? (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/5 border border-green-500/20 mb-3">
                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{signedDocs[m.id].file_name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              Uploaded {new Date(signedDocs[m.id].created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handleViewSignedDoc(signedDocs[m.id])}>
                            <Eye className="w-3 h-3 mr-1" /> View
                          </Button>
                          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => triggerUpload(m.id)} disabled={isUploading}>
                            {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
                            Replace
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border/30 mb-3">
                          <Upload className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <p className="text-xs text-muted-foreground flex-1">Print, sign, then upload the signed version here.</p>
                          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => triggerUpload(m.id)} disabled={isUploading}>
                            {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
                            Upload Signed
                          </Button>
                        </div>
                      )}

                      <div className="flex items-center gap-2 flex-wrap">
                        <Button variant="outline" size="sm" onClick={() => handlePrint(m)}>
                          <Printer className="w-3.5 h-3.5 mr-1" /> Print for Signing
                        </Button>
                        {approvedDeleteRequests.some(r => r.related_minute_id === m.id || (!r.related_minute_id && r.description?.includes(`#${minuteNum}`))) ? (
                          <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={async () => {
                            try {
                              // Also delete associated signed doc
                              const signedDoc = signedDocs[m.id];
                              if (signedDoc) {
                                await supabase.storage.from('client-documents').remove([signedDoc.file_path]);
                                await supabase.from('heirway_documents').delete().eq('id', signedDoc.id);
                              }
                              const { error } = await supabase.from('heirway_meeting_minutes' as any).delete().eq('id', m.id);
                              if (error) throw error;
                              toast.success('Meeting minute deleted');
                              loadMinutes();
                              loadApprovedDeletes();
                            } catch (err: any) {
                              toast.error('Failed to delete: ' + (err.message || 'Unknown error'));
                            }
                          }}>
                            <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                          </Button>
                        ) : (
                          <p className="text-[10px] text-muted-foreground">To delete, submit an administrative request referencing minute #{minuteNum}.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </GoldHeaderCard>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-panel border-primary/20 max-w-md">
          <DialogHeader>
            <DialogTitle>New Meeting Minutes</DialogTitle>
            <DialogDescription>Record notes from your trust meeting — will be printed for trustee signatures</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Assign to Trust *</Label>
              <Select value={form.trust_id} onValueChange={v => {
                const nextNum = String(getNextMinuteNumber(v));
                setForm(f => ({ ...f, trust_id: v, minute_number: nextNum }));
              }}>
                <SelectTrigger className="glass-input"><SelectValue placeholder="Select a trust..." /></SelectTrigger>
                <SelectContent>
                  {completedTrusts.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      <span className="flex items-center gap-2">
                        {t.trust_name}
                        <span className="text-[10px] text-muted-foreground">({getTrustLabel(t.trust_type)})</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Minute Number *</Label>
              <Input
                type="number"
                value={form.minute_number}
                onChange={e => setForm(f => ({ ...f, minute_number: e.target.value }))}
                placeholder="e.g. 1"
                className="glass-input"
              />
              {form.trust_id && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Suggested: #{getNextMinuteNumber(form.trust_id)}
                </p>
              )}
            </div>
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Quarterly Trust Review" className="glass-input" />
            </div>
            <div>
              <Label>Meeting Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal glass-input",
                      !form.meeting_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.meeting_date ? format(new Date(form.meeting_date + 'T00:00:00'), 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.meeting_date ? new Date(form.meeting_date + 'T00:00:00') : undefined}
                    onSelect={(date) => setForm(f => ({ ...f, meeting_date: date ? format(date, 'yyyy-MM-dd') : '' }))}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label className="mb-2 block">Entry Type</Label>
              <div className="flex gap-2 mb-3">
                <Button
                  type="button"
                  variant={uploadMode === 'file' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setUploadMode('file')}
                  className={uploadMode === 'file' ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground' : ''}
                >
                  <Upload className="w-3.5 h-3.5 mr-1" /> Upload Document
                </Button>
                <Button
                  type="button"
                  variant={uploadMode === 'notes' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setUploadMode('notes')}
                  className={uploadMode === 'notes' ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground' : ''}
                >
                  <FileText className="w-3.5 h-3.5 mr-1" /> Write Notes
                </Button>
              </div>
            </div>

            {uploadMode === 'file' ? (
              <div>
                <Label>Meeting Minute Document *</Label>
                <input
                  ref={directFileRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                  onChange={e => setDirectFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <div
                  onClick={() => directFileRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/40 hover:bg-muted/30 transition-colors"
                >
                  {directFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{directFile.name}</p>
                        <p className="text-[10px] text-muted-foreground">{(directFile.size / 1024).toFixed(0)} KB · Click to change</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Click to select a PDF or image</p>
                      <p className="text-[10px] text-muted-foreground mt-1">PDF, DOC, JPG, PNG — Max 20MB</p>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <Label>Meeting Notes *</Label>
                <Textarea
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Enter meeting notes, discussion points, and action items..."
                  className="glass-input min-h-[150px]"
                />
                <p className="text-[10px] text-muted-foreground mt-1">These notes can be printed for trustee signatures.</p>
              </div>
            )}

            <Button onClick={handleSave} className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground">
              Save Minutes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
