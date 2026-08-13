import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { GraduationCap, Sparkles, RefreshCw, CheckCircle2, Flame, Target, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ProgressRing } from '@/components/dashboard/ProgressRing'
import { useStudyToday } from '@/hooks/useStudy'
import { faNum } from '@/lib/format'

interface StudyTodayHeroProps {
  /** Consecutive study days, from the dashboard aggregate. Hidden at zero. */
  streak?: number
}

/** A pill on the navy panel: quiet surface, legible text, no borders. */
function HeroChip({
  icon: Icon,
  children,
}: {
  icon: typeof Flame
  children: ReactNode
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-hero-foreground">
      <Icon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
      {children}
    </span>
  )
}

/**
 * The one thing the dashboard has to answer in three seconds: what do I do
 * today, and how far in am I?
 *
 * A dark full-bleed panel with a single progress dial and a single call to
 * action. Everything else on the page is deliberately quieter than this.
 */
export function StudyTodayHero({ streak = 0 }: StudyTodayHeroProps) {
  const navigate = useNavigate()
  const { data, isLoading } = useStudyToday()

  if (isLoading) return <Skeleton className="h-56 rounded-3xl" />
  if (!data) return null

  const { dueCount, newCount, hasPlans, plans, reviewedToday } = data.meta
  const remaining = dueCount + newCount
  const plan = plans[0]

  // No learning plans yet — the dashboard's empty state guides to the library.
  if (!hasPlans) return null

  // Today's whole workload = what's left plus what's already been answered.
  const planned = remaining + reviewedToday
  const progress = planned > 0 ? (reviewedToday / planned) * 100 : 100
  const done = remaining === 0

  const lessonLabel =
    plan && plan.currentLesson != null
      ? `${plan.continueLesson ? 'ادامه‌ی' : 'شروع'} درس ${plan.currentLesson} · ${plan.bookTitle}`
      : null

  return (
    <section className="edge-slant relative overflow-hidden rounded-3xl bg-hero px-5 pt-6 text-hero-foreground shadow-soft sm:px-8 sm:pt-8">
      {/* Ambient gold wash behind the dial — decorative only. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-16 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl"
      />

      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
        {/* The dial: fill is today's progress, centre is what's still waiting. */}
        <ProgressRing
          value={progress}
          gradient
          thickness={8}
          trackClassName="stroke-[rgb(255_255_255_/_0.14)]"
          className="mx-auto h-32 w-32 sm:mx-0 sm:h-36 sm:w-36"
          label={`${Math.round(progress)} درصد از مطالعه امروز انجام شده`}
        >
          {done ? (
            <CheckCircle2 className="h-10 w-10 text-primary" aria-hidden="true" />
          ) : (
            <>
              <span className="text-4xl font-black tabular-nums text-hero-foreground sm:text-5xl">
                {faNum(remaining)}
              </span>
              <span className="mt-1.5 text-[11px] font-medium text-hero-muted">واژه</span>
            </>
          )}
        </ProgressRing>

        <div className="min-w-0 flex-1 space-y-3 text-center sm:text-right">
          <p className="text-[11px] font-bold tracking-wide text-primary">مطالعه امروز</p>

          <h2 className="text-2xl font-black leading-snug text-hero-foreground sm:text-[1.75rem]">
            {done ? 'برای امروز کاری نمانده' : 'وقتشه چند واژه به حافظه‌ات اضافه کنی'}
          </h2>

          {done ? (
            <p className="text-sm text-hero-muted">
              {reviewedToday > 0
                ? `${faNum(reviewedToday)} واژه امروز مرور شد — فردا ادامه می‌دهیم.`
                : 'امروز برنامه‌ای برای مرور نداری.'}
            </p>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              {dueCount > 0 && (
                <HeroChip icon={RefreshCw}>{faNum(dueCount)} مرور</HeroChip>
              )}
              {newCount > 0 && (
                <HeroChip icon={Sparkles}>{faNum(newCount)} واژه جدید</HeroChip>
              )}
              {streak > 0 && <HeroChip icon={Flame}>{faNum(streak)} روز پیاپی</HeroChip>}
            </div>
          )}

          {!done && reviewedToday > 0 && (
            <p className="flex items-center justify-center gap-1.5 text-xs text-hero-muted sm:justify-start">
              <Target className="h-3.5 w-3.5" aria-hidden="true" />
              {faNum(reviewedToday)} از {faNum(planned)} واژه امروز انجام شده
            </p>
          )}

          {lessonLabel && !done && (
            <p className="truncate text-xs text-hero-muted/80">{lessonLabel}</p>
          )}
        </div>

        <Button
          size="lg"
          className="w-full shrink-0 gap-2 text-base font-bold shadow-lg shadow-black/20 sm:w-auto"
          disabled={done}
          onClick={() => navigate('/study')}
        >
          <GraduationCap className="h-5 w-5" aria-hidden="true" />
          {done ? 'تمام شد' : 'شروع مطالعه'}
          {!done && <ArrowLeft className="h-4 w-4" aria-hidden="true" />}
        </Button>
      </div>
    </section>
  )
}
