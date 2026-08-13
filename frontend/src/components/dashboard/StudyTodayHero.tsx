import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  GraduationCap,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Flame,
  Target,
  ArrowLeft,
  BarChart3,
  Compass,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProgressRing } from '@/components/dashboard/ProgressRing'
import { useStudyToday } from '@/hooks/useStudy'
import { faNum } from '@/lib/format'

interface StudyTodayHeroProps {
  /** Shown in the greeting; omitted on native, which has no account. */
  userName?: string | null
  /** Consecutive study days, from the dashboard aggregate. Hidden at zero. */
  streak?: number
}

/** صبح / ظهر / عصر / شب — the greeting tracks the time of day. */
function greeting(): string {
  const h = new Date().getHours()
  if (h < 5) return 'شب بخیر'
  if (h < 12) return 'صبح بخیر'
  if (h < 17) return 'ظهر بخیر'
  if (h < 20) return 'عصر بخیر'
  return 'شب بخیر'
}

/** A pill on the navy panel: quiet surface, legible text, no borders. */
function HeroChip({ icon: Icon, children }: { icon: typeof Flame; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-hero-foreground">
      <Icon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
      {children}
    </span>
  )
}

/**
 * The dashboard's opening band: greeting, today's workload, one call to action.
 *
 * Runs full-bleed to the edges of the scroll area (`page-bleed`) and closes on
 * an eased curve rather than a flat rule.
 *
 * The curve is an SVG path, not `clip-path`. Two reasons: clip-path renders a
 * visibly stepped diagonal in Blink/the Android WebView, and a straight cut
 * meets the side of the panel at a razor-thin point. A cubic whose end tangents
 * are horizontal arrives flat at both edges, so there is no corner to sharpen.
 *
 * Renders in every state — including "still loading" and "no plans yet" — so
 * the greeting never disappears.
 */
export function StudyTodayHero({ userName, streak = 0 }: StudyTodayHeroProps) {
  const navigate = useNavigate()
  const { data, isLoading } = useStudyToday()

  const meta = data?.meta
  const dueCount = meta?.dueCount ?? 0
  const newCount = meta?.newCount ?? 0
  const reviewedToday = meta?.reviewedToday ?? 0
  const plan = meta?.plans[0]

  const remaining = dueCount + newCount
  // Today's whole workload = what's left plus what's already been answered.
  const planned = remaining + reviewedToday
  const progress = planned > 0 ? (reviewedToday / planned) * 100 : 100
  const done = remaining === 0

  const lessonLabel =
    plan && plan.currentLesson != null
      ? `${plan.continueLesson ? 'ادامه‌ی' : 'شروع'} درس ${plan.currentLesson} · ${plan.bookTitle}`
      : null

  return (
    <section className="page-bleed relative overflow-hidden bg-hero pb-16 pt-5 text-hero-foreground sm:pb-24 sm:pt-8">
      {/* Ambient gold wash behind the dial — decorative only. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-16 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl"
      />

      {/*
        Mirrors Layout's <main> exactly — its padding, then the same max-width —
        so the band's content sits on the same left/right edge as the cards
        below it. Padding on the max-width box instead would inset it further.
      */}
      <div className="relative px-2 sm:px-4 md:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-7">
          <p className="text-base font-black sm:text-lg">
            {greeting()}
            {userName ? `، ${userName}` : ''} 👋
          </p>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="gap-2 bg-white/10 text-hero-foreground hover:bg-white/20 hover:text-hero-foreground"
              onClick={() => navigate('/statistics')}
            >
              <BarChart3 className="h-4 w-4" aria-hidden="true" />
              آمار یادگیری
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="gap-2 bg-white/10 text-hero-foreground hover:bg-white/20 hover:text-hero-foreground"
              onClick={() => navigate('/library')}
            >
              <Compass className="h-4 w-4" aria-hidden="true" />
              کاوش کتاب‌ها
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex animate-pulse flex-col items-center gap-6 sm:flex-row sm:gap-8">
            <span className="h-32 w-32 shrink-0 rounded-full bg-white/10 sm:h-36 sm:w-36" />
            <div className="w-full flex-1 space-y-3">
              <span className="block h-3 w-24 rounded bg-white/10" />
              <span className="block h-7 w-3/4 rounded bg-white/10" />
              <span className="block h-6 w-1/2 rounded bg-white/10" />
            </div>
          </div>
        ) : !meta?.hasPlans ? (
          <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:justify-between sm:text-right">
            <div className="space-y-2">
              <h2 className="text-2xl font-black leading-snug sm:text-[1.75rem]">
                هنوز برنامه‌ای برای یادگیری نداری
              </h2>
              <p className="text-sm text-hero-muted">
                یک کتاب از کتابخانه انتخاب کن تا برنامه روزانه‌ات ساخته شود.
              </p>
            </div>
            <Button
              size="lg"
              className="w-full shrink-0 gap-2 text-base font-bold shadow-lg shadow-black/20 sm:w-auto"
              onClick={() => navigate('/library')}
            >
              <Compass className="h-5 w-5" aria-hidden="true" />
              انتخاب کتاب
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
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
                  {dueCount > 0 && <HeroChip icon={RefreshCw}>{faNum(dueCount)} مرور</HeroChip>}
                  {newCount > 0 && <HeroChip icon={Sparkles}>{faNum(newCount)} واژه جدید</HeroChip>}
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
        )}
        </div>
      </div>

      {/*
        The closing curve, painted in the page background. Both control points
        share a y with their endpoint, so the tangents are horizontal where the
        curve meets each side — it flattens into the edge instead of ending on a
        point, and survives the non-uniform scale of preserveAspectRatio="none".
      */}
      <svg
        aria-hidden="true"
        viewBox="0 0 100 10"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 block h-8 w-full sm:h-11"
      >
        <path d="M0,1 C40,1 60,9 100,9 L100,10.5 L0,10.5 Z" fill="hsl(var(--background))" />
      </svg>
    </section>
  )
}
