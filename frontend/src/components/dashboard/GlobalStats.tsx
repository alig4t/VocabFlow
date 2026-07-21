import { Flame, GraduationCap, Repeat2, Library, Clock, Target, Zap } from 'lucide-react'
import { StatTile } from './StatTile'
import { faNum, faPercent } from '../../lib/format'
import type { DashboardGlobalStats } from '../../types'

interface GlobalStatsProps {
  stats: DashboardGlobalStats
}

export function GlobalStats({ stats }: GlobalStatsProps) {
  return (
    <section aria-label="آمار کلی" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
      <StatTile
        icon={Flame}
        accent="warning"
        label="پشتکار"
        value={`${faNum(stats.currentStreak)} روز`}
        hint="روزهای متوالی"
      />
      <StatTile
        icon={GraduationCap}
        accent="success"
        label="لغات یادگرفته"
        value={faNum(stats.totalWordsLearned)}
      />
      <StatTile
        icon={Repeat2}
        accent="primary"
        label="مرور امروز"
        value={faNum(stats.reviewsToday)}
      />
      <StatTile
        icon={Library}
        accent="chart-5"
        label="کتاب‌های من"
        value={faNum(stats.watchlistCount)}
      />
      <StatTile
        icon={Clock}
        accent="primary"
        label="میانگین مطالعه"
        value={`${faNum(stats.avgStudyMinutes)} دقیقه`}
        hint="در روز"
      />
      <StatTile
        icon={Target}
        accent="success"
        label="دقت"
        value={faPercent(stats.accuracyRate)}
      />
      <StatTile
        icon={Zap}
        accent="warning"
        label="سخت‌ها امروز"
        value={faNum(stats.hardToday)}
      />
    </section>
  )
}
