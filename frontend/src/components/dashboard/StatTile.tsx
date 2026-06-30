import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface StatTileProps {
  icon: LucideIcon
  label: string
  value: string
  hint?: string
  /** Accent color token for the icon chip, e.g. 'primary' | 'success'. */
  accent?: 'primary' | 'success' | 'warning' | 'chart-5'
}

const accentMap: Record<NonNullable<StatTileProps['accent']>, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/15 text-warning',
  'chart-5': 'bg-chart-5/10 text-chart-5',
}

export function StatTile({ icon: Icon, label, value, hint, accent = 'primary' }: StatTileProps) {
  return (
    <article className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-soft">
      <span
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg',
          accentMap[accent],
        )}
        aria-hidden="true"
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold tabular-nums leading-tight text-foreground">{value}</p>
        {hint && <p className="truncate text-[11px] text-muted-foreground">{hint}</p>}
      </div>
    </article>
  )
}
