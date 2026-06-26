import { useMemo } from "react";

// Deterministic pseudo-random so the layout is stable per-render
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/**
 * Animated diamond-shaped twinkling stars layered above the nebula background.
 * Purely decorative — pointer-events:none.
 */
export function CosmicBackdrop({ count = 38 }: { count?: number }) {
  const stars = useMemo(() => {
    const rand = seeded(1337);
    return Array.from({ length: count }, () => {
      const size = 4 + rand() * 8; // 4–12px
      return {
        left: rand() * 100,
        top: rand() * 100,
        size,
        delay: rand() * 4,
        duration: 2.5 + rand() * 3,
        opacity: 0.5 + rand() * 0.5,
      };
    });
  }, [count]);

  return (
    <div className="diamond-stars" aria-hidden="true">
      {stars.map((s, i) => (
        <span
          key={i}
          className="diamond-star"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
            opacity: s.opacity,
          }}
        />
      ))}
    </div>
  );
}
