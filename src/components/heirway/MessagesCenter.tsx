import { useEffect, useMemo, useState } from 'react';
import { Mail, RefreshCw, Send } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface ReplyRow {
  id: string;
  sender_role: string;
  sender_name: string | null;
  body: string;
  created_at: string;
}

interface ThreadRow {
  id: string;
  title: string;
  contact_full_name: string;
  contact_email: string;
  status: string;
  last_message_at: string;
  message_replies?: ReplyRow[];
}

export default function MessagesCenter() {
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedId) || threads[0] || null,
    [threads, selectedId],
  );

  const loadThreads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('message_threads' as any)
      .select('id, title, contact_full_name, contact_email, status, last_message_at, message_replies(id, sender_role, sender_name, body, created_at)')
      .order('last_message_at', { ascending: false });

    if (error) {
      toast.error('Unable to load messages.');
      setThreads([]);
    } else {
      const rows = (((data as unknown) as ThreadRow[]) || []).map((thread) => ({
        ...thread,
        message_replies: [...(thread.message_replies || [])].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        ),
      }));
      setThreads(rows);
      setSelectedId((current) => current || rows[0]?.id || null);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadThreads();
  }, []);

  const handleSend = async () => {
    const body = reply.trim();
    if (!selectedThread || body.length === 0) return;
    if (body.length > 5000) {
      toast.error('Please keep messages under 5,000 characters.');
      return;
    }

    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('message_replies' as any).insert({
      thread_id: selectedThread.id,
      sender_user_id: user?.id,
      sender_role: 'client',
      sender_name: user?.user_metadata?.full_name || user?.email || 'Client',
      body,
    } as any);

    if (error) {
      toast.error('Could not send your message.');
    } else {
      setReply('');
      toast.success('Message sent.');
      await loadThreads();
    }
    setSending(false);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <Card className="glass-panel overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-border p-4">
            <div>
              <h2 className="font-display text-lg font-semibold">Messages</h2>
              <p className="text-xs text-muted-foreground">Team conversations</p>
            </div>
            <Button variant="ghost" size="icon" onClick={loadThreads} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          {loading ? (
            <p className="p-4 text-sm text-muted-foreground">Loading...</p>
          ) : threads.length === 0 ? (
            <div className="p-6 text-center space-y-4">
              <Mail className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Messages from the Heirway team will appear here.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => (window.location.href = '/heirway/dashboard#requests')}
              >
                Submit a Ticket or Request
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {threads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => setSelectedId(thread.id)}
                  className={`w-full p-4 text-left transition-colors hover:bg-muted/40 ${selectedThread?.id === thread.id ? 'bg-primary/10' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{thread.title}</p>
                    <Badge variant="outline" className="text-[10px] capitalize">{thread.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(thread.last_message_at).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-panel min-h-[520px]">
        <CardContent className="flex h-full min-h-[520px] flex-col p-4 md:p-6">
          {!selectedThread ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Select a message.</div>
          ) : (
            <>
              <div className="border-b border-border pb-4">
                <h1 className="font-display text-xl font-semibold">{selectedThread.title}</h1>
                <p className="text-sm text-muted-foreground">{selectedThread.contact_email}</p>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto py-4">
                {(selectedThread.message_replies || []).map((item) => {
                  const fromAdmin = item.sender_role === 'admin';
                  return (
                    <div key={item.id} className={`flex ${fromAdmin ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[85%] rounded-lg border p-3 ${fromAdmin ? 'bg-muted/40' : 'bg-primary/10 border-primary/20'}`}>
                        <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                          <span>{fromAdmin ? 'Heirway Team' : item.sender_name || 'You'}</span>
                          <span>{new Date(item.created_at).toLocaleString()}</span>
                        </div>
                        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{item.body}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-border pt-4">
                <Textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Write a reply..."
                  className="glass-input min-h-[110px]"
                  maxLength={5000}
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">{reply.length}/5000</span>
                  <Button onClick={handleSend} disabled={sending || !reply.trim()}>
                    <Send className="w-4 h-4" />
                    {sending ? 'Sending...' : 'Send'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
