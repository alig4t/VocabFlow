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
  /** Accent color token for the icon chip, e.g. 'primary' | 'success'. */
  accent?: 'primary' | 'success' | 'warning' | 'chart-5'
}

const accentMap: Record<NonNullable<StatTileProps['accent']>, string> = {
  primary: 'bg-accent text-accent-foreground',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/15 text-warning',
  'chart-5': 'bg-chart-5/10 text-chart-5',
}

/**
 * One "how am I doing" number. Stacked rather than side-by-side so the value
 * can carry real weight — it's the only thing worth reading at a glance.
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
    <article className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
            accentMap[accent],
          )}
          aria-hidden="true"
        >
          <Icon className="h-4 w-4" />
        </span>
        <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
      </div>

      {empty ? (
        <p className="mt-3 text-sm font-medium leading-tight text-muted-foreground/80">
          {emptyLabel}
        </p>
      ) : (
        <>
          <p className="mt-2.5 text-2xl font-black tabular-nums leading-none text-foreground sm:text-[1.75rem]">
            {value}
          </p>
          {hint && <p className="mt-1.5 truncate text-[11px] text-muted-foreground">{hint}</p>}
        </>
      )}
    </article>
  )
}
