import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface StatTileProps {
  icon: LucideIcon
  label: string
  value: string
  hint?: string
  /**
   * No data behind this number yet. Shows `emptyLabel` instead of a zero, so a
   * fresh account doesn't read as a dead dashboard.
   */
  empty?: boolean
  emptyLabel?: string
  /** Accent color token for the icon, e.g. 'primary' | 'success'. */
  accent?: 'primary' | 'mint' | 'warning' | 'violet'
}

const accentMap: Record<NonNullable<StatTileProps['accent']>, string> = {
  primary: 'text-accent-foreground bg-accent',
  mint: 'text-mint bg-mint/10',
  warning: 'text-warning bg-warning/15',
  violet: 'text-violet bg-violet/10',
}

/**
 * One "how am I doing" number.
 *
 * No border and no card fill — four outlined boxes in a row read as a control
 * panel, which is the opposite of what this strip is for. The icon and the
 * numeral carry it; the surface stays out of the way.
 */
export function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  empty = false,
  emptyLabel = 'هنوز داده‌ای نیست',
  accent = 'primary',
}: StatTileProps) {
  return (
    <article className="flex items-center gap-3 rounded-2xl px-3 py-3 sm:gap-4 sm:px-4">
      <span
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl sm:h-12 sm:w-12',
          accentMap[accent],
        )}
        aria-hidden="true"
      >
        <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
      </span>

      <div className="min-w-0">
        {empty ? (
          <>
            <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
            <p className="mt-1 text-xs leading-tight text-muted-foreground/70">{emptyLabel}</p>
          </>
        ) : (
          <>
            <p className="text-2xl font-black tabular-nums leading-none text-foreground">
              {value}
            </p>
            <p className="mt-1.5 truncate text-xs font-medium text-muted-foreground">
              {hint ?? label}
            </p>
          </>
        )}
      </div>
    </article>
  )
}
