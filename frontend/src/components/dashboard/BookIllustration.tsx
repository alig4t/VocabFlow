import { cn } from '../../lib/utils'

interface BookIllustrationProps {
  className?: string
}

/**
 * An open book with letters lifting off it — the hero's visual anchor.
 *
 * Drawn here rather than imported from a stock set on purpose: every fill is a
 * theme token, so it recolours correctly across light, dark and sepia, and the
 * whole thing is under a kilobyte. Stock illustrations ship fixed palettes
 * (sage covers, peach fills) that fight the navy/gold identity in one mode and
 * disappear in another.
 *
 * Decorative — the hero states everything this says in text.
 */
export function BookIllustration({ className }: BookIllustrationProps) {
  return (
    <svg
      viewBox="0 0 200 150"
      fill="none"
      aria-hidden="true"
      className={cn('pointer-events-none', className)}
    >
      {/* Letters rising out of the spine, fading as they climb. */}
      <g className="fill-violet">
        <text x="96" y="30" fontSize="19" fontWeight="900" opacity="0.75">A</text>
        <text x="126" y="18" fontSize="13" fontWeight="900" opacity="0.45">C</text>
      </g>
      <text x="70" y="16" fontSize="15" fontWeight="900" className="fill-mint" opacity="0.6">
        B
      </text>

      {/* Sparks */}
      <g className="fill-primary">
        <circle cx="150" cy="34" r="3" opacity="0.7" />
        <circle cx="60" cy="40" r="2" opacity="0.5" />
        <path d="M168 12l1.8 4.6 4.6 1.8-4.6 1.8-1.8 4.6-1.8-4.6-4.6-1.8 4.6-1.8z" opacity="0.8" />
      </g>

      {/* Pages: two leaves meeting at the spine. */}
      <path
        d="M100 62c-14-10-33-14-52-12-4 .4-7 3.7-7 7.7v56c0 4.6 4 8.2 8.6 7.7 17-1.8 34 1.9 46.4 10.6 2.6 1.8 6 1.8 8.6 0 12.4-8.7 29.4-12.4 46.4-10.6 4.6.5 8.6-3.1 8.6-7.7v-56c0-4-3-7.3-7-7.7-19-2-38 2-52 12"
        className="fill-card"
      />
      <path
        d="M100 62c-14-10-33-14-52-12-4 .4-7 3.7-7 7.7v56c0 4.6 4 8.2 8.6 7.7 17-1.8 34 1.9 46.4 10.6 2.6 1.8 6 1.8 8.6 0 12.4-8.7 29.4-12.4 46.4-10.6 4.6.5 8.6-3.1 8.6-7.7v-56c0-4-3-7.3-7-7.7-19-2-38 2-52 12Z"
        className="stroke-hero-foreground"
        strokeOpacity="0.28"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* Spine */}
      <path
        d="M100 62v70"
        className="stroke-hero-foreground"
        strokeOpacity="0.28"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* Text lines on each leaf. */}
      <g className="stroke-hero-foreground" strokeOpacity="0.16" strokeWidth="3.5" strokeLinecap="round">
        <path d="M56 74h30M56 86h34M56 98h26" />
        <path d="M114 74h30M114 86h34M114 98h26" />
      </g>

      {/* A gold bookmark ribbon at the outer edge. */}
      <path d="M150 50v26l-7-6-7 6V50z" className="fill-primary" opacity="0.9" />
    </svg>
  )
}
