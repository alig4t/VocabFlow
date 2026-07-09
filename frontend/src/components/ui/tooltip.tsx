import * as React from 'react'
import { cn } from '../../lib/utils'

interface TooltipProps {
  /** Text shown on hover / focus. */
  label: string
  children: React.ReactNode
  className?: string
  /** Side the bubble appears on (default: top). */
  side?: 'top' | 'bottom'
}

/**
 * Minimal CSS-only tooltip (no external dep). Wrap a trigger element; the bubble
 * shows on hover/focus. `dir="ltr"`-agnostic and theme-aware.
 */
export function Tooltip({ label, children, className, side = 'top' }: TooltipProps) {
  return (
    <span className={cn('group/tt relative inline-flex', className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background opacity-0 shadow-md transition-opacity duration-150 group-hover/tt:opacity-100 group-focus-within/tt:opacity-100',
          side === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
        )}
      >
        {label}
      </span>
    </span>
  )
}
