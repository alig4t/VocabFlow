import { useId, type ReactNode } from 'react'
import { cn } from '../../lib/utils'

export interface RingSegment {
  /** Absolute value; segments are normalised against their sum. */
  value: number
  /** Tailwind stroke class, e.g. `stroke-success`. */
  className: string
}

/** Named gradients for the single-arc mode. */
const GRADIENTS = {
  gold: ['hsl(var(--gradient-from))', 'hsl(var(--gradient-to))'],
  /** Travels violet → gold, so the arc reads as motion. */
  violet: ['hsl(var(--brand-violet))', 'hsl(var(--primary))'],
  mint: ['hsl(var(--brand-mint))', 'hsl(var(--primary))'],
  /*
    The hero dial: the landing page's amber→yellow. Driven by per-theme tokens
    rather than raw gold, which sits near 1.7:1 on the cream panel — under the
    3:1 a data mark needs. Deep amber on light surfaces, bright gold on dark.
  */
  dial: ['hsl(var(--dial-from))', 'hsl(var(--dial-to))'],
} as const

export type RingGradient = keyof typeof GRADIENTS

interface ProgressRingProps {
  /** 0–100. Ignored when `segments` is provided. */
  value?: number
  /** Draws a segmented ring (memory distribution) instead of a single arc. */
  segments?: RingSegment[]
  /** Stroke width in viewBox units (the box is 100×100). */
  thickness?: number
  /** Paint the single arc with a named gradient. */
  gradient?: RingGradient
  /** Stroke class for the single arc when `gradient` is unset. */
  arcClassName?: string
  trackClassName?: string
  className?: string
  /** Marks the head of the arc with a dot — reads as "you are here". */
  tip?: boolean
  /** Soft colored halo behind the ring. */
  glow?: 'violet' | 'gold' | 'mint'
  /** Describes the ring for screen readers; the ring is decorative without it. */
  label?: string
  /** Centre content — a number, a percentage, a short caption. */
  children?: ReactNode
}

/* Weak on light surfaces, where a blurred disc reads as a smudge; stronger on
   dark, where it reads as light coming off the arc. */
const GLOW_CLASS = {
  violet: 'bg-violet/10 dark:bg-violet/25',
  gold: 'bg-primary/10 dark:bg-primary/25',
  mint: 'bg-mint/10 dark:bg-mint/25',
} as const

/**
 * The dashboard's recurring visual motif: a circular progress dial.
 *
 * Two modes — a single arc (today's completion) and a segmented ring (how the
 * whole vocabulary splits across memory strengths). Kept to those two uses on
 * purpose; a page of rings reads as a chart dump, not a dashboard.
 */
export function ProgressRing({
  value = 0,
  segments,
  thickness = 9,
  gradient,
  arcClassName = 'stroke-primary',
  trackClassName = 'stroke-muted',
  className,
  tip = false,
  glow,
  label,
  children,
}: ProgressRingProps) {
  const gradientId = useId()
  const r = 50 - thickness / 2
  const circumference = 2 * Math.PI * r

  const pct = Math.min(100, Math.max(0, value))

  // The <circle> starts at 3 o'clock and runs clockwise; the whole SVG is then
  // rotated -90°, so the tip lands wherever the arc visually ends.
  const tipAngle = (pct / 100) * 2 * Math.PI
  const tipX = 50 + r * Math.cos(tipAngle)
  const tipY = 50 + r * Math.sin(tipAngle)

  const total = segments?.reduce((s, x) => s + x.value, 0) ?? 0
  let offset = 0

  return (
    <div className={cn('relative shrink-0', className)}>
      {glow && (
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-2 rounded-full blur-2xl',
            GLOW_CLASS[glow],
          )}
        />
      )}

      <svg
        viewBox="0 0 100 100"
        className="relative h-full w-full -rotate-90"
        role={label ? 'img' : 'presentation'}
        aria-label={label}
      >
        {gradient && (
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={GRADIENTS[gradient][0]} />
              <stop offset="100%" stopColor={GRADIENTS[gradient][1]} />
            </linearGradient>
          </defs>
        )}

        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          strokeWidth={thickness}
          className={trackClassName}
        />

        {segments && total > 0
          ? segments.map((seg, i) => {
              if (seg.value <= 0) return null
              const dash = (seg.value / total) * circumference
              const dashOffset = -offset
              offset += dash
              return (
                <circle
                  key={i}
                  cx="50"
                  cy="50"
                  r={r}
                  fill="none"
                  strokeWidth={thickness}
                  strokeLinecap="butt"
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={dashOffset}
                  className={seg.className}
                />
              )
            })
          : !segments && (
              <>
                <circle
                  cx="50"
                  cy="50"
                  r={r}
                  fill="none"
                  strokeWidth={thickness}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - pct / 100)}
                  stroke={gradient ? `url(#${gradientId})` : undefined}
                  className={cn(
                    'transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none',
                    gradient ? undefined : arcClassName,
                  )}
                />
                {tip && pct > 0 && pct < 100 && (
                  <circle
                    cx={tipX}
                    cy={tipY}
                    r={thickness / 2 + 1.5}
                    className={gradient === 'dial' ? 'fill-[hsl(var(--dial-to))]' : 'fill-primary'}
                  />
                )}
              </>
            )}
      </svg>

      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-none">
          {children}
        </div>
      )}
    </div>
  )
}
