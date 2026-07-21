import { CheckCircle2, XCircle, AlertTriangle, SkipForward, Clock, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface SessionStats {
  reviewedCount: number
  correctCount: number
  wrongCount: number
  hardCount: number
  skippedCount: number
  newCount: number
  durationSec: number
}

interface SessionSummaryScreenProps {
  stats: SessionStats
  onHome: () => void
  onAgain: () => void
  /** True while the session record is still being saved. */
  saving?: boolean
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (m === 0) return `${s} ثانیه`
  return `${m} دقیقه${s > 0 ? ` و ${s} ثانیه` : ''}`
}

function StatTile({
  icon,
  label,
  value,
  tone,
  unit,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  tone: string
  /**
   * A short word shown after the number (e.g. "بار") to make it clear this
   * counts ANSWER EVENTS, not distinct words — a word answered wrong then
   * right again shows up as two separate counts, one in each tile.
   */
  unit?: string
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card px-3 py-4">
      <span className={tone}>{icon}</span>
      <span className="flex items-baseline gap-1">
        <span className="text-2xl font-bold tabular-nums text-foreground">{value}</span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

export function SessionSummaryScreen({ stats, onHome, onAgain, saving }: SessionSummaryScreenProps) {
  const answered = stats.correctCount + stats.wrongCount
  const successPercent = answered > 0 ? Math.round((stats.correctCount / answered) * 100) : 0

  return (
    <div dir="rtl" className="font-persian mx-auto max-w-2xl space-y-6 px-4 py-8 text-center">
      <div className="space-y-2">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">مطالعه امروز تمام شد! 🎉</h1>
        <p className="text-sm text-muted-foreground">خلاصه‌ی این جلسه را ببینید.</p>
      </div>

      {/* Success ring */}
      <div className="rounded-2xl border border-border bg-card px-6 py-6">
        <div className="text-5xl font-extrabold tabular-nums text-primary">{successPercent}٪</div>
        <div className="mt-1 text-sm text-muted-foreground">درصد موفقیت</div>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${successPercent}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-3">
        <StatTile
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="درست"
          value={stats.correctCount}
          unit="بار"
          tone="text-green-500"
        />
        <StatTile
          icon={<XCircle className="h-5 w-5" />}
          label="نادرست"
          value={stats.wrongCount}
          unit="بار"
          tone="text-red-500"
        />
        <StatTile
          icon={<AlertTriangle className="h-5 w-5" />}
          label="سخت"
          value={stats.hardCount}
          unit="بار"
          tone="text-amber-500"
        />
        <StatTile
          icon={<SkipForward className="h-5 w-5" />}
          label="رد شده"
          value={stats.skippedCount}
          unit="بار"
          tone="text-muted-foreground"
        />
        <StatTile
          icon={<Sparkles className="h-5 w-5" />}
          label="لغت جدید"
          value={stats.newCount}
          tone="text-primary"
        />
        <StatTile
          icon={<Clock className="h-5 w-5" />}
          label="مدت"
          value={formatDuration(stats.durationSec)}
          tone="text-blue-500"
        />
      </div>

      <p className="text-sm text-muted-foreground">
        مجموع مرور شده: <span className="font-semibold text-foreground">{stats.reviewedCount}</span> بار
      </p>

      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button onClick={onHome} className="w-full sm:w-auto" disabled={saving}>
          بازگشت به خانه
        </Button>
        <Button onClick={onAgain} variant="outline" className="w-full sm:w-auto" disabled={saving}>
          مطالعه‌ی دوباره
        </Button>
      </div>
    </div>
  )
}
