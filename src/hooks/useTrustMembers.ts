import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TrustMember {
  id: string;
  trust_id: string | null; // legacy
  client_id: string;
  user_id: string | null;
  member_type: 'trustee_manager' | 'trustee' | 'beneficiary';
  power_level: 'full' | 'limited' | 'none'; // legacy default
  invite_email: string | null;
  invite_status: 'pending' | 'accepted' | 'expired';
  invite_token: string | null;
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
  is_billable: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrustMemberAssignment {
  id: string;
  member_id: string;
  trust_id: string;
  power_level: 'full' | 'limited' | 'none';
  created_at: string;
}

export interface TrustMemberWithAssignments extends TrustMember {
  assignments: TrustMemberAssignment[];
}

export function useTrustMembers(clientId: string | undefined) {
  const [members, setMembers] = useState<TrustMemberWithAssignments[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    if (!clientId) { setLoading(false); return; }
    setLoading(true);
    const { data: memberData, error } = await supabase
      .from('trust_members')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true });

    if (error || !memberData) { setLoading(false); return; }

    const memberIds = memberData.map((m: any) => m.id);
    let assignments: TrustMemberAssignment[] = [];
    if (memberIds.length > 0) {
      const { data: aData } = await supabase
        .from('trust_member_assignments')
        .select('*')
        .in('member_id', memberIds);
      if (aData) assignments = aData as TrustMemberAssignment[];
    }

    const merged: TrustMemberWithAssignments[] = (memberData as any[]).map(m => ({
      ...m,
      assignments: assignments.filter(a => a.member_id === m.id),
    }));

    setMembers(merged);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  return { members, loading, refetch: fetchMembers };
}

export function useMyMemberships() {
  const [memberships, setMemberships] = useState<TrustMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from('trust_members')
        .select('*')
        .eq('user_id', user.id)
        .eq('invite_status', 'accepted');
      if (data) setMemberships(data as TrustMember[]);
      setLoading(false);
    })();
  }, []);

  return { memberships, loading };
}
