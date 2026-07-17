import { useMemo } from 'react'
import { faNum } from '../../lib/format'
import type { HeatmapDay } from '../../types'

interface ActivityHeatmapProps {
  days: HeatmapDay[]
}

/** Map a session count to one of five intensity buckets. */
function level(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0
  if (count < 5) return 1
  if (count < 10) return 2
  if (count < 16) return 3
  return 4
}

export function ActivityHeatmap({ days }: ActivityHeatmapProps) {
  // Group consecutive days into week columns of 7 (oldest → newest).
  const weeks = useMemo(() => {
    const out: HeatmapDay[][] = []
    for (let i = 0; i < days.length; i += 7) out.push(days.slice(i, i + 7))
    return out
  }, [days])

  const totalSessions = useMemo(() => days.reduce((s, d) => s + d.count, 0), [days])
  const activeDays = useMemo(() => days.filter((d) => d.count > 0).length, [days])

  return (
    <figure className="m-0">
      {/* Accessible summary — the cells themselves are decorative. */}
      <figcaption className="sr-only">
        نقشه فعالیت {faNum(days.length)} روز گذشته: {faNum(activeDays)} روز فعال و{' '}
        {faNum(totalSessions)} جلسه مرور.
      </figcaption>

      {/* Cells flex to fill the card width (newest week on the right, RTL-friendly). */}
      <div dir="ltr" className="w-full pb-1">
        <div className="flex w-full flex-row-reverse gap-[3px] sm:gap-1" aria-hidden="true">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex min-w-0 flex-1 flex-col gap-[3px] sm:gap-1">
              {week.map((day) => (
                <span
                  key={day.date}
                  className={`heat-${level(day.count)} aspect-square w-full rounded-[3px]`}
                  title={`${day.date} — ${day.count} مرور`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span>کمتر</span>
        <span className="heat-0 h-3 w-3 rounded-[3px]" />
        <span className="heat-1 h-3 w-3 rounded-[3px]" />
        <span className="heat-2 h-3 w-3 rounded-[3px]" />
        <span className="heat-3 h-3 w-3 rounded-[3px]" />
        <span className="heat-4 h-3 w-3 rounded-[3px]" />
        <span>بیشتر</span>
      </div>
    </figure>
  )
}
