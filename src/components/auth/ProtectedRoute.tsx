import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const [state, setState] = useState<'loading' | 'authenticated' | 'unauthenticated' | 'unauthorized' | 'unverified'>('loading');
  const location = useLocation();

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (mounted) setState('unauthenticated');
        return;
      }

      // Check if email is verified (user exists but not confirmed)
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !user.email_confirmed_at) {
        if (mounted) setState('unverified');
        return;
      }

      if (requireAdmin) {
        const { data: role } = await supabase.rpc('get_current_user_role');
        if (role !== 'admin' && role !== 'super_admin') {
          if (mounted) setState('unauthorized');
          return;
        }
      }

      if (mounted) setState('authenticated');
    };

    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        if (mounted) setState('unauthenticated');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [requireAdmin]);

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (state === 'unauthenticated') {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (state === 'unverified') {
    return <Navigate to="/verify-email" replace />;
  }

  if (state === 'unauthorized') {
    return <Navigate to="/heirway/dashboard" replace />;
  }

  return <>{children}</>;
}
