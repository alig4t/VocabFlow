import { CheckCircle2, XCircle, AlertTriangle, SkipForward, Clock, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Every count here is a number of WORDS, not of button presses — one outcome per
 * word however many times it came around in the session.
 */
export interface SessionStats {
  /** Words that got a real answer = `correctCount + wrongCount`. */
  reviewedCount: number
  /** Words answered right without ever slipping. */
  correctCount: number
  /**
   * Words that needed a second look ("بلد نیستم" at least once). Reading a
   * brand-new word for the first time ("خواندم") is NOT a mistake, even though
   * it sends AGAIN to the SM-2 scheduler — it counts in `newCount` instead.
   */
  wrongCount: number
  /** Words answered "سخت" at least once (a subset of the answered words). */
  hardCount: number
  /** Words skipped and never answered afterwards. */
  skippedCount: number
  /** Brand-new words introduced (read) in this session. */
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
   * A short word shown after the number (e.g. "واژه") to make it clear this
   * counts DISTINCT WORDS, not button presses — a word answered wrong and then
   * right again is counted once, as wrong.
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
        {/* A session of only new-word reads has nothing to score — show a dash
            instead of a discouraging 0٪. */}
        <div className="text-5xl font-extrabold tabular-nums text-primary">
          {answered > 0 ? `${successPercent}٪` : '—'}
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          {answered > 0 ? 'درصد موفقیت' : 'فقط واژه جدید خواندید'}
        </div>
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
          unit="واژه"
          tone="text-green-500"
        />
        <StatTile
          icon={<XCircle className="h-5 w-5" />}
          label="نادرست"
          value={stats.wrongCount}
          unit="واژه"
          tone="text-red-500"
        />
        <StatTile
          icon={<AlertTriangle className="h-5 w-5" />}
          label="سخت"
          value={stats.hardCount}
          unit="واژه"
          tone="text-amber-500"
        />
        <StatTile
          icon={<SkipForward className="h-5 w-5" />}
          label="رد شده"
          value={stats.skippedCount}
          unit="واژه"
          tone="text-muted-foreground"
        />
        <StatTile
          icon={<Sparkles className="h-5 w-5" />}
          label="واژه جدید (خوانده‌شده)"
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
        مجموع واژگان مرورشده: <span className="font-semibold text-foreground">{stats.reviewedCount}</span> واژه
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
