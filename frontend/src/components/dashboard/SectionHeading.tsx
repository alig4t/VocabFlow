import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface SectionHeadingProps {
  icon: LucideIcon
  /** First word, printed in the brand gold. */
  accent: string
  /** The rest of the title, in ink. */
  children: ReactNode
  /** Optional right-aligned control, e.g. a "see all" link. */
  action?: ReactNode
}

/**
 * Section titles across the dashboard: one gold word, then ink. It gives the
 * page a repeating rhythm without adding another card or divider.
 */
export function SectionHeading({ icon: Icon, accent, children, action }: SectionHeadingProps) {
  return (
    <div className="flex items-center gap-3 px-0.5">
      {/*
        `accent`/`accent-foreground`, not `primary`: raw brand gold on a light
        surface sits near 2:1 contrast. The accent pair is the readable gold in
        all three themes.
      */}
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground"
        aria-hidden="true"
      >
        <Icon className="h-4 w-4" />
      </span>
      <h2 className="text-lg font-bold text-foreground">
        <span className="text-accent-foreground">{accent}</span> {children}
      </h2>
      {action && <div className="mr-auto">{action}</div>}
    </div>
  )
}
