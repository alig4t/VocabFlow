import { Flame, Repeat2, Clock, Target } from 'lucide-react'
import { StatTile } from './StatTile'
import { faNum, faPercent } from '../../lib/format'
import type { DashboardGlobalStats } from '../../types'

interface GlobalStatsProps {
  stats: DashboardGlobalStats
}

/**
 * Four "how am I doing" tiles. Deliberately *not* six: the learned-words count
 * now lives (with far more meaning) in the memory breakdown, and the book count
 * is already obvious from the "کتاب‌های من" section below.
 *
 * Units live in the hint line so the numeral itself can be the loud part, and
 * every tile has a written zero state — four «۰» in a row reads as a broken
 * dashboard rather than a new account.
 */
export function GlobalStats({ stats }: GlobalStatsProps) {
  // accuracyRate is 0 both when there are no answers and when every answer was
  // wrong; the latter effectively never happens, so treat 0 as "no data yet".
  const noReviews = stats.accuracyRate === 0

  return (
    <section aria-label="آمار کلی" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatTile
        icon={Flame}
        accent="warning"
        label="پشتکار"
        value={faNum(stats.currentStreak)}
        hint="روز متوالی"
        empty={stats.currentStreak === 0}
        emptyLabel="هنوز شروع نشده"
      />
      <StatTile
        icon={Target}
        accent="success"
        label="دقت"
        value={faPercent(stats.accuracyRate)}
        hint="پاسخ‌های درست"
        empty={noReviews}
        emptyLabel="هنوز مروری نداری"
      />
      <StatTile
        icon={Repeat2}
        accent="primary"
        label="مرور امروز"
        value={faNum(stats.reviewsToday)}
        hint="واژه"
        empty={stats.reviewsToday === 0}
        emptyLabel="امروز شروع نشده"
      />
      <StatTile
        icon={Clock}
        accent="chart-5"
        label="میانگین مطالعه"
        value={faNum(stats.avgStudyMinutes)}
        hint="دقیقه در هر جلسه"
        empty={stats.avgStudyMinutes === 0}
        emptyLabel="هنوز جلسه‌ای نبوده"
      />
    </section>
  )
}
