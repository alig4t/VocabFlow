import * as React from 'react'
import { cn } from '../../lib/utils'

/**
 * Shimmering placeholder used while async content loads, to reserve space and
 * avoid layout shift. Respects prefers-reduced-motion (shimmer disabled in CSS).
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-shimmer relative overflow-hidden rounded-md bg-muted',
        'after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_1.6s_infinite]',
        'after:bg-gradient-to-r after:from-transparent after:via-foreground/10 after:to-transparent',
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
