import { useState, useEffect, useRef } from 'react';
import { GoldHeaderCard } from '@/components/ui/gold-header-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TRUST_TYPES } from '@/lib/trustTypes';
import { Settings, Plus, Clock, CheckCircle, AlertCircle, Upload, Loader2, X } from 'lucide-react';

const REQUEST_TYPES = [
  { value: 'request_trust', label: 'Request for Another Trust' },
  { value: 'issue_certificate_beneficial', label: 'Issue New Certificate of Beneficial Interest' },
  { value: 'issue_certificate_capital', label: 'Issue Certificate of Capital Credit Units' },
  { value: 'addition_trustee', label: 'Request Addition of Trustee Document' },
  { value: 'trustee_resignation', label: 'Request Formal Trustee Resignation Document' },
  { value: 'updated_certificate_trust', label: 'Request Updated Certificate of Trust' },
  { value: 'delete_meeting_minute', label: 'Delete Meeting Minute' },
  { value: 'other', label: 'Other Administrative Request' },
];

interface AdminRequestsProps {
  userId: string;
  clientId: string;
}

interface TrusteeEntry {
  name: string;
  power: 'full' | 'limited';
  entity_type: 'natural_person' | 'entity';
}

interface BeneficiaryEntry {
  name: string;
  units: string;
}

export default function AdminRequests({ userId, clientId }: AdminRequestsProps) {
  const [requests, setRequests] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [requestType, setRequestType] = useState('request_trust');
  const [description, setDescription] = useState('');
  const [minutes, setMinutes] = useState<any[]>([]);
  const [selectedMinuteId, setSelectedMinuteId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Request Trust fields
  const [trustType, setTrustType] = useState('');
  const [trustees, setTrustees] = useState<TrusteeEntry[]>([{ name: '', power: 'full', entity_type: 'natural_person' }]);
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryEntry[]>([{ name: '', units: '' }]);
  const [creatorName, setCreatorName] = useState('');
  const [hasCreator, setHasCreator] = useState(false);
  const [needsCreator, setNeedsCreator] = useState(false);
  const [annualMeetingDate, setAnnualMeetingDate] = useState('');

  // Certificate fields - voided certificate upload
  const [voidedFile, setVoidedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Addition of Trustee fields
  const [addTrusteeEntityType, setAddTrusteeEntityType] = useState<'natural_person' | 'entity'>('natural_person');
  const [addTrusteePower, setAddTrusteePower] = useState<'full' | 'limited'>('full');
  const [addTrusteeName, setAddTrusteeName] = useState('');

  // Trusts for selecting
  const [trusts, setTrusts] = useState<any[]>([]);
  const [selectedTrustId, setSelectedTrustId] = useState('');

  useEffect(() => { loadRequests(); loadMinutes(); loadTrusts(); }, [userId, clientId]);

  const loadRequests = async () => {
    const { data } = await supabase
      .from('heirway_admin_requests' as any)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    setRequests((data as any[]) || []);
  };

  const loadMinutes = async () => {
    const { data } = await supabase
      .from('heirway_meeting_minutes' as any)
      .select('*')
      .eq('client_id', clientId)
      .order('meeting_date', { ascending: false });
    setMinutes((data as any[]) || []);
  };

  const loadTrusts = async () => {
    const { data } = await supabase
      .from('heirway_trust_progress' as any)
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true });
    setTrusts((data as any[]) || []);
  };

  const resetForm = () => {
    setRequestType('request_trust');
    setDescription('');
    setSelectedMinuteId('');
    setTrustType('');
    setTrustees([{ name: '', power: 'full', entity_type: 'natural_person' }]);
    setBeneficiaries([{ name: '', units: '' }]);
    setCreatorName('');
    setHasCreator(false);
    setNeedsCreator(false);
    setAnnualMeetingDate('');
    setVoidedFile(null);
    setAddTrusteeEntityType('natural_person');
    setAddTrusteePower('full');
    setAddTrusteeName('');
    setSelectedTrustId('');
  };

  const buildDescription = (): string => {
    switch (requestType) {
      case 'request_trust': {
        const typeLabel = TRUST_TYPES.find(t => t.value === trustType)?.label || trustType;
        let desc = `Request for new trust — Type: ${typeLabel}\n`;
        desc += `\nTrustees:\n`;
        trustees.filter(t => t.name.trim()).forEach(t => {
          desc += `  • ${t.name} (${t.entity_type === 'entity' ? 'Entity' : 'Natural Person'}, ${t.power === 'full' ? 'Full Power' : 'Limited Power'})\n`;
        });
        desc += `\nBeneficiaries:\n`;
        beneficiaries.filter(b => b.name.trim()).forEach(b => {
          desc += `  • ${b.name}${b.units ? ` — ${b.units} units` : ''}\n`;
        });
        if (hasCreator) desc += `\nCreator: ${creatorName}`;
        if (needsCreator) desc += `\nNeeds creator fulfillment from Heirway`;
        if (annualMeetingDate) desc += `\nAnnual Meeting Date: ${annualMeetingDate}`;
        if (description.trim()) desc += `\n\nAdditional notes: ${description.trim()}`;
        return desc;
      }
      case 'issue_certificate_beneficial':
        return `Issue New Certificate of Beneficial Interest${selectedTrustId ? ` — Trust: ${trusts.find(t => t.id === selectedTrustId)?.trust_name || ''}` : ''}${description.trim() ? `\n\nNotes: ${description.trim()}` : ''}\n\nVoided certificate attached.`;
      case 'issue_certificate_capital':
        return `Issue Certificate of Capital Credit Units${selectedTrustId ? ` — Trust: ${trusts.find(t => t.id === selectedTrustId)?.trust_name || ''}` : ''}${description.trim() ? `\n\nNotes: ${description.trim()}` : ''}`;
      case 'addition_trustee':
        return `Request Addition of Trustee Document\nTrustee: ${addTrusteeName}\nType: ${addTrusteeEntityType === 'entity' ? 'Entity' : 'Natural Person'}\nPower Level: ${addTrusteePower === 'full' ? 'Full Power' : 'Limited Power'}${selectedTrustId ? `\nTrust: ${trusts.find(t => t.id === selectedTrustId)?.trust_name || ''}` : ''}${description.trim() ? `\n\nNotes: ${description.trim()}` : ''}`;
      case 'trustee_resignation':
        return `Request Formal Trustee Resignation Document${selectedTrustId ? ` — Trust: ${trusts.find(t => t.id === selectedTrustId)?.trust_name || ''}` : ''}${description.trim() ? `\n\nDetails: ${description.trim()}` : ''}`;
      case 'updated_certificate_trust':
        return `Request Updated Certificate of Trust${selectedTrustId ? ` — Trust: ${trusts.find(t => t.id === selectedTrustId)?.trust_name || ''}` : ''}${description.trim() ? `\n\nNotes: ${description.trim()}` : ''}`;
      case 'delete_meeting_minute': {
        const minute = minutes.find(m => m.id === selectedMinuteId);
        return `Delete meeting minute #${minute?.minute_number || '—'}: "${minute?.title || ''}"${description.trim() ? ` — ${description.trim()}` : ''}`;
      }
      default:
        return description.trim();
    }
  };

  const validate = (): boolean => {
    switch (requestType) {
      case 'request_trust':
        if (!trustType) { toast.error('Please select a trust type'); return false; }
        if (!trustees.some(t => t.name.trim())) { toast.error('Please add at least one trustee'); return false; }
        if (!beneficiaries.some(b => b.name.trim())) { toast.error('Please add at least one beneficiary'); return false; }
        return true;
      case 'issue_certificate_beneficial':
        if (!voidedFile) { toast.error('Please attach the voided certificate'); return false; }
        return true;
      case 'issue_certificate_capital':
        return true;
      case 'addition_trustee':
        if (!addTrusteeName.trim()) { toast.error('Please enter the trustee name'); return false; }
        return true;
      case 'trustee_resignation':
        if (!description.trim()) { toast.error('Please describe who is resigning'); return false; }
        return true;
      case 'updated_certificate_trust':
        return true;
      case 'delete_meeting_minute':
        if (!selectedMinuteId) { toast.error('Please select a meeting minute'); return false; }
        return true;
      case 'other':
        if (!description.trim()) { toast.error('Please describe your request'); return false; }
        return true;
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);

    try {
      const desc = buildDescription();

      // Upload voided certificate if applicable
      let attachmentNote = '';
      if (requestType === 'issue_certificate_beneficial' && voidedFile) {
        setUploading(true);
        const ext = voidedFile.name.split('.').pop();
        const filePath = `${userId}/admin_requests/${Date.now()}_voided.${ext}`;
        const { error: uploadError } = await supabase.storage.from('client-documents').upload(filePath, voidedFile);
        if (uploadError) { toast.error('Failed to upload voided certificate'); setSubmitting(false); setUploading(false); return; }
        
        await supabase.from('heirway_documents').insert({
          client_id: clientId,
          user_id: userId,
          file_name: `Voided Certificate — ${voidedFile.name}`,
          file_path: filePath,
          file_size: voidedFile.size,
          category: 'voided_certificate',
        });
        attachmentNote = `\n[Voided certificate uploaded: ${voidedFile.name}]`;
        setUploading(false);
      }

      const insertData: any = {
        user_id: userId,
        client_id: clientId,
        request_type: requestType,
        description: desc + attachmentNote,
      };

      if (requestType === 'delete_meeting_minute') {
        insertData.related_minute_id = selectedMinuteId;
      }

      const { error } = await supabase.from('heirway_admin_requests' as any).insert(insertData as any);
      if (error) { toast.error('Failed to submit request'); setSubmitting(false); return; }

      toast.success('Request submitted successfully');
      setDialogOpen(false);
      resetForm();
      loadRequests();

      // Notify super admins
      supabase.functions.invoke('notify-admin-request', {
        body: { request_type: requestType, description: desc },
      }).catch(() => {});
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'in_progress': return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20"><AlertCircle className="w-3 h-3 mr-1" />In Progress</Badge>;
      case 'completed': case 'approved': return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle className="w-3 h-3 mr-1" />{status === 'approved' ? 'Approved' : 'Completed'}</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeLabel = (val: string) => REQUEST_TYPES.find(t => t.value === val)?.label || val;

  const renderFormFields = () => {
    switch (requestType) {
      case 'request_trust':
        return (
          <div className="space-y-4">
            <div>
              <Label>Trust Type *</Label>
              <Select value={trustType} onValueChange={setTrustType}>
                <SelectTrigger className="glass-input"><SelectValue placeholder="Select trust type..." /></SelectTrigger>
                <SelectContent>
                  {TRUST_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Trustees *</Label>
              <div className="space-y-2">
                {trustees.map((t, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input value={t.name} onChange={e => { const u = [...trustees]; u[i].name = e.target.value; setTrustees(u); }} placeholder="Trustee name" className="glass-input flex-1" />
                    <Select value={t.entity_type} onValueChange={(v: 'natural_person' | 'entity') => { const u = [...trustees]; u[i].entity_type = v; setTrustees(u); }}>
                      <SelectTrigger className="glass-input w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="natural_person">Person</SelectItem>
                        <SelectItem value="entity">Entity</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={t.power} onValueChange={(v: 'full' | 'limited') => { const u = [...trustees]; u[i].power = v; setTrustees(u); }}>
                      <SelectTrigger className="glass-input w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">Full</SelectItem>
                        <SelectItem value="limited">Limited</SelectItem>
                      </SelectContent>
                    </Select>
                    {trustees.length > 1 && <Button variant="ghost" size="sm" onClick={() => setTrustees(trustees.filter((_, j) => j !== i))}><X className="w-3.5 h-3.5" /></Button>}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setTrustees([...trustees, { name: '', power: 'full', entity_type: 'natural_person' }])}>
                  <Plus className="w-3 h-3 mr-1" /> Add Trustee
                </Button>
              </div>
            </div>

            <div>
              <Label>Beneficiaries *</Label>
              <div className="space-y-2">
                {beneficiaries.map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input value={b.name} onChange={e => { const u = [...beneficiaries]; u[i].name = e.target.value; setBeneficiaries(u); }} placeholder="Beneficiary name" className="glass-input flex-1" />
                    <Input value={b.units} onChange={e => { const u = [...beneficiaries]; u[i].units = e.target.value; setBeneficiaries(u); }} placeholder="Units" className="glass-input w-24" type="number" />
                    {beneficiaries.length > 1 && <Button variant="ghost" size="sm" onClick={() => setBeneficiaries(beneficiaries.filter((_, j) => j !== i))}><X className="w-3.5 h-3.5" /></Button>}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setBeneficiaries([...beneficiaries, { name: '', units: '' }])}>
                  <Plus className="w-3 h-3 mr-1" /> Add Beneficiary
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox id="has-creator" checked={hasCreator} onCheckedChange={(v) => { setHasCreator(!!v); if (v) setNeedsCreator(false); }} />
                <Label htmlFor="has-creator" className="text-sm cursor-pointer">I have a creator to share</Label>
              </div>
              {hasCreator && (
                <Input value={creatorName} onChange={e => setCreatorName(e.target.value)} placeholder="Creator name" className="glass-input" />
              )}
              <div className="flex items-center gap-2">
                <Checkbox id="needs-creator" checked={needsCreator} onCheckedChange={(v) => { setNeedsCreator(!!v); if (v) setHasCreator(false); }} />
                <Label htmlFor="needs-creator" className="text-sm cursor-pointer">I need Heirway to fulfill a creator</Label>
              </div>
            </div>

            <div>
              <Label>Annual Meeting Date</Label>
              <Input type="date" value={annualMeetingDate} onChange={e => setAnnualMeetingDate(e.target.value)} className="glass-input" />
              <p className="text-[10px] text-muted-foreground mt-1">You'll receive reminders at 90, 60, 30, 24, 10, 3, and 1 day(s) before this date</p>
            </div>

            <div>
              <Label>Additional Notes</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Any additional details..." className="glass-input min-h-[80px]" />
            </div>
          </div>
        );

      case 'issue_certificate_beneficial':
        return (
          <div className="space-y-4">
            {trusts.length > 0 && (
              <div>
                <Label>Trust (optional)</Label>
                <Select value={selectedTrustId} onValueChange={setSelectedTrustId}>
                  <SelectTrigger className="glass-input"><SelectValue placeholder="Select trust..." /></SelectTrigger>
                  <SelectContent>{trusts.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.trust_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Voided Certificate *</Label>
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" onChange={e => setVoidedFile(e.target.files?.[0] || null)} className="hidden" />
              <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/40 hover:bg-muted/30 transition-colors">
                {voidedFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{voidedFile.name}</p>
                      <p className="text-[10px] text-muted-foreground">{(voidedFile.size / 1024).toFixed(0)} KB · Click to change</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Click to upload voided certificate</p>
                    <p className="text-[10px] text-muted-foreground mt-1">PDF, DOC, JPG, PNG</p>
                  </>
                )}
              </div>
            </div>
            <div>
              <Label>Additional Notes</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Any additional details..." className="glass-input min-h-[80px]" />
            </div>
          </div>
        );

      case 'issue_certificate_capital':
        return (
          <div className="space-y-4">
            {trusts.length > 0 && (
              <div>
                <Label>Trust (optional)</Label>
                <Select value={selectedTrustId} onValueChange={setSelectedTrustId}>
                  <SelectTrigger className="glass-input"><SelectValue placeholder="Select trust..." /></SelectTrigger>
                  <SelectContent>{trusts.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.trust_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Additional Notes</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Any additional details..." className="glass-input min-h-[80px]" />
            </div>
          </div>
        );

      case 'addition_trustee':
        return (
          <div className="space-y-4">
            {trusts.length > 0 && (
              <div>
                <Label>Trust (optional)</Label>
                <Select value={selectedTrustId} onValueChange={setSelectedTrustId}>
                  <SelectTrigger className="glass-input"><SelectValue placeholder="Select trust..." /></SelectTrigger>
                  <SelectContent>{trusts.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.trust_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Trustee Name *</Label>
              <Input value={addTrusteeName} onChange={e => setAddTrusteeName(e.target.value)} placeholder="Full name or entity name" className="glass-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={addTrusteeEntityType} onValueChange={(v: 'natural_person' | 'entity') => setAddTrusteeEntityType(v)}>
                  <SelectTrigger className="glass-input"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="natural_person">Natural Person</SelectItem>
                    <SelectItem value="entity">Entity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Power Level</Label>
                <Select value={addTrusteePower} onValueChange={(v: 'full' | 'limited') => setAddTrusteePower(v)}>
                  <SelectTrigger className="glass-input"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Power</SelectItem>
                    <SelectItem value="limited">Limited Power</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Additional Notes</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Any additional details..." className="glass-input min-h-[80px]" />
            </div>
          </div>
        );

      case 'trustee_resignation':
        return (
          <div className="space-y-4">
            {trusts.length > 0 && (
              <div>
                <Label>Trust (optional)</Label>
                <Select value={selectedTrustId} onValueChange={setSelectedTrustId}>
                  <SelectTrigger className="glass-input"><SelectValue placeholder="Select trust..." /></SelectTrigger>
                  <SelectContent>{trusts.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.trust_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Details *</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Who is resigning and any relevant details..." className="glass-input min-h-[100px]" />
            </div>
          </div>
        );

      case 'updated_certificate_trust':
        return (
          <div className="space-y-4">
            {trusts.length > 0 && (
              <div>
                <Label>Trust (optional)</Label>
                <Select value={selectedTrustId} onValueChange={setSelectedTrustId}>
                  <SelectTrigger className="glass-input"><SelectValue placeholder="Select trust..." /></SelectTrigger>
                  <SelectContent>{trusts.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.trust_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Additional Notes</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Any additional details..." className="glass-input min-h-[80px]" />
            </div>
          </div>
        );

      case 'delete_meeting_minute':
        return (
          <div className="space-y-4">
            <div>
              <Label>Select Meeting Minute *</Label>
              <Select value={selectedMinuteId} onValueChange={setSelectedMinuteId}>
                <SelectTrigger className="glass-input"><SelectValue placeholder="Select a meeting minute..." /></SelectTrigger>
                <SelectContent>
                  {minutes.map((m: any) => (
                    <SelectItem key={m.id} value={m.id}>
                      #{m.minute_number || '—'} — {m.title} ({new Date(m.meeting_date).toLocaleDateString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reason (optional)</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Reason for deletion..." className="glass-input min-h-[80px]" />
            </div>
          </div>
        );

      case 'other':
        return (
          <div>
            <Label>Description *</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe your request in detail..." className="glass-input min-h-[100px]" />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <GoldHeaderCard
        title="Administrative Requests"
        icon={<Settings className="w-4 h-4 text-primary" />}
        description="Submit trustee changes, certificate requests, and more"
        headerAction={
          <Button size="sm" onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-gradient-to-r from-primary to-accent text-primary-foreground whitespace-nowrap text-xs sm:text-sm">
            <Plus className="w-3.5 h-3.5 mr-1 shrink-0" /> <span className="hidden sm:inline">Submit a Request / Ticket</span><span className="sm:hidden">New Request</span>
          </Button>
        }
      >
        {requests.length === 0 ? (
          <div className="text-center py-8">
            <Settings className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No requests submitted yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {requests.map((req: any) => (
              <div key={req.id} className="flex items-start justify-between p-3 rounded-lg bg-muted/30 border border-border/40">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/5 border-primary/20 text-primary font-mono">
                      TKT-{String(req.ticket_number).padStart(4, '0')}
                    </Badge>
                    <p className="text-sm font-medium text-foreground">{getTypeLabel(req.request_type)}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{req.description}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(req.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex-shrink-0 ml-3">
                  {getStatusBadge(req.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </GoldHeaderCard>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-panel border-primary/20 max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submit Request</DialogTitle>
            <DialogDescription>Request administrative changes to your trust</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Request Type</Label>
              <Select value={requestType} onValueChange={v => { setRequestType(v); setDescription(''); setSelectedMinuteId(''); setSelectedTrustId(''); }}>
                <SelectTrigger className="glass-input"><SelectValue /></SelectTrigger>
                <SelectContent>{REQUEST_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {renderFormFields()}

            <Button onClick={handleSubmit} disabled={submitting || uploading} className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground">
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : 'Submit Request / Ticket'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
