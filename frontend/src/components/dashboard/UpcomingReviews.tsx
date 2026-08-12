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
    <figure className="m-0 space-y-3">
      <figcaption className="text-xs text-muted-foreground">
        مجموع {faNum(total)} مرور در ۷ روز آینده
      </figcaption>

      {/* Bars grow upward; RTL order puts "امروز" on the right. */}
      <div className="flex h-32 items-end gap-1.5 sm:gap-2">
        {days.map((day, i) => {
          const height = day.count > 0 ? Math.max(6, (day.count / max) * 100) : 2
          return (
            <div key={day.date} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <span className="text-[11px] font-semibold tabular-nums text-foreground">
                {day.count > 0 ? faNum(day.count) : '—'}
              </span>
              <div className="flex w-full flex-1 items-end">
                <span
                  className={cn(
                    'w-full rounded-t-md transition-[height]',
                    i === 0 ? 'bg-primary' : day.count > 0 ? 'bg-primary/35' : 'bg-muted',
                  )}
                  style={{ height: `${height}%` }}
                  title={`${day.date} — ${day.count} مرور`}
                />
              </div>
              <span className="w-full truncate text-center text-[11px] text-muted-foreground">
                {dayLabel(day.date, i)}
              </span>
            </div>
          )
        })}
      </div>
    </figure>
  )
}
