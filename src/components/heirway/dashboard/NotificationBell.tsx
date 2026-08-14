import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Bell, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  created_at: string;
}

interface NotificationBellProps {
  userId: string;
  clientId: string | null;
  clientPlan?: string | null;
}

export function NotificationBell({ userId, clientId, clientPlan }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadNotifications();
    loadReads();
  }, [clientId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    const { data } = await supabase
      .from('heirway_admin_notifications')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    const now = new Date();
    // System notification types are admin-only (not shown to regular users)
    const ADMIN_ONLY_TYPES = ['request', 'new_account', 'intake_completed', 'referral', 'diagnostic', 'system'];
    const active: Notification[] = ((data as any[]) || [])
      .filter((n: any) => {
        if (n.expires_at && new Date(n.expires_at) < now) return false;
        // Skip system/admin-only notifications — these are for admins, not end users
        if (ADMIN_ONLY_TYPES.includes(n.notification_type)) return false;
        if (n.target_client_id && n.target_client_id !== clientId) return false;
        if (n.target_plans && n.target_plans.length > 0 && (!clientPlan || !n.target_plans.includes(clientPlan))) return false;
        return true;
      })
      .map((n: any) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        notification_type: n.notification_type,
        created_at: n.created_at,
      }));

    // Add meeting reminders if clientId exists
    if (clientId) {
      const { data: trusts } = await supabase
        .from('heirway_trust_progress' as any)
        .select('*')
        .eq('client_id', clientId);

      const REMINDER_DAYS = [90, 60, 30, 24, 10, 3, 1];

      ((trusts as any[]) || []).forEach((t: any) => {
        if (!t.annual_meeting_date) return;
        const meetingDate = new Date(t.annual_meeting_date);
        const daysUntil = Math.ceil((meetingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        let title: string | null = null;
        let message: string = '';
        const formattedDate = meetingDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

        if (daysUntil < 0) {
          title = `Annual meeting for ${t.trust_name} is overdue`;
          message = `Was scheduled for ${formattedDate}. Please complete your annual meeting or submit a request.`;
        } else if (daysUntil === 0) {
          title = `Annual meeting for ${t.trust_name} is today`;
          message = `Your annual trust meeting is scheduled for today.`;
        } else if (REMINDER_DAYS.includes(daysUntil)) {
          title = `Annual meeting for ${t.trust_name} in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`;
          message = `Scheduled for ${formattedDate}.`;
        }

        if (title) {
          active.push({
            id: `reminder-${t.id}-${daysUntil}`,
            title,
            message,
            notification_type: 'meeting_reminder',
            created_at: now.toISOString(),
          });
        }
      });
    }

    setNotifications(active);
  };

  const loadReads = async () => {
    const { data } = await supabase
      .from('heirway_notification_reads' as any)
      .select('notification_id')
      .eq('user_id', userId);
    setReadIds(new Set((data as any[] || []).map((r: any) => r.notification_id)));
  };

  const markAsRead = async (notifId: string) => {
    await supabase.from('heirway_notification_reads' as any).insert({
      user_id: userId,
      notification_id: notifId,
    });
    setReadIds(prev => new Set([...prev, notifId]));
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !readIds.has(n.id));
    if (unread.length === 0) return;
    const inserts = unread.map(n => ({ user_id: userId, notification_id: n.id }));
    await supabase.from('heirway_notification_reads' as any).insert(inserts);
    setReadIds(prev => {
      const next = new Set(prev);
      unread.forEach(n => next.add(n.id));
      return next;
    });
  };

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;
  // Only show unread notifications — once read, they disappear
  const visibleNotifications = notifications.filter(n => !readIds.has(n.id));

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="outline"
        size="sm"
        className="relative"
        onClick={() => setOpen(!open)}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 min-w-[18px] px-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-80 max-h-96 overflow-y-auto rounded-lg border border-border bg-card shadow-lg z-50">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary hover:underline flex items-center gap-1">
                <Check className="w-3 h-3" /> Clear all
              </button>
            )}
          </div>
          {visibleNotifications.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-xs text-muted-foreground">No new notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {visibleNotifications.map(n => (
                <div key={n.id} className="p-3 bg-primary/5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">{n.title}</p>
                      {n.message && <p className="text-[11px] text-muted-foreground mt-0.5">{n.message}</p>}
                      <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleDateString()}</p>
                    </div>
                    <button onClick={() => markAsRead(n.id)} className="p-1 rounded hover:bg-muted/50 flex-shrink-0">
                      <X className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
