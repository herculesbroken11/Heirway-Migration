import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search, Send } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface MessageReply {
  id: string;
  sender_role: string;
  sender_name: string | null;
  body: string;
  created_at: string;
}

interface ContactMessageEntry {
  id: string;
  full_name: string;
  email: string;
  message: string;
  status: string;
  created_at: string;
  message_thread_id: string | null;
  message_threads?: {
    id: string;
    status: string;
    last_message_at: string;
    message_replies?: MessageReply[];
  } | null;
}

export default function ContactMessagesViewer() {
  const [entries, setEntries] = useState<ContactMessageEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [sendingId, setSendingId] = useState<string | null>(null);

  const loadEntries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('contact_messages')
      .select('id, full_name, email, message, status, created_at, message_thread_id')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      toast.error('Unable to load contact messages.');
      setEntries([]);
    } else {
      const contactEntries = (((data as unknown) as ContactMessageEntry[]) || []);
      const threadIds = contactEntries
        .map((entry) => entry.message_thread_id)
        .filter((id): id is string => Boolean(id));

      if (threadIds.length === 0) {
        setEntries(contactEntries);
        setLoading(false);
        return;
      }

      const { data: threadsData, error: threadsError } = await supabase
        .from('message_threads' as any)
        .select('id, status, last_message_at, message_replies(id, sender_role, sender_name, body, created_at)')
        .in('id', threadIds);

      if (threadsError) {
        toast.error('Unable to load contact message threads.');
        setEntries(contactEntries);
      } else {
        const threadsById = new Map(
          ((((threadsData as unknown) as NonNullable<ContactMessageEntry['message_threads']>[]) || []).map((thread) => [
            thread.id,
            {
              ...thread,
              message_replies: [...(thread.message_replies || [])].sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
              ),
            },
          ])),
        );

        setEntries(contactEntries.map((entry) => ({
          ...entry,
          message_threads: entry.message_thread_id ? threadsById.get(entry.message_thread_id) || null : null,
        })));
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadEntries();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (!q) return true;
      return (
        entry.full_name.toLowerCase().includes(q) ||
        entry.email.toLowerCase().includes(q) ||
        entry.message.toLowerCase().includes(q)
      );
    });
  }, [entries, search]);

  const handleReply = async (entry: ContactMessageEntry) => {
    const threadId = entry.message_thread_id || entry.message_threads?.id;
    const body = (replyText[entry.id] || '').trim();
    if (!threadId || !body) return;
    if (body.length > 5000) {
      toast.error('Please keep replies under 5,000 characters.');
      return;
    }

    setSendingId(entry.id);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('message_replies' as any).insert({
      thread_id: threadId,
      sender_user_id: user?.id,
      sender_role: 'admin',
      sender_name: user?.user_metadata?.full_name || 'Heirway Team',
      body,
    } as any);

    if (error) {
      toast.error('Could not send reply.');
      setSendingId(null);
      return;
    }

    const { error: emailError } = await supabase.functions.invoke('send-transactional-email', {
      body: {
        template: 'message_response',
        to: entry.email,
        props: {
          fullName: entry.full_name,
          loginUrl: `${window.location.origin}/login?mode=login&redirect=/heirway/messages`,
        },
      },
    });

    if (emailError) {
      console.error('Message response email error:', emailError);
      toast.warning('Reply saved, but the notification email could not be sent.');
    }

    setReplyText((prev) => ({ ...prev, [entry.id]: '' }));
    if (!emailError) {
      toast.success('Reply sent. The prospect will be notified to log in.');
    }
    await loadEntries();
    setSendingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contact messages..."
            className="pl-10 glass-input"
          />
        </div>
        <Button variant="outline" size="icon" onClick={loadEntries} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} message{filtered.length !== 1 ? 's' : ''}</p>

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No contact messages found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((entry) => {
            const replies = entry.message_threads?.message_replies || [];
            const threadStatus = entry.message_threads?.status || entry.status;
            return (
              <Card key={entry.id} className="glass-panel">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Send className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-medium truncate">{entry.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{entry.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <Badge variant="outline" className="text-[10px] capitalize">{threadStatus}</Badge>
                      <span className="text-[10px] text-muted-foreground text-right">
                        {new Date(entry.created_at).toLocaleDateString()} {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
                    {replies.map((reply) => (
                      <div key={reply.id} className="border-b border-border/60 pb-2 last:border-0 last:pb-0">
                        <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                          <span>{reply.sender_role === 'admin' ? 'Heirway Team' : reply.sender_name || entry.full_name}</span>
                          <span>{new Date(reply.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap break-words">{reply.body}</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Textarea
                      value={replyText[entry.id] || ''}
                      onChange={(e) => setReplyText((prev) => ({ ...prev, [entry.id]: e.target.value }))}
                      placeholder="Reply to this inquiry..."
                      className="glass-input min-h-[100px]"
                      maxLength={5000}
                    />
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-muted-foreground">{(replyText[entry.id] || '').length}/5000</span>
                      <Button onClick={() => handleReply(entry)} disabled={sendingId === entry.id || !(replyText[entry.id] || '').trim()}>
                        <Send className="w-4 h-4" />
                        {sendingId === entry.id ? 'Sending...' : 'Send Reply'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
