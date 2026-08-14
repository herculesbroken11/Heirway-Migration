import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { HeirwayLayout } from '@/components/heirway/HeirwayLayout';
import { useForceLightMode } from '@/hooks/useForceLightMode';
import { useClientProfile } from '@/hooks/useClientProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Save, Loader2, Eye, EyeOff, Shield, Users, KeyRound, Heart, FileText, Upload, Download, X } from 'lucide-react';
import { toast } from 'sonner';

const RELATIONSHIP_TYPES = [
  'Accountant / CPA', 'Best Friend', 'Business Advisor', 'Business Attorney',
  'Business Partner', 'Chiropractor', 'Gardner', 'Health Insurance',
  'Home-Owner Insurance', 'Housekeeper', 'Investment Advisor',
  'Life Insurance Agent', 'Mechanic', 'Personal Attorney', 'Storage',
  'Tennis Partner', 'Therapist', 'Family Member', 'Spouse', 'Child',
  'Sibling', 'Parent', 'Neighbor', 'Clergy', 'Doctor', 'Dentist', 'Other',
];

interface Contact {
  id?: string;
  first_name: string;
  last_name: string;
  relationship: string;
  phone: string;
  email: string;
  notes: string;
}

interface Account {
  id?: string;
  account_name: string;
  website_url: string;
  username: string;
  password: string;
  pin: string;
  notes: string;
  safety_instructions: string;
}

interface VaultData {
  id?: string;
  funeral_instructions: string;
  healthcare_directives: string;
  power_of_attorney: string;
  hipaa_authorization: string;
  additional_notes: string;
}

const emptyContact: Contact = { first_name: '', last_name: '', relationship: '', phone: '', email: '', notes: '' };
const emptyAccount: Account = { account_name: '', website_url: '', username: '', password: '', pin: '', notes: '', safety_instructions: '' };

function LegalDocSection({ title, description, category, userId, clientId, notes, onNotesChange }: {
  title: string; description: string; category: string; userId?: string; clientId?: string;
  notes: string; onNotesChange: (v: string) => void;
}) {
  const [files, setFiles] = useState<{ id: string; file_name: string; file_path: string; created_at: string }[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!userId || !clientId) return;
    supabase.from('heirway_documents').select('id, file_name, file_path, created_at')
      .eq('client_id', clientId).eq('category', `vault_${category}`)
      .order('created_at').then(({ data }) => { if (data) setFiles(data); });
  }, [userId, clientId, category]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId || !clientId) return;
    if (file.size > 50 * 1024 * 1024) { toast.error('File must be under 50MB'); return; }
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${userId}/${category}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from('client-documents').upload(path, file);
    if (uploadErr) { toast.error('Upload failed'); setUploading(false); return; }
    const { data: doc } = await supabase.from('heirway_documents')
      .insert({ client_id: clientId, user_id: userId, file_name: file.name, file_path: path, file_size: file.size, category: `vault_${category}` })
      .select('id, file_name, file_path, created_at').single();
    if (doc) setFiles(prev => [...prev, doc]);
    toast.success('Document uploaded');
    setUploading(false);
    e.target.value = '';
  };

  const handleDelete = async (docId: string, filePath: string) => {
    await supabase.storage.from('client-documents').remove([filePath]);
    await supabase.from('heirway_documents').delete().eq('id', docId);
    setFiles(prev => prev.filter(f => f.id !== docId));
    toast.success('Document removed');
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    const { data } = await supabase.storage.from('client-documents').createSignedUrl(filePath, 60);
    if (data?.signedUrl) {
      const a = document.createElement('a'); a.href = data.signedUrl; a.download = fileName; a.click();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Uploaded files */}
        {files.length > 0 && (
          <div className="space-y-2">
            {files.map(f => (
              <div key={f.id} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/30 text-sm">
                <FileText className="w-4 h-4 text-primary shrink-0" />
                <span className="flex-1 truncate text-foreground">{f.file_name}</span>
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => handleDownload(f.file_path, f.file_name)}>
                  <Download className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => handleDelete(f.id, f.file_path)}>
                  <X className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Upload button */}
        <div>
          <Label htmlFor={`upload-${category}`} className="cursor-pointer">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-colors w-fit text-sm text-muted-foreground">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? 'Uploading...' : 'Upload Document'}
            </div>
          </Label>
          <input id={`upload-${category}`} type="file" className="hidden" accept=".pdf,.docx,.doc,.jpg,.jpeg,.png" onChange={handleUpload} disabled={uploading} />
        </div>

        {/* Notes */}
        <div>
          <Label className="text-xs text-muted-foreground">Notes (optional)</Label>
          <Textarea className="mt-1 min-h-[80px]" placeholder={`Any notes about your ${title.toLowerCase()}...`} value={notes} onChange={e => onNotesChange(e.target.value)} />
        </div>
      </CardContent>
    </Card>
  );
}

export default function HeirwaySuccessorVault() {
  useForceLightMode();
  const { user, clientId, loading: profileLoading } = useClientProfile();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vault, setVault] = useState<VaultData>({
    funeral_instructions: '', healthcare_directives: '', power_of_attorney: '',
    hipaa_authorization: '', additional_notes: '',
  });
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({});

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Get or create vault
    let { data: vaultData } = await supabase
      .from('successor_vault')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!vaultData && clientId) {
      const { data: newVault } = await supabase
        .from('successor_vault')
        .insert({ user_id: user.id, client_id: clientId })
        .select()
        .single();
      vaultData = newVault;
    }

    if (vaultData) {
      setVault({
        id: vaultData.id,
        funeral_instructions: vaultData.funeral_instructions || '',
        healthcare_directives: vaultData.healthcare_directives || '',
        power_of_attorney: vaultData.power_of_attorney || '',
        hipaa_authorization: vaultData.hipaa_authorization || '',
        additional_notes: vaultData.additional_notes || '',
      });

      const { data: contactsData } = await supabase
        .from('successor_vault_contacts')
        .select('*')
        .eq('vault_id', vaultData.id)
        .order('created_at');
      if (contactsData) setContacts(contactsData as Contact[]);

      const { data: accountsData } = await supabase
        .from('successor_vault_accounts')
        .select('*')
        .eq('vault_id', vaultData.id)
        .order('created_at');
      if (accountsData) setAccounts(accountsData as Account[]);
    }

    setLoading(false);
  }, [user, clientId]);

  useEffect(() => {
    if (!profileLoading && user) fetchData();
  }, [profileLoading, user, fetchData]);

  const saveAll = async () => {
    if (!vault.id || !user) return;
    setSaving(true);
    try {
      // Save vault text fields
      await supabase.from('successor_vault').update({
        funeral_instructions: vault.funeral_instructions,
        healthcare_directives: vault.healthcare_directives,
        power_of_attorney: vault.power_of_attorney,
        hipaa_authorization: vault.hipaa_authorization,
        additional_notes: vault.additional_notes,
      }).eq('id', vault.id);

      // Sync contacts: delete removed, upsert existing
      const existingContactIds = contacts.filter(c => c.id).map(c => c.id!);
      // Delete contacts not in current list
      if (existingContactIds.length > 0) {
        await supabase.from('successor_vault_contacts')
          .delete()
          .eq('vault_id', vault.id)
          .not('id', 'in', `(${existingContactIds.join(',')})`);
      } else {
        await supabase.from('successor_vault_contacts')
          .delete()
          .eq('vault_id', vault.id);
      }

      for (const contact of contacts) {
        if (contact.id) {
          await supabase.from('successor_vault_contacts')
            .update({ first_name: contact.first_name, last_name: contact.last_name, relationship: contact.relationship, phone: contact.phone, email: contact.email, notes: contact.notes })
            .eq('id', contact.id);
        } else {
          const { data } = await supabase.from('successor_vault_contacts')
            .insert({ vault_id: vault.id, user_id: user.id, first_name: contact.first_name, last_name: contact.last_name, relationship: contact.relationship, phone: contact.phone, email: contact.email, notes: contact.notes })
            .select()
            .single();
          if (data) contact.id = data.id;
        }
      }

      // Sync accounts
      const existingAccountIds = accounts.filter(a => a.id).map(a => a.id!);
      if (existingAccountIds.length > 0) {
        await supabase.from('successor_vault_accounts')
          .delete()
          .eq('vault_id', vault.id)
          .not('id', 'in', `(${existingAccountIds.join(',')})`);
      } else {
        await supabase.from('successor_vault_accounts')
          .delete()
          .eq('vault_id', vault.id);
      }

      for (const account of accounts) {
        if (account.id) {
          await supabase.from('successor_vault_accounts')
            .update({ account_name: account.account_name, website_url: account.website_url, username: account.username, password: account.password, pin: account.pin, notes: account.notes, safety_instructions: account.safety_instructions })
            .eq('id', account.id);
        } else {
          const { data } = await supabase.from('successor_vault_accounts')
            .insert({ vault_id: vault.id, user_id: user.id, account_name: account.account_name, website_url: account.website_url, username: account.username, password: account.password, pin: account.pin, notes: account.notes, safety_instructions: account.safety_instructions })
            .select()
            .single();
          if (data) account.id = data.id;
        }
      }

      toast.success('Successor Vault saved successfully');
    } catch (err) {
      toast.error('Error saving vault data');
    }
    setSaving(false);
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Successor Vault</h1>
              <p className="text-sm text-muted-foreground">A secure place to store critical information for your successors</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-3 bg-muted/50 rounded-lg p-3 border border-border">
            This vault is designed to help your loved ones and trustees manage important affairs in the event of your incapacity or passing. All information is securely stored and accessible only to you.
          </p>
        </div>

        <Tabs defaultValue="contacts" className="space-y-6">
          <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full h-auto gap-1">
            <TabsTrigger value="contacts" className="text-xs sm:text-sm gap-1"><Users className="w-3.5 h-3.5 hidden sm:block" /> Contacts</TabsTrigger>
            <TabsTrigger value="accounts" className="text-xs sm:text-sm gap-1"><KeyRound className="w-3.5 h-3.5 hidden sm:block" /> Accounts</TabsTrigger>
            <TabsTrigger value="funeral" className="text-xs sm:text-sm gap-1"><Heart className="w-3.5 h-3.5 hidden sm:block" /> Funeral</TabsTrigger>
            <TabsTrigger value="legal" className="text-xs sm:text-sm gap-1"><FileText className="w-3.5 h-3.5 hidden sm:block" /> Legal Directives</TabsTrigger>
            <TabsTrigger value="notes" className="text-xs sm:text-sm gap-1"><FileText className="w-3.5 h-3.5 hidden sm:block" /> Notes</TabsTrigger>
          </TabsList>

          {/* CONTACTS TAB */}
          <TabsContent value="contacts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Important Contacts</CardTitle>
                <CardDescription>People your successors should know about — attorneys, advisors, friends, service providers, etc.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {contacts.map((contact, i) => (
                  <div key={i} className="border border-border rounded-lg p-4 space-y-3 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Contact {i + 1}</span>
                      <Button variant="ghost" size="sm" onClick={() => setContacts(contacts.filter((_, j) => j !== i))}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div><Label className="text-xs">First Name</Label><Input className="mt-1" value={contact.first_name} onChange={e => { const u = [...contacts]; u[i] = { ...u[i], first_name: e.target.value }; setContacts(u); }} /></div>
                      <div><Label className="text-xs">Last Name</Label><Input className="mt-1" value={contact.last_name} onChange={e => { const u = [...contacts]; u[i] = { ...u[i], last_name: e.target.value }; setContacts(u); }} /></div>
                      <div>
                        <Label className="text-xs">Relationship</Label>
                        <Select value={contact.relationship} onValueChange={v => { const u = [...contacts]; u[i] = { ...u[i], relationship: v }; setContacts(u); }}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>
                            {RELATIONSHIP_TYPES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label className="text-xs">Phone</Label><Input type="tel" className="mt-1" value={contact.phone} onChange={e => { const u = [...contacts]; u[i] = { ...u[i], phone: e.target.value }; setContacts(u); }} /></div>
                      <div className="sm:col-span-2"><Label className="text-xs">Email</Label><Input type="email" className="mt-1" value={contact.email} onChange={e => { const u = [...contacts]; u[i] = { ...u[i], email: e.target.value }; setContacts(u); }} /></div>
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setContacts([...contacts, { ...emptyContact }])}>
                  <Plus className="w-4 h-4 mr-1" /> Add Contact
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ACCOUNTS TAB */}
          <TabsContent value="accounts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Important Accounts & Credentials</CardTitle>
                <CardDescription>Bank accounts, website logins, PIN numbers, and other critical access info. All data is securely stored.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {accounts.map((account, i) => (
                  <div key={i} className="border border-border rounded-lg p-4 space-y-3 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Account {i + 1}</span>
                      <Button variant="ghost" size="sm" onClick={() => setAccounts(accounts.filter((_, j) => j !== i))}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div><Label className="text-xs">Account Name</Label><Input placeholder="e.g. Chase Bank, Netflix" className="mt-1" value={account.account_name} onChange={e => { const u = [...accounts]; u[i] = { ...u[i], account_name: e.target.value }; setAccounts(u); }} /></div>
                      <div><Label className="text-xs">Website URL</Label><Input placeholder="https://..." className="mt-1" value={account.website_url} onChange={e => { const u = [...accounts]; u[i] = { ...u[i], website_url: e.target.value }; setAccounts(u); }} /></div>
                      <div><Label className="text-xs">Username</Label><Input className="mt-1" value={account.username} onChange={e => { const u = [...accounts]; u[i] = { ...u[i], username: e.target.value }; setAccounts(u); }} /></div>
                      <div>
                        <Label className="text-xs">Password</Label>
                        <div className="relative mt-1">
                          <Input type={showPasswords[i] ? 'text' : 'password'} value={account.password} onChange={e => { const u = [...accounts]; u[i] = { ...u[i], password: e.target.value }; setAccounts(u); }} className="pr-10" />
                          <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPasswords(p => ({ ...p, [i]: !p[i] }))}>
                            {showPasswords[i] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                      <div><Label className="text-xs">PIN Number</Label><Input type={showPasswords[i] ? 'text' : 'password'} className="mt-1" value={account.pin} onChange={e => { const u = [...accounts]; u[i] = { ...u[i], pin: e.target.value }; setAccounts(u); }} /></div>
                      <div><Label className="text-xs">Notes</Label><Input className="mt-1" value={account.notes} onChange={e => { const u = [...accounts]; u[i] = { ...u[i], notes: e.target.value }; setAccounts(u); }} /></div>
                      <div className="sm:col-span-2">
                        <Label className="text-xs text-primary font-medium">🔐 Safety Instructions</Label>
                        <p className="text-[11px] text-muted-foreground mb-1">Instead of storing credentials here, describe where your successor can find them (e.g. "In the fireproof safe, top shelf" or "Written in the blue notebook in my desk drawer")</p>
                        <Textarea className="mt-1 min-h-[60px]" placeholder="Where to find this login info..." value={account.safety_instructions} onChange={e => { const u = [...accounts]; u[i] = { ...u[i], safety_instructions: e.target.value }; setAccounts(u); }} />
                      </div>
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setAccounts([...accounts, { ...emptyAccount }])}>
                  <Plus className="w-4 h-4 mr-1" /> Add Account
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FUNERAL TAB */}
          <TabsContent value="funeral" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Funeral Instructions</CardTitle>
                <CardDescription>Outline your wishes for burial, cremation, memorial service, or any specific arrangements.</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  className="min-h-[250px]"
                  placeholder="Describe your funeral wishes, preferred funeral home, burial vs cremation preferences, music, readings, special requests..."
                  value={vault.funeral_instructions}
                  onChange={e => setVault(v => ({ ...v, funeral_instructions: e.target.value }))}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* LEGAL DIRECTIVES TAB */}
          <TabsContent value="legal" className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-3 border border-border text-sm text-muted-foreground">
              Upload your legal directive documents here. Supported formats: PDF, DOCX, JPG, PNG (max 50MB each).
            </div>

            {/* Healthcare Directives */}
            <LegalDocSection
              title="Healthcare Directives"
              description="Also known as a Living Will — upload your document regarding medical treatment wishes."
              category="healthcare_directives"
              userId={user?.id}
              clientId={clientId}
              notes={vault.healthcare_directives}
              onNotesChange={v => setVault(vlt => ({ ...vlt, healthcare_directives: v }))}
            />

            {/* Power of Attorney */}
            <LegalDocSection
              title="Power of Attorney"
              description="Upload your POA document designating who makes financial and legal decisions on your behalf."
              category="power_of_attorney"
              userId={user?.id}
              clientId={clientId}
              notes={vault.power_of_attorney}
              onNotesChange={v => setVault(vlt => ({ ...vlt, power_of_attorney: v }))}
            />

            {/* HIPAA Privacy Authorization */}
            <LegalDocSection
              title="HIPAA Privacy Authorization"
              description="Upload your HIPAA authorization specifying who can access your health information."
              category="hipaa_authorization"
              userId={user?.id}
              clientId={clientId}
              notes={vault.hipaa_authorization}
              onNotesChange={v => setVault(vlt => ({ ...vlt, hipaa_authorization: v }))}
            />
          </TabsContent>

          {/* NOTES TAB */}
          <TabsContent value="notes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Additional Notes</CardTitle>
                <CardDescription>Any other information your successors should know — safe combinations, storage units, passwords to physical items, etc.</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  className="min-h-[250px]"
                  placeholder="Any additional important information for your successors..."
                  value={vault.additional_notes}
                  onChange={e => setVault(v => ({ ...v, additional_notes: e.target.value }))}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex justify-end mt-8 sticky bottom-4">
          <Button onClick={saveAll} disabled={saving} size="lg" className="shadow-lg">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Vault
          </Button>
        </div>
      </div>
    </HeirwayLayout>
  );
}
