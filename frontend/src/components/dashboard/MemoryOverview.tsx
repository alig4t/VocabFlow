import { useMemo } from 'react'
import { Brain, Sprout, Leaf, TreeDeciduous, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { faNum } from '../../lib/format'
import { cn } from '../../lib/utils'
import type { GrowthPoint, MemoryBreakdown } from '../../types'

interface MemoryOverviewProps {
  memory: MemoryBreakdown
  growth: GrowthPoint[]
}

const BUCKETS = [
  {
    key: 'fresh' as const,
    icon: Sprout,
    label: 'تازه',
    hint: 'تازه وارد چرخه مرور شده',
    bar: 'bg-chart-5',
    chip: 'bg-chart-5/10 text-chart-5',
  },
  {
    key: 'learning' as const,
    icon: Leaf,
    label: 'در حال یادگیری',
    hint: 'هنوز به فاصله مرور بلند نرسیده',
    bar: 'bg-warning',
    chip: 'bg-warning/15 text-warning',
  },
  {
    key: 'stable' as const,
    icon: TreeDeciduous,
    label: 'پایدار',
    hint: 'فاصله مرور بیش از ۲۱ روز',
    bar: 'bg-success',
    chip: 'bg-success/10 text-success',
  },
]

/** Smoothed polyline for the 30-day stable-words curve (viewBox 100×32). */
function GrowthSparkline({ points }: { points: GrowthPoint[] }) {
  const path = useMemo(() => {
    if (points.length < 2) return ''
    const values = points.map((p) => p.count)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const span = max - min || 1
    return values
      .map((v, i) => {
        const x = (i / (values.length - 1)) * 100
        const y = 30 - ((v - min) / span) * 28
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
      })
      .join(' ')
  }, [points])

  if (!path) return null

  return (
    <svg
      viewBox="0 0 100 32"
      preserveAspectRatio="none"
      className="h-12 w-full"
      aria-hidden="true"
    >
      <path d={`${path} L100,32 L0,32 Z`} className="fill-success/10" />
      <path
        d={path}
        fill="none"
        className="stroke-success"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

/**
 * The SM-2 story of the user's memory: how many words sit in each strength
 * bucket, plus the 30-day trend of the "پایدار" set.
 *
 * The trend is reconstructed backwards from today's stable words (the schema
 * keeps no per-day history), so it is an approximation — accurate at "today"
 * and increasingly conservative the further back it goes.
 */
export function MemoryOverview({ memory, growth }: MemoryOverviewProps) {
  const total = memory.total
  const gained = growth.length > 1 ? growth[growth.length - 1].count - growth[0].count : 0

  return (
    <Card className="shadow-soft">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="h-5 w-5 text-primary" aria-hidden="true" />
          وضعیت حافظه
          <span className="mr-auto text-sm font-normal text-muted-foreground">
            {faNum(total)} واژه در چرخه مرور
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        {total === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            هنوز واژه‌ای وارد چرخه مرور نشده — با شروع مطالعه امروز اینجا پر می‌شود.
          </p>
        ) : (
          <>
            {/* Stacked bar: one glance at the whole memory */}
            <div
              className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label={`تازه ${memory.fresh}، در حال یادگیری ${memory.learning}، پایدار ${memory.stable}`}
            >
              {BUCKETS.map((b) => {
                const value = memory[b.key]
                if (value === 0) return null
                return (
                  <span
                    key={b.key}
                    className={cn('h-full', b.bar)}
                    style={{ width: `${(value / total) * 100}%` }}
                  />
                )
              })}
            </div>

            {/* Per-bucket detail */}
            <ul className="grid gap-3 sm:grid-cols-3">
              {BUCKETS.map((b) => {
                const Icon = b.icon
                const value = memory[b.key]
                return (
                  <li
                    key={b.key}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
                  >
                    <span
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                        b.chip,
                      )}
                      aria-hidden="true"
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-lg font-bold tabular-nums leading-tight text-foreground">
                        {faNum(value)}
                      </p>
                      <p className="truncate text-xs font-medium text-foreground">{b.label}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{b.hint}</p>
                    </div>
                  </li>
                )
              })}
            </ul>

            {/* 30-day growth of the stable set */}
            <div className="space-y-1.5 rounded-xl bg-muted/50 p-3">
              <div className="flex items-center gap-2 text-xs">
                <TrendingUp className="h-4 w-4 text-success" aria-hidden="true" />
                <span className="text-muted-foreground">روند واژه‌های پایدار (۳۰ روز اخیر)</span>
                <span
                  className={cn(
                    'mr-auto font-bold tabular-nums',
                    gained > 0 ? 'text-success' : 'text-muted-foreground',
                  )}
                >
                  {gained > 0 ? `+${faNum(gained)}` : faNum(gained)} واژه
                </span>
              </div>
              <GrowthSparkline points={growth} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
