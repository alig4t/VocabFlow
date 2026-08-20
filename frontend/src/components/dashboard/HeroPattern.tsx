/**
 * The band's designed texture: a faint ink dot grid concentrated behind the
 * navbar half of the field, a couple of drawn rings, and small four-point
 * sparkles — depth and personality without competing with the content.
 * Everything is ink or deep amber at single-digit opacity, so any of it may
 * sit under text and chips without hurting contrast. Purely decorative.
 */
export function HeroPattern() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* The dot grid, masked to the upper-inline-start half. */}
      <div className="hero-dots hero-dots-mask absolute inset-0" />

      {/* Rings — one solid, one dashed, at opposite corners of the field. */}
      <span className="absolute end-[7%] top-[20%] h-16 w-16 rounded-full border-[2.5px] border-[hsl(45_60%_10%_/_0.1)]" />
      <span className="absolute start-[12%] bottom-[26%] h-9 w-9 rounded-full border-2 border-dashed border-[hsl(45_60%_10%_/_0.16)]" />

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
  )
}
