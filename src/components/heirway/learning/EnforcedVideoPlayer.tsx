import { useRef, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, Video } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Props {
  videoUrl: string;
  title: string;
  completed: boolean;
  onComplete: () => void;
}

/**
 * Video player that:
 * 1. Prevents seeking ahead of the furthest watched position
 * 2. Auto-marks lesson complete only when video reaches the end
 * 3. Shows a progress bar of how much has been watched
 */
export default function EnforcedVideoPlayer({ videoUrl, title, completed, onComplete }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [maxWatched, setMaxWatched] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasEnded, setHasEnded] = useState(false);
  const isSeeking = useRef(false);

  // Reset state when video URL changes
  useEffect(() => {
    setMaxWatched(0);
    setCurrentTime(0);
    setDuration(0);
    setHasEnded(false);
    isSeeking.current = false;
  }, [videoUrl]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || isSeeking.current) return;

    const ct = video.currentTime;
    setCurrentTime(ct);

    // Update max watched (allow small buffer for natural playback jumps)
    if (ct <= maxWatched + 2) {
      setMaxWatched(prev => Math.max(prev, ct));
    }
  }, [maxWatched]);

  const handleSeeking = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    // If user tries to seek ahead of maxWatched, snap back
    if (video.currentTime > maxWatched + 1) {
      isSeeking.current = true;
      video.currentTime = maxWatched;
      isSeeking.current = false;
    }
  }, [maxWatched]);

  const handleEnded = useCallback(() => {
    setHasEnded(true);
    if (!completed) {
      onComplete();
    }
  }, [completed, onComplete]);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  }, []);

  const watchPercent = duration > 0 ? Math.min(100, Math.round((maxWatched / duration) * 100)) : 0;

  return (
    <div className="space-y-2">
      <div className="aspect-video rounded-lg overflow-hidden bg-black relative">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-contain bg-black"
          controls
          controlsList="nodownload"
          onTimeUpdate={handleTimeUpdate}
          onSeeking={handleSeeking}
          onEnded={handleEnded}
          onLoadedMetadata={handleLoadedMetadata}
          title={title}
        />
      </div>

      {/* Watch progress indicator */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <div className="flex items-center gap-2">
          <div className="w-24 h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${watchPercent}%` }}
            />
          </div>
          <span>{watchPercent}% watched</span>
        </div>
        {(completed || hasEnded) ? (
          <Badge variant="default" className="text-[10px] gap-1">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </Badge>
        ) : (
          <span className="text-muted-foreground/60 text-[10px]">Watch fully to complete</span>
        )}
      </div>
    </div>
  );
}
