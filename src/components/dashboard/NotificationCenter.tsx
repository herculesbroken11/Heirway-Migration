import { useState, useEffect } from 'react';
import { Bell, Check, User, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface Assessment {
  id: string;
  created_at: string;
  viewed_at: string | null;
  prospect: {
    name: string;
    email: string | null;
  };
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Assessment[]>([]);
  const [unviewedCount, setUnviewedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('assessments')
        .select(`
          id,
          created_at,
          viewed_at,
          prospects!inner (
            name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const formatted = (data || []).map((item: any) => ({
        id: item.id,
        created_at: item.created_at,
        viewed_at: item.viewed_at,
        prospect: {
          name: item.prospects?.name || 'Unknown',
          email: item.prospects?.email || null,
        },
      }));

      setNotifications(formatted);
      setUnviewedCount(formatted.filter(n => !n.viewed_at).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Subscribe to realtime updates for new assessments
    const channel = supabase
      .channel('assessments-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'assessments',
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const markAsViewed = async (id: string) => {
    try {
      const { error } = await supabase
        .from('assessments')
        .update({ viewed_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, viewed_at: new Date().toISOString() } : n))
      );
      setUnviewedCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as viewed:', error);
    }
  };

  const markAllAsViewed = async () => {
    try {
      const unviewedIds = notifications.filter(n => !n.viewed_at).map(n => n.id);
      
      if (unviewedIds.length === 0) return;

      const { error } = await supabase
        .from('assessments')
        .update({ viewed_at: new Date().toISOString() })
        .in('id', unviewedIds);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => ({ ...n, viewed_at: n.viewed_at || new Date().toISOString() }))
      );
      setUnviewedCount(0);
      toast({ title: 'All notifications marked as read' });
    } catch (error) {
      console.error('Error marking all as viewed:', error);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-xl bg-card/50 backdrop-blur-sm border border-border/40 hover:bg-card/70"
        >
          <Bell className={`h-5 w-5 ${unviewedCount > 0 ? 'text-primary' : 'text-muted-foreground'}`} />
          {unviewedCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center animate-pulse">
              {unviewedCount > 9 ? '9+' : unviewedCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0 glass-panel border-border/40" 
        align="end"
        sideOffset={8}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
          <h4 className="font-semibold text-sm">New Assessments</h4>
          {unviewedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 text-primary hover:text-primary"
              onClick={markAllAsViewed}
            >
              <Check className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-20">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-20 text-muted-foreground text-sm">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              No assessments yet
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`px-4 py-3 hover:bg-card/50 transition-colors cursor-pointer ${
                    !notification.viewed_at ? 'bg-primary/5' : ''
                  }`}
                  onClick={() => {
                    if (!notification.viewed_at) {
                      markAsViewed(notification.id);
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      !notification.viewed_at ? 'bg-primary/20' : 'bg-muted/50'
                    }`}>
                      <User className={`h-4 w-4 ${
                        !notification.viewed_at ? 'text-primary' : 'text-muted-foreground'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${
                        !notification.viewed_at ? 'text-foreground' : 'text-muted-foreground'
                      }`}>
                        {notification.prospect.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        Completed assessment
                      </p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </div>
                    </div>
                    {!notification.viewed_at && (
                      <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
