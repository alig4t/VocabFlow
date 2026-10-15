import { useEffect, useRef, useState, type CSSProperties } from "react";
import { BrainIllustration } from "./BrainIllustration";
import { cn } from "../../lib/utils";

/**
 * A dense, staggered field leaves the centre clear for the brain. The fixed
 * particle count keeps the repeating stream bounded on mobile.
 */
const SLOTS = [5, 14, 23, 33, 44, 56, 67, 78, 88, 97].flatMap((y, row) =>
  [8, 25, 42, 58, 75, 92].flatMap((x, column) => {
    if (y >= 23 && y <= 78 && Math.abs(x - 50) < 15) return [];
    if (y >= 33 && y <= 67 && Math.abs(x - 50) < 28) return [];
    const depth = (row + column) % 3;
    const dur = 8 + ((row * 3 + column) % 7);
    return [
      {
        x: 50 + (x - 50) * 0.72 + (row % 2 ? 1 : -1),
        y: 52 + (y - 52) * 0.82,
        width: 16,
        dur,
        delay: -((row * 2.3 + column * 1.7) % dur),
        scale: 0.85 + depth * 0.1,
        opacity: 0.6 + depth * 0.2,
      },
    ];
  }),
);

/**
 * Decorative colours echo the card; they do not represent these words' progress.
 */
const TONES = ["text-violet", "text-warning", "text-mint"] as const;

/** Used before the account has vocabulary of its own. */
const FALLBACK = [
  "remember",
  "vocabulary",
  "review",
  "fluent",
  "improve",
  "recall",
  "practice",
  "learn",
  "words",
  "memory",
  "repeat",
  "meaning",
  "spelling",
  "sentence",
  "phrase",
  "context",
  "listen",
  "speak",
  "read",
  "write",
  "daily",
  "discover",
  "understand",
  "progress",
  "curious",
  "explore",
  "imagine",
  "focus",
  "express",
  "connect",
  "create",
  "wonder",
  "journey",
  "thought",
  "bright",
  "insight",
  "language",
  "knowledge",
  "learning",
  "stories",
  "ideas",
  "grow",
  "dream",
  "achieve",
  "inspire",
];

interface MemoryWordHaloProps {
  /** The reader's own words. Padded from FALLBACK when there aren't enough. */
  words?: string[];
  className?: string;
}

/**
 * The brain that heads the memory card, ringed by small drifting words.
 *
 * Decorative vocabulary only; the counts underneath carry the memory status.
 */
export function MemoryWordHalo({ words = [], className }: MemoryWordHaloProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const pool = [...words, ...FALLBACK.filter((w) => !words.includes(w))];

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      dir="ltr"
      data-animate={visible}
      className={cn("memory-halo", className)}
    >
      <span className="memory-halo-glow" />
      <svg
        className="memory-halo-orbits"
        viewBox="0 0 400 240"
        fill="none"
        preserveAspectRatio="none"
      >
        <ellipse
          cx="200"
          cy="124"
          rx="144"
          ry="85"
          className="stroke-pink/20"
          transform="rotate(-12 200 124)"
        />
        <ellipse
          cx="200"
          cy="124"
          rx="165"
          ry="68"
          className="stroke-violet/15"
          transform="rotate(20 200 124)"
        />
        <ellipse
          cx="200"
          cy="124"
          rx="112"
          ry="99"
          className="stroke-mint/15"
          strokeDasharray="2 7"
        />
        <circle cx="60" cy="145" r="3" className="fill-violet/60" />
        <circle cx="320" cy="62" r="3" className="fill-mint/60" />
        <circle cx="294" cy="185" r="2.5" className="fill-pink-deep/60" />
      </svg>
      <span className="memory-halo-shadow" />
      <span className="memory-halo-brain">
        <BrainIllustration className="memory-halo-brain-float" />
      </span>

      <div className="memory-halo-word-field">
        {SLOTS.map((slot, i) => (
          <span
            key={i}
            className={cn("memory-halo-slot", TONES[i % TONES.length])}
            style={
              {
                left: `${slot.x}%`,
                top: `${slot.y}%`,
                width: `${slot.width}%`,
                "--drift-dur": `${slot.dur}s`,
                "--drift-delay": `${slot.delay}s`,
                "--word-scale": slot.scale,
                opacity: slot.opacity,
              } as CSSProperties
            }
          >
            <span className="word-drift memory-halo-word">
              {pool[i % pool.length]}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
