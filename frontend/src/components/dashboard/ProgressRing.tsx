import { useId, type ReactNode } from 'react'
import { cn } from '../../lib/utils'

export interface RingSegment {
  /** Absolute value; segments are normalised against their sum. */
  value: number
  /** Tailwind stroke class, e.g. `stroke-success`. */
  className: string
}

interface ProgressRingProps {
  /** 0–100. Ignored when `segments` is provided. */
  value?: number
  /** Draws a segmented ring (memory distribution) instead of a single arc. */
  segments?: RingSegment[]
  /** Stroke width in viewBox units (the box is 100×100). */
  thickness?: number
  /** Paint the single arc with the brand gold gradient. */
  gradient?: boolean
  /** Stroke class for the single arc when `gradient` is off. */
  arcClassName?: string
  trackClassName?: string
  className?: string
  /** Describes the ring for screen readers; the ring is decorative without it. */
  label?: string
  /** Centre content — a number, a percentage, a short caption. */
  children?: ReactNode
}

/**
 * The dashboard's one recurring visual motif: a circular progress dial.
 *
 * Two modes — a single arc (today's completion) and a segmented ring (how the
 * whole vocabulary splits across memory strengths). Kept to those two uses on
 * purpose; a page of rings reads as a chart dump, not a dashboard.
 */
export function ProgressRing({
  value = 0,
  segments,
  thickness = 9,
  gradient = false,
  arcClassName = 'stroke-primary',
  trackClassName = 'stroke-muted',
  className,
  label,
  children,
}: ProgressRingProps) {
  const gradientId = useId()
  const r = 50 - thickness / 2
  const circumference = 2 * Math.PI * r

  const total = segments?.reduce((s, x) => s + x.value, 0) ?? 0
  let offset = 0

  return (
    <div className={cn('relative shrink-0', className)}>
      <svg
        viewBox="0 0 100 100"
        className="h-full w-full -rotate-90"
        role={label ? 'img' : 'presentation'}
        aria-label={label}
      >
        {gradient && (
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="hsl(var(--gradient-from))" />
              <stop offset="100%" stopColor="hsl(var(--gradient-to))" />
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
              <circle
                cx="50"
                cy="50"
                r={r}
                fill="none"
                strokeWidth={thickness}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - Math.min(100, Math.max(0, value)) / 100)}
                stroke={gradient ? `url(#${gradientId})` : undefined}
                className={cn(
                  'transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none',
                  gradient ? undefined : arcClassName,
                )}
              />
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
