import * as React from 'react'
import { cn } from '../../lib/utils'

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0–100 */
  value?: number
  /** Visual height of the track. */
  size?: 'sm' | 'md' | 'lg'
  /** Use the brand indigo→violet gradient for the fill (default true). */
  gradient?: boolean
  /** Accessible label describing what the progress represents. */
  label?: string
}

const sizeMap: Record<NonNullable<ProgressProps['size']>, string> = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-3.5',
}

/**
 * Accessible, RTL-aware progress bar. The fill is anchored to the inline-start
 * edge, so it grows from the right in RTL contexts automatically.
 */
const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, size = 'md', gradient = true, label, ...props }, ref) => {
    const clamped = Math.min(100, Math.max(0, value))
    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clamped)}
        aria-label={label}
        className={cn(
          'relative w-full overflow-hidden rounded-full bg-muted',
          sizeMap[size],
          className,
        )}
        {...props}
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-500 ease-out',
            gradient ? 'bg-brand-gradient' : 'bg-primary',
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    )
  },
)
Progress.displayName = 'Progress'

export { Progress }
