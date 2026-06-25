import { cn } from "@/lib/utils";

/**
 * Brand wordmark recreating the attached Constellation logo:
 * the wordmark plus a Big Dipper constellation drawn in glowing stars.
 */
export function ConstellationMark({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div className="flex items-center justify-center gap-4 sm:gap-6">
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl">
          Constellation
        </h1>
        <svg
          viewBox="0 0 220 120"
          className="hidden h-14 w-auto sm:block sm:h-20"
          fill="none"
          aria-hidden="true"
        >
          <defs>
            <filter id="starglow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* connecting lines (Big Dipper) */}
          <polyline
            points="18,30 70,46 120,40 165,64 200,86 150,100 118,72 120,40"
            stroke="white"
            strokeOpacity="0.55"
            strokeWidth="1.2"
          />
          <line x1="165" y1="64" x2="200" y2="86" stroke="white" strokeOpacity="0.55" strokeWidth="1.2" />
          {[
            [18, 30],
            [70, 46],
            [120, 40],
            [165, 64],
            [200, 86],
            [150, 100],
            [118, 72],
          ].map(([x, y], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={i % 2 ? 2.4 : 3.2}
              fill="white"
              filter="url(#starglow)"
              className="animate-twinkle"
              style={{ animationDelay: `${i * 0.35}s` }}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
