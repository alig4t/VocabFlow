/**
 * A faint dot grid, the user's book/bulb vectors, and small sparkles.
 * The vectors use CSS masks for theme-aware ink, with low opacity and
 * responsive sizes that keep the centre clear. Purely decorative.
 */
export function HeroPattern() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 select-none overflow-hidden"
    >
      {/* The dot grid, masked to the upper-inline-start half. */}
      <div className="hero-dots hero-dots-mask absolute inset-0" />

      {/* Downloaded SVGs sit at the edges, behind the hero content. */}
      <span className="hero-doodle hero-doodle-book" />
      <span className="hero-doodle hero-doodle-pages" />
      <span className="hero-doodle hero-doodle-bulb hero-doodle-bulb-top" />
      <span className="hero-doodle hero-doodle-bulb hero-doodle-bulb-bottom" />

      {/* Sparkles — four-point stars, amber-leaning, scattered lightly. */}
      <svg
        className="absolute start-[18%] top-[13%] h-4 w-4 text-[hsl(36_85%_32%_/_0.35)]"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" />
      </svg>
      <svg
        className="absolute end-[24%] bottom-[34%] h-3 w-3 text-[hsl(45_60%_10%_/_0.14)]"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" />
      </svg>
      <svg
        className="absolute start-[38%] top-[38%] h-2.5 w-2.5 text-[hsl(36_85%_32%_/_0.28)]"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" />
      </svg>

      {/* A few amber pin-dots for sparkle continuity. */}
      <span className="absolute end-[14%] top-[34%] h-1.5 w-1.5 rounded-full bg-[hsl(36_85%_32%_/_0.3)]" />
      <span className="absolute start-[8%] top-[52%] h-1 w-1 rounded-full bg-[hsl(45_60%_10%_/_0.14)]" />
    </div>
  );
}
