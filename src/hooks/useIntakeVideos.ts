import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useIntakeVideo(sectionKey: string) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('heirway_intake_videos')
      .select('video_url')
      .eq('section_key', sectionKey)
      .maybeSingle()
      .then(({ data }) => {
        setVideoUrl((data as any)?.video_url || null);
        setLoading(false);
      });
  }, [sectionKey]);

  return { videoUrl, loading };
}
