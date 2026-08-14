import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const STALE_DAYS = 30;

/**
 * Returns a function that navigates to the correct upgrade destination:
 * - If the user took the trust quiz within 30 days → show recommendation page
 * - Otherwise → send to pricing to take the quiz
 */
export function useUpgradeRoute() {
  const navigate = useNavigate();

  const goToUpgrade = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/heirway/pricing');
        return;
      }

      const { data: client } = await supabase
        .from('heirway_clients')
        .select('id, recommended_plan, updated_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!client) {
        navigate('/heirway/pricing');
        return;
      }

      // Check if the client has a recommendation from the quiz within the last 30 days
      const daysSinceUpdate = client.updated_at
        ? (Date.now() - new Date(client.updated_at).getTime()) / (1000 * 60 * 60 * 24)
        : Infinity;

      if (client.recommended_plan && daysSinceUpdate <= STALE_DAYS) {
        sessionStorage.setItem('heirway_recommended_plan', client.recommended_plan);
        navigate('/heirway/recommendation');
      } else {
        // Send to pricing page where they can choose Education or take the quiz for a trust plan recommendation
        navigate('/heirway/pricing');
      }
    } catch {
      navigate('/heirway/pricing');
    }
  }, [navigate]);

  return goToUpgrade;
}
