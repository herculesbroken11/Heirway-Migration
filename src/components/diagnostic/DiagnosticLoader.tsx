import heirwayIcon from '@/assets/heirway-icon.png';

const DiagnosticLoader = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-primary/95 via-secondary/90 to-primary/95 backdrop-blur-xl">
      <div className="relative flex flex-col items-center">
        {/* Animated rings */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="absolute h-32 w-32 rounded-full border border-primary-foreground/20 animate-ping" style={{ animationDuration: '2s' }} />
          <div className="absolute h-24 w-24 rounded-full border border-primary-foreground/30 animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0.2s' }} />
          <div className="absolute h-16 w-16 rounded-full border border-primary-foreground/40 animate-ping" style={{ animationDuration: '1s', animationDelay: '0.4s' }} />
        </div>
        
        {/* Center icon */}
        <div className="relative z-10 p-5 rounded-2xl bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20 shadow-2xl">
          <img src={heirwayIcon} alt="Heirway" className="h-10 w-10 object-contain animate-pulse" />
        </div>
        
        {/* Loading text */}
        <div className="mt-8 text-center">
          <p className="text-primary-foreground/90 font-display text-lg font-medium tracking-wide">
            Preparing Your Assessment
          </p>
          <div className="mt-3 flex items-center justify-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground/60 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground/60 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground/60 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiagnosticLoader;
