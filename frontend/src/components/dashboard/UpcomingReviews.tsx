import { useMemo } from 'react'
import { faNum } from '../../lib/format'
import { cn } from '../../lib/utils'
import type { UpcomingDay } from '../../types'

interface UpcomingReviewsProps {
  days: UpcomingDay[]
}

/** امروز / فردا / پس‌فردا, then the Persian weekday name. */
function dayLabel(iso: string, index: number): string {
  if (index === 0) return 'امروز'
  if (index === 1) return 'فردا'
  const d = new Date(`${iso}T12:00:00`)
  return new Intl.DateTimeFormat('fa-IR', { weekday: 'short' }).format(d)
}

/**
 * Seven-day review forecast straight out of SM-2's `next_review_at`.
 * Day 0 folds in everything overdue — it is exactly what today's queue serves.
 *
 * Drawn as a timeline rather than a bar chart: the seven days are a sequence
 * you move along, and a row of connected nodes says that where seven vertical
 * bars only said "compare these". Node size tracks the load, so a heavy day is
 * still visible at a glance, and today is filled rather than outlined.
 */
export function UpcomingReviews({ days }: UpcomingReviewsProps) {
  const max = useMemo(() => Math.max(1, ...days.map((d) => d.count)), [days])
  const total = useMemo(() => days.reduce((s, d) => s + d.count, 0), [days])

  if (total === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        در هفت روز آینده مروری برنامه‌ریزی نشده است.
      </p>
    )
  }

  return (
    <figure className="m-0 space-y-5">
      <figcaption className="text-xs text-muted-foreground">
        مجموع {faNum(total)} مرور در ۷ روز آینده
        {days[0].count > 0 && (
          <span className="block pt-0.5 text-[11px]">
            «امروز» مرورهای عقب‌افتاده را هم در خود دارد.
          </span>
        )}
      </figcaption>

      {/* The connecting rail sits behind the nodes; RTL puts "امروز" at the right. */}
      <div className="relative">
        <span
          aria-hidden="true"
          className="absolute inset-x-4 top-[2.35rem] h-px bg-border"
        />

        <ol className="relative flex justify-between gap-1">
          {days.map((day, i) => {
            const isToday = i === 0
            const load = day.count / max
            // 26px empty → 46px at the busiest day; enough spread to read,
            // never so large that two neighbours collide on a narrow phone.
            const size = day.count === 0 ? 26 : 26 + load * 20
            return (
              <li key={day.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <span className="text-[11px] font-bold tabular-nums text-foreground">
                  {day.count > 0 ? faNum(day.count) : '—'}
                </span>

                <span className="flex h-12 items-center justify-center">
                  <span
                    className={cn(
                      'flex items-center justify-center rounded-full ring-4 ring-card transition-transform',
                      day.count === 0
                        ? 'border border-dashed border-border bg-card'
                        : isToday
                          ? 'bg-primary'
                          : 'bg-violet/25',
                    )}
                    style={{ width: size, height: size }}
                    title={`${day.date} — ${day.count} مرور`}
                  >
                    {isToday && day.count > 0 && (
                      <span className="h-2 w-2 rounded-full bg-primary-foreground" />
                    )}
                  </span>
                </span>

                <span
                  className={cn(
                    'w-full truncate text-center text-[11px]',
                    isToday ? 'font-bold text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {dayLabel(day.date, i)}
                </span>
              </li>
            )
          })}
        </ol>
      </div>
    </figure>
  )
}
