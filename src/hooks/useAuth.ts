import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  role: string | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAdmin: false,
    isSuperAdmin: false,
    role: null,
  });

  const checkRole = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_current_user_role');
      if (error) {
        console.error('Error checking role:', error);
        return { role: null, isAdmin: false, isSuperAdmin: false };
      }
      const role = data as string | null;
      return {
        role,
        isAdmin: role === 'admin' || role === 'super_admin',
        isSuperAdmin: role === 'super_admin',
      };
    } catch (error) {
      console.error('Error checking role:', error);
      return { role: null, isAdmin: false, isSuperAdmin: false };
    }
  }, []);

  useEffect(() => {
    // Set up auth state change listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const user = session?.user ?? null;

        if (user) {
          setTimeout(async () => {
            const roleInfo = await checkRole();
            setAuthState({
              user,
              session,
              isLoading: false,
              ...roleInfo,
            });
          }, 0);
        } else {
          setAuthState({
            user: null,
            session: null,
            isLoading: false,
            isAdmin: false,
            isSuperAdmin: false,
            role: null,
          });
        }
      }
    );

    // THEN get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const user = session?.user ?? null;

      if (user) {
        const roleInfo = await checkRole();
        setAuthState({
          user,
          session,
          isLoading: false,
          ...roleInfo,
        });
      } else {
        setAuthState({
          user: null,
          session: null,
          isLoading: false,
          isAdmin: false,
          isSuperAdmin: false,
          role: null,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [checkRole]);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName,
        },
      },
    });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    ...authState,
    signIn,
    signUp,
    signOut,
  };
}
