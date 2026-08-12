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
 */
export function GlobalStats({ stats }: GlobalStatsProps) {
  return (
    <section aria-label="آمار کلی" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatTile
        icon={Flame}
        accent="warning"
        label="پشتکار"
        value={`${faNum(stats.currentStreak)} روز`}
        hint="روزهای متوالی"
      />
      <StatTile
        icon={Target}
        accent="success"
        label="دقت"
        value={faPercent(stats.accuracyRate)}
      />
      <StatTile
        icon={Repeat2}
        accent="primary"
        label="مرور امروز"
        value={faNum(stats.reviewsToday)}
      />
      <StatTile
        icon={Clock}
        accent="chart-5"
        label="میانگین مطالعه"
        value={`${faNum(stats.avgStudyMinutes)} دقیقه`}
        hint="در هر جلسه"
      />
    </section>
  )
}
