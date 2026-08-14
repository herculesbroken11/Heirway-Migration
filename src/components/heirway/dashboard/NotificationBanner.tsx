import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Bell, X } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  created_at: string;
  expires_at: string | null;
  target_plans?: string[] | null;
}

interface NotificationBannerProps {
  clientId?: string;
  clientPlan?: string | null;
}

export function NotificationBanner({ clientId, clientPlan, userId }: NotificationBannerProps & { userId?: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadNotifications();
    if (userId) loadDismissed();
  }, [clientId, clientPlan, userId]);

  const loadDismissed = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('heirway_notification_reads')
      .select('notification_id')
      .eq('user_id', userId);
    setDismissed(new Set((data || []).map((r: any) => r.notification_id)));
  };

  const loadNotifications = async () => {
    const { data } = await supabase
      .from('heirway_admin_notifications' as any)
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    const now = new Date();
    const SYSTEM_NOTIFICATION_TYPES = ['request', 'new_account', 'intake_completed', 'referral', 'diagnostic', 'system'];
    const active = ((data as any[]) || []).filter((n: any) => {
      if (n.expires_at && new Date(n.expires_at) < now) return false;
      if (n.target_client_id && n.target_client_id !== clientId) return false;
      if (n.target_plans && n.target_plans.length > 0 && (!clientPlan || !n.target_plans.includes(clientPlan))) return false;
      // Only show admin-pushed notifications as banners, not system-generated ones
      if (SYSTEM_NOTIFICATION_TYPES.includes(n.notification_type)) return false;
      return true;
    });

    // Load annual meeting reminders from trusts
    if (clientId) {
      const { data: trusts } = await supabase
        .from('heirway_trust_progress' as any)
        .select('*')
        .eq('client_id', clientId);
      
      const REMINDER_DAYS = [90, 60, 30, 24, 10, 3, 1];
      const trustReminders: Notification[] = [];
      ((trusts as any[]) || []).forEach((t: any) => {
        if (!t.annual_meeting_date) return;
        const meetingDate = new Date(t.annual_meeting_date);
        const daysUntil = Math.ceil((meetingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const formattedDate = meetingDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

        let title: string | null = null;
        let message = '';

        if (daysUntil < 0) {
          title = `Annual meeting for ${t.trust_name} is overdue`;
          message = `Was scheduled for ${formattedDate}. Please create meeting minutes.`;
        } else if (daysUntil === 0) {
          title = `Annual meeting for ${t.trust_name} is today`;
          message = `Your annual trust meeting is scheduled for today.`;
        } else if (REMINDER_DAYS.includes(daysUntil)) {
          title = `Annual meeting for ${t.trust_name} in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`;
          message = `Scheduled for ${formattedDate}. Please create meeting minutes.`;
        }

        if (title) {
          trustReminders.push({
            id: `reminder-${t.id}-${daysUntil}`,
            title,
            message,
            notification_type: 'meeting_reminder',
            created_at: now.toISOString(),
            expires_at: null,
          });
        }
      });
      active.push(...trustReminders);
    }

    setNotifications(active);
  };

  const bannerNotifications = notifications.filter(n => !dismissed.has(n.id));

  if (bannerNotifications.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {bannerNotifications.map(n => (
        <div key={n.id} className="flex items-start gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20 animate-fade-in">
          <Bell className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{n.title}</p>
            {n.message && <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>}
          </div>
          <button onClick={async () => {
            setDismissed(prev => new Set([...prev, n.id]));
            if (userId) {
              await supabase.from('heirway_notification_reads').insert({ user_id: userId, notification_id: n.id });
            }
          }} className="p-1 rounded hover:bg-muted/50 transition-colors">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function NotificationsSection({ clientId, clientPlan }: NotificationBannerProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    loadNotifications();
  }, [clientId]);

  const loadNotifications = async () => {
    const { data } = await supabase
      .from('heirway_admin_notifications' as any)
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    const now = new Date();
    const ADMIN_ONLY_TYPES = ['request', 'new_account', 'intake_completed', 'referral', 'diagnostic', 'system'];
    const active = ((data as any[]) || []).filter((n: any) => {
      if (n.expires_at && new Date(n.expires_at) < now) return false;
      if (ADMIN_ONLY_TYPES.includes(n.notification_type)) return false;
      if (n.target_client_id && n.target_client_id !== clientId) return false;
      if (n.target_plans && n.target_plans.length > 0 && (!clientPlan || !n.target_plans.includes(clientPlan))) return false;
      return true;
    });
    setNotifications(active);
  };

  if (notifications.length === 0) return null;

  return (
    <div className="space-y-2">
      {notifications.map(n => (
        <div key={n.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/40">
          <Bell className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{n.title}</p>
            {n.message && <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>}
            <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
