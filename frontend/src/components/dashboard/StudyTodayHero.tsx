import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  GraduationCap,
  Sparkles,
  CheckCircle2,
  Flame,
  Target,
  Brain,
  ArrowLeft,
  BarChart3,
  Compass,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProgressRing } from '@/components/dashboard/ProgressRing'
import { useStudyToday } from '@/hooks/useStudy'
import { faNum, faPercent } from '@/lib/format'

interface StudyTodayHeroProps {
  /** Shown in the greeting; omitted on native, which has no account. */
  userName?: string | null
  /** Consecutive study days. Pill is hidden at zero. */
  streak?: number
  /** 0–100 share of answers marked known. Pill is hidden with no data. */
  accuracy?: number
  /** Words currently in the SM-2 review cycle. Pill is hidden at zero. */
  wordsInMemory?: number
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

/**
 * A translucent stat pill along the top of the panel. Value first, label after
 * it in a lighter tone, so the row scans as three numbers rather than prose.
 */
function StatPill({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: typeof Flame
  value: string
  label: string
  tone: string
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white/10 py-1.5 pe-3 ps-2.5 backdrop-blur-sm">
      <Icon className={`h-4 w-4 shrink-0 ${tone}`} aria-hidden="true" />
      <span className="text-sm font-bold tabular-nums text-hero-foreground">{value}</span>
      <span className="text-[11px] text-hero-muted">{label}</span>
    </span>
  )
}

/** A drawn separator dot. See the note where it is used. */
function Dot() {
  return (
    <li
      aria-hidden="true"
      className="h-1 w-1 shrink-0 rounded-full bg-current opacity-40"
    />
  )
}

function NavPill({
  icon: Icon,
  children,
  onClick,
}: {
  icon: typeof Flame
  children: ReactNode
  onClick: () => void
}) {
  return (
    <Button
      size="sm"
      variant="ghost"
      className="gap-2 bg-white/10 text-hero-foreground hover:bg-white/20 hover:text-hero-foreground"
      onClick={onClick}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {children}
    </Button>
  )
}

/**
 * The dashboard's opening band: greeting, three at-a-glance numbers, what today
 * asks of you, and one call to action.
 *
 * Composed as a single object rather than a stack of centred pieces — pills
 * along the top, headline and CTA together on one side, the dial on the other.
 *
 * Runs full-bleed to the edges of the scroll area (`page-bleed`) and closes on
 * an eased curve rather than a flat rule. The curve is an SVG path, not
 * `clip-path`: clip-path renders a visibly stepped diagonal in Blink and the
 * Android WebView, and a straight cut meets the side of the panel at a
 * razor-thin point. A cubic whose end tangents are horizontal arrives flat at
 * both edges, so there is no corner to sharpen.
 *
 * Renders in every state — including "still loading" and "no plans yet" — so
 * the greeting never disappears.
 */
export function StudyTodayHero({
  userName,
  streak = 0,
  accuracy = 0,
  wordsInMemory = 0,
}: StudyTodayHeroProps) {
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
      ? // faNum, and an em dash rather than "·" — see the separator note below.
        `${plan.continueLesson ? 'ادامه‌ی' : 'شروع'} درس ${faNum(plan.currentLesson)} — ${plan.bookTitle}`
      : null

  return (
    <section className="page-bleed relative overflow-hidden bg-hero pb-20 pt-5 text-hero-foreground sm:pb-28 sm:pt-8">
      {/* Atmosphere and abstract decoration — nothing here carries meaning. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <span className="absolute -left-20 -top-28 h-80 w-80 rounded-full bg-violet/25 blur-3xl" />
        <span className="absolute -right-10 top-10 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
        {/* Thin concentric outlines echo the dial without repeating it. */}
        <span className="absolute -left-16 bottom-4 h-64 w-64 rounded-full border border-white/[0.06]" />
        <span className="absolute -left-4 bottom-16 h-36 w-36 rounded-full border border-white/[0.05]" />
        <Sparkles className="absolute left-[18%] top-8 h-4 w-4 text-primary/30" />
        <Sparkles className="absolute left-[32%] bottom-24 h-3 w-3 text-violet/40" />
      </div>

      {/*
        Mirrors Layout's <main> exactly — its padding, then the same max-width —
        so the band's content sits on the same left/right edge as the cards
        below it. Padding on the max-width box instead would inset it further.
      */}
      <div className="relative px-2 sm:px-4 md:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-base font-black sm:text-lg">
              {greeting()}
              {userName ? `، ${userName}` : ''} 👋
            </p>

            <div className="flex gap-2">
              <NavPill icon={BarChart3} onClick={() => navigate('/statistics')}>
                آمار یادگیری
              </NavPill>
              <NavPill icon={Compass} onClick={() => navigate('/library')}>
                کاوش کتاب‌ها
              </NavPill>
            </div>
          </div>

          {/* Three numbers worth knowing before anything else. Zeros are left
              out rather than shown — an empty row beats a row of noughts. */}
          {(streak > 0 || accuracy > 0 || wordsInMemory > 0) && (
            <div className="flex flex-wrap gap-2 pt-6">
              {streak > 0 && (
                <StatPill
                  icon={Flame}
                  value={faNum(streak)}
                  label="روز پیاپی"
                  tone="text-primary"
                />
              )}
              {accuracy > 0 && (
                <StatPill
                  icon={Target}
                  value={faPercent(accuracy)}
                  label="دقت"
                  tone="text-mint"
                />
              )}
              {wordsInMemory > 0 && (
                <StatPill
                  icon={Brain}
                  value={faNum(wordsInMemory)}
                  label="واژه در حافظه"
                  tone="text-violet"
                />
              )}
            </div>
          )}

          <div className="pt-7">
            {isLoading ? (
              <div className="flex animate-pulse flex-col-reverse gap-6 sm:flex-row sm:items-center sm:gap-10">
                <div className="w-full flex-1 space-y-4">
                  <span className="block h-9 w-3/4 rounded bg-white/10" />
                  <span className="block h-9 w-1/2 rounded bg-white/10" />
                  <span className="block h-11 w-40 rounded-md bg-white/10" />
                </div>
                <span className="mx-auto h-36 w-36 shrink-0 rounded-full bg-white/10 sm:mx-0 sm:h-44 sm:w-44" />
              </div>
            ) : !meta?.hasPlans ? (
              <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:justify-between sm:text-right">
                <div className="space-y-2">
                  <h2 className="text-[1.75rem] font-black leading-tight sm:text-4xl">
                    هنوز برنامه‌ای نداری
                  </h2>
                  <p className="text-sm text-hero-muted">
                    یک کتاب از کتابخانه انتخاب کن تا برنامه روزانه‌ات ساخته شود.
                  </p>
                </div>
                <Button
                  size="lg"
                  className="w-full shrink-0 gap-2 text-base font-bold shadow-lg shadow-black/25 sm:w-auto"
                  onClick={() => navigate('/library')}
                >
                  <Compass className="h-5 w-5" aria-hidden="true" />
                  انتخاب کتاب
                </Button>
              </div>
            ) : (
              <div className="flex flex-col-reverse gap-7 sm:flex-row sm:items-center sm:gap-10">
                {/*
                  Headline and CTA travel together — one block, one action.
                  Capped rather than free-growing: at `flex-1` the text box ate
                  the whole row and pushed the dial to the far edge, so the two
                  read as separate objects instead of one composition. The
                  leftover space falls on the decorated side of the panel.
                */}
                <div className="min-w-0 flex-1 space-y-5 text-center sm:max-w-2xl sm:text-right">
                  <h2 className="text-[1.75rem] font-black leading-[1.25] sm:text-4xl">
                    {done ? (
                      <>
                        امروز تمام شد
                        <span className="mt-1 block text-lg font-bold text-hero-muted sm:text-xl">
                          {reviewedToday > 0
                            ? `${faNum(reviewedToday)} واژه مرور کردی — فردا ادامه می‌دهیم.`
                            : 'برای امروز چیزی در صف نبود.'}
                        </span>
                      </>
                    ) : (
                      <>
                        امروز <span className="text-primary">{faNum(remaining)} واژه</span>
                        <span className="block">در انتظار توست</span>
                      </>
                    )}
                  </h2>

                  {!done && (
                    /*
                      Separated by a drawn dot, never the "·" character: in the
                      Persian numerals this line is full of, a middot is all but
                      identical to ۰, so "۱۶ · واژه" reads as "۱۶۰ واژه".
                    */
                    <ul className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-sm text-hero-muted sm:justify-start">
                      {dueCount > 0 && <li>{faNum(dueCount)} مرور</li>}
                      {newCount > 0 && (
                        <>
                          {dueCount > 0 && <Dot />}
                          <li>{faNum(newCount)} واژه جدید</li>
                        </>
                      )}
                      {reviewedToday > 0 && (
                        <>
                          <Dot />
                          <li>
                            {faNum(reviewedToday)} از {faNum(planned)} انجام شده
                          </li>
                        </>
                      )}
                    </ul>
                  )}

                  <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
                    <Button
                      size="lg"
                      className="w-full shrink-0 gap-2 text-base font-bold shadow-lg shadow-black/25 sm:w-auto"
                      disabled={done}
                      onClick={() => navigate('/study')}
                    >
                      <GraduationCap className="h-5 w-5" aria-hidden="true" />
                      {done ? 'تمام شد' : 'شروع مطالعه'}
                      {!done && <ArrowLeft className="h-4 w-4" aria-hidden="true" />}
                    </Button>

                    {lessonLabel && !done && (
                      <p className="truncate text-xs text-hero-muted/80">{lessonLabel}</p>
                    )}
                  </div>
                </div>

                {/* The dial: fill is today's progress, centre is what's still waiting. */}
                <ProgressRing
                  value={progress}
                  gradient="violet"
                  glow="violet"
                  tip
                  thickness={8}
                  trackClassName="stroke-[rgb(255_255_255_/_0.12)]"
                  className="mx-auto h-36 w-36 sm:mx-0 sm:h-44 sm:w-44"
                  label={`${Math.round(progress)} درصد از مطالعه امروز انجام شده`}
                >
                  {done ? (
                    <CheckCircle2 className="h-12 w-12 text-mint" aria-hidden="true" />
                  ) : (
                    <>
                      <span className="text-5xl font-black tabular-nums text-hero-foreground sm:text-6xl">
                        {faNum(remaining)}
                      </span>
                      <span className="mt-2 text-[11px] font-medium text-hero-muted">واژه</span>
                    </>
                  )}
                </ProgressRing>
              </div>
            )}
          </div>
        </div>
      </div>

      {/*
        The closing curve. Both control points share a y with their endpoint, so
        the tangents are horizontal where the curve meets each side — it flattens
        into the edge instead of ending on a point, and survives the non-uniform
        scale of preserveAspectRatio="none". Asymmetric on purpose: it lifts
        early and runs long, which reads as a deliberate shape rather than a
        rounded corner.
      */}
      <svg
        aria-hidden="true"
        viewBox="0 0 100 10"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 block h-12 w-full sm:h-20"
      >
        <path d="M0,0.5 C30,0.5 42,9.6 100,9.6 L100,10.5 L0,10.5 Z" fill="hsl(var(--background))" />
      </svg>
    </section>
  )
}
