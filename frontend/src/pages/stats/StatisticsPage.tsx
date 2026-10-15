import type { HTMLAttributes } from "react";
import { useNavigate } from "react-router-dom";
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
  Info,
  Flame,
  BookCheck,
  AlarmClock,
} from "lucide-react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile } from "@/components/dashboard/StatTile";
import { MemoryOverview } from "@/components/dashboard/MemoryOverview";
import { PremiumContent } from "../../components/subscription/PremiumGate";
import { ActivityHeatmap } from "@/components/dashboard/ActivityHeatmap";
import { DailyReviewsChart } from "@/components/dashboard/DailyReviewsChart";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Reveal } from "@/components/ui/reveal";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import { useStats, useDashboard } from "@/hooks/useDashboard";
import { faNum, faPercent, faStudyDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { LearningStats } from "@/types";

/** "۱۲ مرداد" — short Persian date for a YYYY-MM-DD key. */
const faShortDate = faStudyDate;

/** Match dashboard surfaces locally, without changing shared cards elsewhere. */
function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <Reveal className="h-full">
      <div
        className={cn(
          "surface h-full rounded-3xl text-card-foreground",
          className,
        )}
        {...props}
      />
    </Reveal>
  );
}

/** One labelled proportion bar. */
function ShareRow({
  label,
  value,
  total,
  bar,
  suffix,
}: {
  label: string;
  value: number;
  total: number;
  bar: string;
  suffix?: string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  const { ref, entered } = useInViewOnce<HTMLLIElement>();
  return (
    <li ref={ref} className="space-y-1.5">
      <div className="flex items-baseline gap-2 text-sm">
        <span className="text-foreground">{label}</span>
        <span className="mr-auto font-bold tabular-nums text-foreground">
          {faNum(value)}
          {suffix ?? ""}
        </span>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {faPercent(pct)}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <span
          data-entered={entered}
          className={cn("chart-share-fill block h-full rounded-full", bar)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </li>
  );
}

/** A single personal best. */
function RecordRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <li className="surface-sunken flex items-center gap-3 rounded-2xl p-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="mr-auto text-left">
        <span className="block font-bold tabular-nums text-foreground">
          {value}
        </span>
        {hint && (
          <span className="block text-[11px] text-muted-foreground">
            {hint}
          </span>
        )}
      </span>
    </li>
  );
}

function StatsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton
            key={i}
            className="h-[88px] rounded-3xl last:max-sm:col-span-2"
          />
        ))}
      </div>
      <Skeleton className="h-32 rounded-3xl" />
      <Skeleton className="h-64 rounded-3xl" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    </div>
  );
}

/**
 * "چطور به اینجا رسیدم؟" — the long-form counterpart to the dashboard's
 * "الان کجا هستم؟". Everything here is replayed from the `review_events` log,
 * so it can answer historical questions the progress table cannot.
 */
export function StatisticsPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useStats();
  // Present-state numbers the review log can't answer (current streak, learned
  // words, due queue) come from the dashboard endpoint — both online & offline.
  const { data: dash } = useDashboard();

  return (
    <div
      dir="rtl"
      className="statistics-page page-atmosphere font-persian mx-auto max-w-5xl space-y-6"
    >
      <header className="ui-enter flex flex-col gap-3 pr-1.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
            <BarChart3 className="h-6 w-6 text-primary" aria-hidden="true" />
            آمار یادگیری
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            مسیری که تا اینجا آمده‌ای — بر پایه‌ی همه‌ی پاسخ‌های ثبت‌شده
          </p>
        </div>
        {/*<Button*/}
        {/*  variant="outline"*/}
        {/*  className="gap-2 self-start sm:self-auto"*/}
        {/*  onClick={() => navigate("/dashboard")}*/}
        {/*>*/}
        {/*  <ArrowRight className="h-4 w-4" aria-hidden="true" />*/}
        {/*  بازگشت به داشبورد*/}
        {/*</Button>*/}
      </header>

      {isLoading ? (
        <StatsSkeleton />
      ) : isError || !data ? (
        <Card className="px-6 py-12 text-center">
          <p className="text-sm font-medium text-destructive">
            خطا در بارگذاری آمار.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            لطفاً بعداً دوباره تلاش کنید.
          </p>
        </Card>
      ) : (
        <StatsContent
          stats={data}
          currentStreak={dash?.stats.currentStreak ?? 0}
          learnedWords={dash?.stats.totalWordsLearned ?? 0}
          dueNow={(dash?.queue ?? []).reduce((s, q) => s + q.dueCount, 0)}
          onOpenHardWords={() => navigate("/hard-words")}
        />
      )}
    </div>
  );
}

function StatsContent({
  stats,
  currentStreak,
  learnedWords,
  dueNow,
  onOpenHardWords,
}: {
  stats: LearningStats;
  currentStreak: number;
  learnedWords: number;
  dueNow: number;
  onOpenHardWords: () => void;
}) {
  const { totals, records } = stats;
  const answersTotal = totals.easy + totals.hard + totals.wrong;

  return (
    <>
      {/* The log starts empty on upgrade — say so instead of showing bare zeros. */}
      {!stats.hasEvents && (
        <Card className="flex items-start gap-3 border-primary/30 bg-primary/5 p-4">
          <Info
            className="mt-0.5 h-5 w-5 shrink-0 text-primary"
            aria-hidden="true"
          />
          <div className="text-sm">
            <p className="font-medium text-foreground">
              هنوز آماری ثبت نشده است
            </p>
            <p className="mt-1 text-muted-foreground">
              این صفحه از «دفترچه‌ی پاسخ‌ها» ساخته می‌شود که از این نسخه به بعد
              ثبت می‌شود. با اولین جلسه‌ی مطالعه پر می‌شود. بخش «وضعیت حافظه» از
              پیشرفت فعلی شما خوانده می‌شود و همین حالا هم درست است.
            </p>
          </div>
        </Card>
      )}

      {/* Headline numbers */}
      <Reveal>
        <section
          aria-label="خلاصه آمار"
          className="statistics-headline surface grid grid-cols-2 gap-1 rounded-3xl p-2 sm:grid-cols-3 sm:p-3"
        >
          <StatTile
            icon={Flame}
            accent="warning"
            label="روزهای پیاپی"
            value={<AnimatedNumber value={currentStreak} />}
            hint="روز پیاپی"
            empty={currentStreak === 0}
            emptyLabel="با مطالعه‌ی امروز شروع می‌شود"
          />
          <StatTile
            icon={BookCheck}
            accent="mint"
            label="واژه‌های یادگرفته"
            value={<AnimatedNumber value={learnedWords} />}
            empty={learnedWords === 0}
            emptyLabel="با اولین جلسه پر می‌شود"
          />
          <StatTile
            icon={AlarmClock}
            accent="violet"
            label="موعد مرور امروز"
            value={<AnimatedNumber value={dueNow} />}
            hint={dueNow > 0 ? "آماده‌ی مرور" : undefined}
            empty={dueNow === 0}
            emptyLabel="چیزی عقب نیفتاده"
          />
        </section>
      </Reveal>

      <Reveal>
        <section
          aria-label="کارنامه مطالعه"
          className="surface grid grid-cols-2 gap-1 rounded-3xl p-2 sm:p-3 lg:grid-cols-4"
        >
          <StatTile
            icon={Repeat2}
            accent="primary"
            label="کل مرورها"
            value={<AnimatedNumber value={totals.reviews} />}
          />
          <StatTile
            icon={Target}
            accent="mint"
            label="دقت کل"
            value={<AnimatedNumber value={stats.accuracy} percent />}
          />
          <StatTile
            icon={Clock}
            accent="violet"
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
            value={<AnimatedNumber value={totals.activeDays} />}
          />
        </section>
      </Reveal>

      {/* Memory + exact growth curve */}
      <MemoryOverview
        memory={stats.memory}
        growth={stats.growth}
        growthDays={90}
        growthExact
      />

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
                <ShareRow
                  label="آسان"
                  value={totals.easy}
                  total={answersTotal}
                  bar="bg-success"
                />
                <ShareRow
                  label="سخت"
                  value={totals.hard}
                  total={answersTotal}
                  bar="bg-warning"
                />
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
              <ArrowLeftRight
                className="h-5 w-5 text-primary"
                aria-hidden="true"
              />
              دقت به تفکیک جهت
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {stats.byMode.map((m) => (
                <li key={m.mode} className="space-y-1.5">
                  <div className="flex items-baseline gap-2 text-sm">
                    <span className="text-foreground">
                      {m.mode === "EN_TO_FA"
                        ? "انگلیسی → فارسی"
                        : "فارسی → انگلیسی"}
                    </span>
                    <span className="mr-auto font-bold tabular-nums text-foreground">
                      {m.reviews > 0 ? faPercent(m.accuracy) : "—"}
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
                value={
                  stats.avgReviewsToStable > 0
                    ? faNum(stats.avgReviewsToStable)
                    : "—"
                }
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
                  records.bestDayReviews
                    ? `${faNum(records.bestDayReviews.count)} مرور`
                    : "—"
                }
                hint={
                  records.bestDayReviews
                    ? faShortDate(records.bestDayReviews.date)
                    : undefined
                }
              />
              <RecordRow
                label="بیشترین مطالعه در یک روز"
                value={
                  records.bestDayMinutes
                    ? `${faNum(records.bestDayMinutes.minutes)} دقیقه`
                    : "—"
                }
                hint={
                  records.bestDayMinutes
                    ? faShortDate(records.bestDayMinutes.date)
                    : undefined
                }
              />
              <RecordRow
                label="بهترین هفته"
                value={
                  records.bestWeekReviews
                    ? `${faNum(records.bestWeekReviews.count)} مرور`
                    : "—"
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
            <AlertTriangle
              className="h-5 w-5 text-warning"
              aria-hidden="true"
            />
            سخت‌ترین واژه‌ها
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <PremiumContent>
            {stats.hardestWords.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                فعلاً واژه‌ی دردسرسازی نداری — عالیه! 🎉
              </p>
            ) : (
              <>
                <ul className="divide-y divide-border">
                  {stats.hardestWords.map((w, i) => (
                    <li
                      key={w.wordId}
                      className="flex items-center gap-3 py-2.5"
                    >
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
                        <span className="block truncate text-xs text-muted-foreground">
                          {w.per}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-medium tabular-nums text-warning">
                        {w.hardCount >= w.wrongCount
                          ? `${faNum(w.hardCount)} بار سخت`
                          : `${faNum(w.wrongCount)} بار غلط`}
                      </span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={onOpenHardWords}
                >
                  دیدن همه واژه‌های سخت
                </Button>
              </>
            )}
          </PremiumContent>
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
  );
}
