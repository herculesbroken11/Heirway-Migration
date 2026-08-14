import { useEffect, useState } from 'react';
import { Loader2, MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { GoldHeaderCard } from '@/components/ui/gold-header-card';

interface ProspectMessengerProps {
  prospectId: string;
  prospectName: string;
  prospectEmail: string | null;
}

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
  status: string;
  last_message_at: string;
  created_at: string;
  message_replies?: ReplyRow[];
}

export function ProspectMessenger({ prospectId, prospectName, prospectEmail }: ProspectMessengerProps) {
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [subject, setSubject] = useState('');
  const [sending, setSending] = useState(false);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replyingId, setReplyingId] = useState<string | null>(null);

  const loadThreads = async () => {
    if (!prospectEmail) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('message_threads' as any)
      .select('id, title, status, last_message_at, created_at, message_replies(id, sender_role, sender_name, body, created_at)')
      .ilike('contact_email', prospectEmail)
      .order('last_message_at', { ascending: false });

    if (error) {
      console.error('Load prospect threads error:', error);
      toast.error('Unable to load messages.');
      setThreads([]);
    } else {
      const rows = (((data as unknown) as ThreadRow[]) || []).map((t) => ({
        ...t,
        message_replies: [...(t.message_replies || [])].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        ),
      }));
      setThreads(rows);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadThreads();
  }, [prospectEmail]);

  const sendNotificationEmail = async () => {
    if (!prospectEmail) return;
    const { error } = await supabase.functions.invoke('send-transactional-email', {
      body: {
        template: 'message_response',
        to: prospectEmail,
        props: {
          fullName: prospectName,
          loginUrl: `${window.location.origin}/login?mode=login&redirect=/heirway/messages`,
        },
      },
    });
    if (error) {
      console.error('Notification email error:', error);
      toast.warning('Message saved, but the notification email could not be sent.');
    }
  };

  const handleStartThread = async () => {
    const trimmedBody = body.trim();
    const trimmedSubject = subject.trim() || `Message from Heirway Team`;
    if (!prospectEmail) {
      toast.error('Prospect has no email on file.');
      return;
    }
    if (!trimmedBody) return;
    if (trimmedBody.length > 5000) {
      toast.error('Please keep messages under 5,000 characters.');
      return;
    }

    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();
    const adminName = user?.user_metadata?.full_name || 'Heirway Team';

    const { data: threadData, error: threadError } = await supabase
      .from('message_threads' as any)
      .insert({
        title: trimmedSubject,
        contact_full_name: prospectName,
        contact_email: prospectEmail,
        status: 'responded',
      } as any)
      .select('id')
      .single();

    if (threadError || !threadData) {
      console.error('Thread create error:', threadError);
      toast.error('Could not start conversation.');
      setSending(false);
      return;
    }

    const threadId = (threadData as any).id;

    const { error: participantError } = await supabase
      .from('message_thread_participants' as any)
      .insert({
        thread_id: threadId,
        email: prospectEmail,
        role: 'client',
      } as any);

    if (participantError) {
      console.error('Participant create error:', participantError);
    }

    const { error: replyError } = await supabase
      .from('message_replies' as any)
      .insert({
        thread_id: threadId,
        sender_user_id: user?.id,
        sender_role: 'admin',
        sender_name: adminName,
        body: trimmedBody,
      } as any);

    if (replyError) {
      console.error('Reply create error:', replyError);
      toast.error('Conversation started but message failed to send.');
      setSending(false);
      return;
    }

    await sendNotificationEmail();
    toast.success('Message sent. The prospect will be notified.');
    setBody('');
    setSubject('');
    await loadThreads();
    setSending(false);
  };

  const handleReply = async (threadId: string) => {
    const text = (replyText[threadId] || '').trim();
    if (!text) return;
    if (text.length > 5000) {
      toast.error('Please keep messages under 5,000 characters.');
      return;
    }
    setReplyingId(threadId);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('message_replies' as any).insert({
      thread_id: threadId,
      sender_user_id: user?.id,
      sender_role: 'admin',
      sender_name: user?.user_metadata?.full_name || 'Heirway Team',
      body: text,
    } as any);

    if (error) {
      console.error('Reply error:', error);
      toast.error('Could not send reply.');
      setReplyingId(null);
      return;
    }

    await sendNotificationEmail();
    toast.success('Reply sent.');
    setReplyText((prev) => ({ ...prev, [threadId]: '' }));
    await loadThreads();
    setReplyingId(null);
  };

  if (!prospectEmail) {
    return (
      <GoldHeaderCard
        title="Messages"
        description="Send messages to this prospect"
        icon={<MessageSquare className="w-4 h-4 text-primary" />}
        className="animate-fade-in"
      >
        <p className="text-sm text-muted-foreground py-4 text-center">
          No email on file. Add an email to message this prospect.
        </p>
      </GoldHeaderCard>
    );
  }

  return (
    <GoldHeaderCard
      title="Messages"
      description="Conversations with this prospect"
      icon={<MessageSquare className="w-4 h-4 text-primary" />}
      className="animate-fade-in"
    >
      <div className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : threads.length > 0 ? (
          <div className="space-y-4">
            {threads.map((thread) => (
              <div key={thread.id} className="rounded-lg border border-border bg-muted/20 p-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">{thread.title}</p>
                  <Badge variant="outline" className="text-[10px] capitalize">{thread.status}</Badge>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {(thread.message_replies || []).map((reply) => {
                    const fromAdmin = reply.sender_role === 'admin';
                    return (
                      <div key={reply.id} className={`rounded-md p-2 text-sm ${fromAdmin ? 'bg-primary/10 border border-primary/20' : 'bg-background border border-border'}`}>
                        <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                          <span>{fromAdmin ? 'Heirway Team' : reply.sender_name || prospectName}</span>
                          <span>{new Date(reply.created_at).toLocaleString()}</span>
                        </div>
                        <p className="whitespace-pre-wrap break-words leading-relaxed">{reply.body}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="space-y-2">
                  <Textarea
                    value={replyText[thread.id] || ''}
                    onChange={(e) => setReplyText((p) => ({ ...p, [thread.id]: e.target.value }))}
                    placeholder="Reply to this thread..."
                    className="min-h-[80px]"
                    maxLength={5000}
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => handleReply(thread.id)}
                      disabled={replyingId === thread.id || !(replyText[thread.id] || '').trim()}
                    >
                      {replyingId === thread.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Send Reply
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            <Separator />
          </div>
        ) : null}

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {threads.length > 0 ? 'Start New Conversation' : 'Send First Message'}
          </p>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject (optional)"
            maxLength={200}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={`Write a message to ${prospectName}...`}
            className="min-h-[110px]"
            maxLength={5000}
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">{body.length}/5000</span>
            <Button onClick={handleStartThread} disabled={sending || !body.trim()}>
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Send Message
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            The prospect will receive an email asking them to log in to view your message.
          </p>
        </div>
      </div>
    </GoldHeaderCard>
  );
}
