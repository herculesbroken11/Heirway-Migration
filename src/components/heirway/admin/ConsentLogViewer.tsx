import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, FileCheck, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConsentEntry {
  id: string;
  user_id: string | null;
  email: string | null;
  full_name: string | null;
  consent_type: string;
  form_context: string;
  privacy_policy_version: string | null;
  terms_version: string | null;
  created_at: string;
}

const CONTEXT_LABELS: Record<string, string> = {
  get_started_form: 'Get Started Form',
  signup: 'Account Signup',
  intake_submission: 'Intake Submission',
  unknown: 'Unknown',
};

export default function ConsentLogViewer() {
  const [entries, setEntries] = useState<ConsentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    const { data } = await supabase
      .from('consent_log' as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    setEntries((data as any as ConsentEntry[]) || []);
    setLoading(false);
  };

  const filtered = entries.filter(e => {
    const q = search.toLowerCase();
    return !q || (e.email?.toLowerCase().includes(q)) || (e.full_name?.toLowerCase().includes(q)) || (e.form_context?.toLowerCase().includes(q));
  });

  const handleExport = () => {
    const headers = ['Date', 'Full Name', 'Email', 'Form Context', 'Consent Type', 'Privacy Policy Version', 'Terms Version'];
    const rows = filtered.map(e => [
      new Date(e.created_at).toLocaleString(),
      e.full_name || '',
      e.email || '',
      CONTEXT_LABELS[e.form_context] || e.form_context,
      e.consent_type,
      e.privacy_policy_version || '',
      e.terms_version || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consent-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 glass-input"
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} consent record{filtered.length !== 1 ? 's' : ''}</p>

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No consent records found.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(entry => (
            <Card key={entry.id} className="glass-panel">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileCheck className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{entry.full_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground truncate">{entry.email || 'No email'}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <Badge variant="outline" className="text-[10px]">
                      {CONTEXT_LABELS[entry.form_context] || entry.form_context}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(entry.created_at).toLocaleDateString()} {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex gap-3 text-[10px] text-muted-foreground">
                  <span>Privacy Policy: {entry.privacy_policy_version || 'N/A'}</span>
                  <span>Terms: {entry.terms_version || 'N/A'}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
