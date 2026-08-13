import { useMemo } from 'react'
import { Brain, Sprout, Leaf, TreeDeciduous, TrendingUp } from 'lucide-react'
import { ProgressRing } from './ProgressRing'
import { faNum } from '../../lib/format'
import { cn } from '../../lib/utils'
import type { GrowthPoint, MemoryBreakdown } from '../../types'

interface MemoryOverviewProps {
  memory: MemoryBreakdown
  growth: GrowthPoint[]
  /** Window the curve covers, for the caption. Defaults to the dashboard's 30. */
  growthDays?: number
  /**
   * The dashboard's curve is reconstructed backwards and only approximate; the
   * statistics page replays `review_events` and is exact. Drops the hedge.
   */
  growthExact?: boolean
}

const BUCKETS = [
  {
    key: 'fresh' as const,
    icon: Sprout,
    label: 'تازه',
    hint: 'تازه وارد چرخه مرور شده',
    ring: 'stroke-violet',
    chip: 'bg-violet/10 text-violet',
  },
  {
    key: 'learning' as const,
    icon: Leaf,
    label: 'در حال یادگیری',
    hint: 'هنوز به فاصله مرور بلند نرسیده',
    ring: 'stroke-warning',
    chip: 'bg-warning/15 text-warning',
  },
  {
    key: 'stable' as const,
    icon: TreeDeciduous,
    label: 'پایدار',
    hint: 'فاصله مرور بیش از ۲۱ روز',
    ring: 'stroke-mint',
    chip: 'bg-mint/10 text-mint',
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
      <path d={`${path} L100,32 L0,32 Z`} className="fill-mint/10" />
      <path
        d={path}
        fill="none"
        className="stroke-mint"
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
export function MemoryOverview({
  memory,
  growth,
  growthDays = 30,
  growthExact = false,
}: MemoryOverviewProps) {
  const total = memory.total
  const gained = growth.length > 1 ? growth[growth.length - 1].count - growth[0].count : 0

  return (
    <section className="surface rounded-3xl p-5 sm:p-6">
      <header className="pb-5">
        <div className="flex items-center gap-3">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground"
            aria-hidden="true"
          >
            <Brain className="h-4 w-4" />
          </span>
          <span className="text-lg font-bold">
            <span className="text-accent-foreground">وضعیت</span> حافظه
          </span>
          <span className="mr-auto text-xs font-normal text-muted-foreground">
            {faNum(total)} واژه در چرخه مرور
          </span>
        </div>
      </header>

      <div className="space-y-6">
        {total === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            هنوز واژه‌ای وارد چرخه مرور نشده — با شروع مطالعه امروز اینجا پر می‌شود.
          </p>
        ) : (
          <>
            {/*
              Segmented dial + legend. The ring shows the split; the number in
              the middle answers the question people actually ask of this card —
              "how much of my vocabulary is safe?"
            */}
            <div className="flex flex-col items-center gap-7 sm:flex-row sm:gap-10">
              <ProgressRing
                segments={BUCKETS.map((b) => ({
                  value: memory[b.key],
                  className: b.ring,
                }))}
                thickness={13}
                glow="mint"
                trackClassName="stroke-muted"
                className="h-40 w-40 shrink-0"
                label={`تازه ${memory.fresh}، در حال یادگیری ${memory.learning}، پایدار ${memory.stable}`}
              >
                <span className="text-4xl font-black tabular-nums text-foreground">
                  {faNum(Math.round((memory.stable / total) * 100))}٪
                </span>
                <span className="mt-2 text-[11px] font-medium text-muted-foreground">
                  پایدار
                </span>
              </ProgressRing>

              {/*
                The legend reads across, not down: three numbers side by side
                compare at a glance, where three stacked rows read as a table.
              */}
              <ul className="grid w-full flex-1 grid-cols-3 gap-2">
                {BUCKETS.map((b) => {
                  const Icon = b.icon
                  const value = memory[b.key]
                  const share = Math.round((value / total) * 100)
                  return (
                    <li
                      key={b.key}
                      className="surface-sunken flex flex-col items-center gap-1.5 rounded-2xl px-2 py-4 text-center"
                    >
                      <span
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                          b.chip,
                        )}
                        aria-hidden="true"
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <p className="text-xl font-black tabular-nums leading-none text-foreground">
                        {faNum(value)}
                      </p>
                      <p className="text-[11px] font-medium leading-tight text-foreground">
                        {b.label}
                      </p>
                      <p className="text-[11px] tabular-nums text-muted-foreground">
                        {faNum(share)}٪
                      </p>
                    </li>
                  )
                })}
              </ul>
            </div>

            {/* 30-day growth of the stable set */}
            <div className="surface-sunken space-y-1.5 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-xs">
                <TrendingUp className="h-4 w-4 text-mint" aria-hidden="true" />
                <span className="text-muted-foreground">
                  روند واژه‌های پایدار ({faNum(growthDays)} روز اخیر
                  {growthExact ? '' : ' — تقریبی'})
                </span>
                <span
                  className={cn(
                    'mr-auto font-bold tabular-nums',
                    gained > 0 ? 'text-mint' : 'text-muted-foreground',
                  )}
                >
                  {gained > 0 ? `+${faNum(gained)}` : faNum(gained)} واژه
                </span>
              </div>
              <GrowthSparkline points={growth} />
            </div>
          </>
        )}
      </div>
    </section>
  )
}
