import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Repeat2,
  Target,
  Clock,
  CalendarCheck,
  CalendarDays,
  Trophy,
  BrainCog,
  ArrowLeftRight,
  AlertTriangle,
  ArrowRight,
  Info,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StatTile } from '@/components/dashboard/StatTile'
import { MemoryOverview } from '@/components/dashboard/MemoryOverview'
import { ActivityHeatmap } from '@/components/dashboard/ActivityHeatmap'
import { useStats } from '@/hooks/useDashboard'
import { faNum, faPercent } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { DailyStat, LearningStats } from '@/types'

/** "۱۲ مرداد" — short Persian date for a YYYY-MM-DD key. */
function faShortDate(iso: string): string {
  return new Intl.DateTimeFormat('fa-IR', { month: 'long', day: 'numeric' }).format(
    new Date(`${iso}T12:00:00`),
  )
}

/** Reviews per day over the last 30 days. */
function DailyReviewsChart({ days }: { days: DailyStat[] }) {
  const max = useMemo(() => Math.max(1, ...days.map((d) => d.reviews)), [days])
  const total = useMemo(() => days.reduce((s, d) => s + d.reviews, 0), [days])

  if (total === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        در ۳۰ روز اخیر مروری ثبت نشده است.
      </p>
    )
  }

  return (
    <figure className="m-0 space-y-3">
      <figcaption className="text-xs text-muted-foreground">
        مجموع {faNum(total)} مرور — بیشترین {faNum(max)} در یک روز
      </figcaption>
      {/* dir=ltr so the oldest day sits on the left and time reads forward. */}
      <div dir="ltr" className="flex h-28 items-end gap-[3px]">
        {days.map((d) => (
          <span
            key={d.date}
            title={`${d.date} — ${d.reviews} مرور`}
            className={cn(
              'min-w-0 flex-1 rounded-t-sm',
              d.reviews > 0 ? 'bg-primary/70' : 'bg-muted',
            )}
            style={{ height: d.reviews > 0 ? `${Math.max(4, (d.reviews / max) * 100)}%` : '3%' }}
          />
        ))}
      </div>
      <div dir="ltr" className="flex justify-between text-[11px] text-muted-foreground">
        <span>{faShortDate(days[0].date)}</span>
        <span>{faShortDate(days[days.length - 1].date)}</span>
      </div>
    </figure>
  )
}

/** One labelled proportion bar. */
function ShareRow({
  label,
  value,
  total,
  bar,
  suffix,
}: {
  label: string
  value: number
  total: number
  bar: string
  suffix?: string
}) {
  const pct = total > 0 ? (value / total) * 100 : 0
  return (
    <li className="space-y-1.5">
      <div className="flex items-baseline gap-2 text-sm">
        <span className="text-foreground">{label}</span>
        <span className="mr-auto font-bold tabular-nums text-foreground">
          {faNum(value)}
          {suffix ?? ''}
        </span>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {faPercent(pct)}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <span className={cn('block h-full rounded-full', bar)} style={{ width: `${pct}%` }} />
      </div>
    </li>
  )
}

/** A single personal best. */
function RecordRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <li className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="mr-auto text-left">
        <span className="block font-bold tabular-nums text-foreground">{value}</span>
        {hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}
      </span>
    </li>
  )
}

function StatsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-[76px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-52 rounded-xl" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  )
}

/**
 * "چطور به اینجا رسیدم؟" — the long-form counterpart to the dashboard's
 * "الان کجا هستم؟". Everything here is replayed from the `review_events` log,
 * so it can answer historical questions the progress table cannot.
 */
export function StatisticsPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError } = useStats()

  return (
    <div dir="rtl" className="font-persian mx-auto max-w-5xl space-y-6">
      <header className="flex flex-col gap-3 pr-1.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
            <BarChart3 className="h-6 w-6 text-primary" aria-hidden="true" />
            آمار یادگیری
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            مسیری که تا اینجا آمده‌ای — بر پایه‌ی همه‌ی پاسخ‌های ثبت‌شده
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2 self-start sm:self-auto"
          onClick={() => navigate('/dashboard')}
        >
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
          بازگشت به داشبورد
        </Button>
      </header>

      {isLoading ? (
        <StatsSkeleton />
      ) : isError || !data ? (
        <Card className="px-6 py-12 text-center">
          <p className="text-sm font-medium text-destructive">خطا در بارگذاری آمار.</p>
          <p className="mt-1 text-xs text-muted-foreground">لطفاً بعداً دوباره تلاش کنید.</p>
        </Card>
      ) : (
        <StatsContent stats={data} onOpenHardWords={() => navigate('/hard-words')} />
      )}
    </div>
  )
}

function StatsContent({
  stats,
  onOpenHardWords,
}: {
  stats: LearningStats
  onOpenHardWords: () => void
}) {
  const { totals, records } = stats
  const answersTotal = totals.easy + totals.hard + totals.wrong

  return (
    <>
      {/* The log starts empty on upgrade — say so instead of showing bare zeros. */}
      {!stats.hasEvents && (
        <Card className="flex items-start gap-3 border-primary/30 bg-primary/5 p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <div className="text-sm">
            <p className="font-medium text-foreground">هنوز آماری ثبت نشده است</p>
            <p className="mt-1 text-muted-foreground">
              این صفحه از «دفترچه‌ی پاسخ‌ها» ساخته می‌شود که از این نسخه به بعد ثبت می‌شود. با
              اولین جلسه‌ی مطالعه پر می‌شود. بخش «وضعیت حافظه» از پیشرفت فعلی شما خوانده می‌شود و
              همین حالا هم درست است.
            </p>
          </div>
        </Card>
      )}

      {/* Headline numbers */}
      <section aria-label="خلاصه آمار" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={Repeat2} accent="primary" label="کل مرورها" value={faNum(totals.reviews)} />
        <StatTile icon={Target} accent="success" label="دقت کل" value={faPercent(stats.accuracy)} />
        <StatTile
          icon={Clock}
          accent="chart-5"
          label="زمان مطالعه"
          value={
            totals.studyMinutes >= 60
              ? `${faNum(Math.round(totals.studyMinutes / 60))} ساعت`
              : `${faNum(totals.studyMinutes)} دقیقه`
          }
          hint={`${faNum(totals.sessions)} جلسه`}
        />
        <StatTile
          icon={CalendarCheck}
          accent="warning"
          label="روزهای فعال"
          value={faNum(totals.activeDays)}
        />
      </section>

      {/* Memory + exact growth curve */}
      <MemoryOverview memory={stats.memory} growth={stats.growth} growthDays={90} growthExact />

      {/* Activity trend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-5 w-5 text-primary" aria-hidden="true" />
            مرورها در ۳۰ روز اخیر
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DailyReviewsChart days={stats.daily} />
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        {/* Answer split */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5 text-primary" aria-hidden="true" />
              توزیع پاسخ‌ها
            </CardTitle>
          </CardHeader>
          <CardContent>
            {answersTotal === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                هنوز پاسخی ثبت نشده است.
              </p>
            ) : (
              <ul className="space-y-3">
                <ShareRow label="آسان" value={totals.easy} total={answersTotal} bar="bg-success" />
                <ShareRow label="سخت" value={totals.hard} total={answersTotal} bar="bg-warning" />
                <ShareRow
                  label="دوباره"
                  value={totals.wrong}
                  total={answersTotal}
                  bar="bg-destructive"
                />
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Accuracy per direction */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowLeftRight className="h-5 w-5 text-primary" aria-hidden="true" />
              دقت به تفکیک جهت
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {stats.byMode.map((m) => (
                <li key={m.mode} className="space-y-1.5">
                  <div className="flex items-baseline gap-2 text-sm">
                    <span className="text-foreground">
                      {m.mode === 'EN_TO_FA' ? 'انگلیسی → فارسی' : 'فارسی → انگلیسی'}
                    </span>
                    <span className="mr-auto font-bold tabular-nums text-foreground">
                      {m.reviews > 0 ? faPercent(m.accuracy) : '—'}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-primary"
                      style={{ width: `${m.accuracy}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {faNum(m.reviews)} مرور
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {/* Retention quality */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BrainCog className="h-5 w-5 text-primary" aria-hidden="true" />
              کیفیت حافظه
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <RecordRow
                label="واژه‌های فراموش‌شده"
                value={faNum(stats.forgottenWords)}
                hint={`${faNum(totals.lapses)} بار فراموشی در کل`}
              />
              <RecordRow
                label="میانگین مرور تا تثبیت"
                value={stats.avgReviewsToStable > 0 ? faNum(stats.avgReviewsToStable) : '—'}
                hint="تعداد مرور لازم تا رسیدن به فاصله ۲۱ روز"
              />
              <RecordRow
                label="واژه‌های تازه معرفی‌شده"
                value={faNum(totals.newIntroduced)}
                hint="از زمان فعال شدن ثبت پاسخ‌ها"
              />
            </ul>
          </CardContent>
        </Card>

        {/* Personal bests */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-5 w-5 text-warning" aria-hidden="true" />
              رکوردها
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <RecordRow
                label="بیشترین مرور در یک روز"
                value={
                  records.bestDayReviews ? `${faNum(records.bestDayReviews.count)} مرور` : '—'
                }
                hint={
                  records.bestDayReviews ? faShortDate(records.bestDayReviews.date) : undefined
                }
              />
              <RecordRow
                label="بیشترین مطالعه در یک روز"
                value={
                  records.bestDayMinutes ? `${faNum(records.bestDayMinutes.minutes)} دقیقه` : '—'
                }
                hint={
                  records.bestDayMinutes ? faShortDate(records.bestDayMinutes.date) : undefined
                }
              />
              <RecordRow
                label="بهترین هفته"
                value={
                  records.bestWeekReviews ? `${faNum(records.bestWeekReviews.count)} مرور` : '—'
                }
                hint={
                  records.bestWeekReviews
                    ? `از ${faShortDate(records.bestWeekReviews.weekStart)}`
                    : undefined
                }
              />
              <RecordRow
                label="طولانی‌ترین پشتکار"
                value={`${faNum(records.longestStreak)} روز`}
              />
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* Hardest words */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-warning" aria-hidden="true" />
            سخت‌ترین واژه‌ها
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats.hardestWords.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              فعلاً واژه‌ی دردسرسازی نداری — عالیه! 🎉
            </p>
          ) : (
            <>
              <ul className="divide-y divide-border">
                {stats.hardestWords.map((w, i) => (
                  <li key={w.wordId} className="flex items-center gap-3 py-2.5">
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold tabular-nums text-muted-foreground"
                      aria-hidden="true"
                    >
                      {faNum(i + 1)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        dir="ltr"
                        className="block truncate text-right text-sm font-semibold text-foreground"
                      >
                        {w.eng}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">{w.per}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-medium tabular-nums text-warning">
                      {w.hardCount >= w.wrongCount
                        ? `${faNum(w.hardCount)} بار سخت`
                        : `${faNum(w.wrongCount)} بار غلط`}
                    </span>
                  </li>
                ))}
              </ul>
              <Button variant="outline" size="sm" className="w-full" onClick={onOpenHardWords}>
                دیدن همه واژه‌های سخت
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Long-range activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-5 w-5 text-primary" aria-hidden="true" />
            نقشه فعالیت
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 pl-3 pr-4 sm:p-6">
          <ActivityHeatmap days={stats.heatmap} />
        </CardContent>
      </Card>
    </>
  )
}
