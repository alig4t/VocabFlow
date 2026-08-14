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
import { HeroWordCloud } from '@/components/dashboard/HeroWordCloud'
import { BookIllustration } from '@/components/dashboard/BookIllustration'
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
  /** The user's own vocabulary, used as the panel's background texture. */
  textureWords?: string[]
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
 * A stat pill along the top of the panel.
 *
 * Tinted from `hero-foreground` rather than a fixed white overlay, so the same
 * component works on the cream panel in light mode and the near-black one in
 * dark.
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
    <span className="inline-flex items-center gap-2 rounded-full bg-hero-foreground/[0.06] py-1.5 pe-3 ps-2.5">
      <Icon className={`h-4 w-4 shrink-0 ${tone}`} aria-hidden="true" />
      <span className="text-sm font-bold tabular-nums text-hero-foreground">{value}</span>
      <span className="text-[11px] text-hero-muted">{label}</span>
    </span>
  )
}

/** A drawn separator dot. See the note where it is used. */
function Dot() {
  return (
    <li aria-hidden="true" className="h-1 w-1 shrink-0 rounded-full bg-current opacity-40" />
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
      className="gap-2 bg-hero-foreground/[0.06] text-hero-foreground hover:bg-hero-foreground/[0.12] hover:text-hero-foreground"
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
 * Surfaced on the landing page's own hero wash so the app opens on the same
 * material the marketing site closes on, textured with the reader's actual
 * vocabulary, and closed with a real diagonal rather than a wave.
 *
 * The diagonal is an SVG path, not `clip-path`: clip-path renders a visibly
 * stepped edge in Blink and the Android WebView. It runs straight for most of
 * the width and eases flat over the last few percent at each side, so it reads
 * as a diagonal without ending on a razor-thin point where it meets the edge.
 *
 * Renders in every state — including "still loading" and "no plans yet" — so
 * the greeting never disappears.
 */
export function StudyTodayHero({
  userName,
  streak = 0,
  accuracy = 0,
  wordsInMemory = 0,
  textureWords,
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
    <section className="page-bleed relative overflow-hidden bg-hero-surface pb-28 pt-5 text-hero-foreground sm:pb-40 sm:pt-8">
      <HeroWordCloud words={textureWords} />

      {/* Atmosphere and abstract decoration — nothing here carries meaning. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <span className="absolute -left-24 -top-28 h-80 w-80 rounded-full bg-violet/20 blur-3xl" />
        <span className="absolute -right-16 top-4 h-64 w-64 rounded-full bg-primary/25 blur-3xl" />
        <Sparkles className="absolute left-[14%] top-10 h-4 w-4 text-accent-foreground/25" />
        <Sparkles className="absolute right-[28%] bottom-24 h-3 w-3 text-violet/30" />
      </div>

      {/*
        On wide screens the illustration anchors the inline-end side, sitting
        just above the diagonal rather than under it — the wedge is at its
        deepest here and swallowed the drawing whole when it was pinned to the
        bottom. Below `md` it moves inline, next to the dial; see there.
      */}
      <BookIllustration className="absolute bottom-24 left-2 hidden w-44 md:block lg:bottom-28 lg:w-56" />

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
                  tone="text-accent-foreground"
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
                  <span className="block h-9 w-3/4 rounded bg-hero-foreground/10" />
                  <span className="block h-9 w-1/2 rounded bg-hero-foreground/10" />
                  <span className="block h-12 w-44 rounded-2xl bg-hero-foreground/10" />
                </div>
                <span className="h-32 w-32 shrink-0 rounded-full bg-hero-foreground/10 sm:h-44 sm:w-44" />
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
                  className="h-14 w-full shrink-0 gap-2 rounded-2xl px-7 text-base font-bold shadow-lg shadow-primary/25 sm:w-auto"
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
                  read as separate objects instead of one composition.
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
                        امروز{' '}
                        <span className="text-accent-foreground">{faNum(remaining)} واژه</span>
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
                      className="h-14 w-full shrink-0 gap-2 rounded-2xl px-7 text-base font-bold shadow-lg shadow-primary/25 sm:w-auto"
                      disabled={done}
                      onClick={() => navigate('/study')}
                    >
                      <GraduationCap className="h-5 w-5" aria-hidden="true" />
                      {done ? 'تمام شد' : 'شروع مطالعه'}
                      {!done && <ArrowLeft className="h-4 w-4" aria-hidden="true" />}
                    </Button>

                    {lessonLabel && !done && (
                      <p className="truncate text-xs text-hero-muted">{lessonLabel}</p>
                    )}
                  </div>
                </div>

                {/*
                  The dial, and on phones the book beside it.

                  The dial used to sit alone on its own row with the whole
                  inline-start half of the panel empty next to it, while the
                  illustration was desktop-only and so never appeared on a phone
                  at all. Pairing them solves both.

                  Centred with a fixed gap rather than `justify-between`, which
                  pinned one to each edge and opened a gulf down the middle —
                  they belong together as a single object.
                */}
                <div className="flex shrink-0 items-center justify-center gap-1 sm:justify-normal">
                  <BookIllustration className="w-32 shrink-0 md:hidden" />

                  <ProgressRing
                  value={progress}
                  gradient="dial"
                  glow="gold"
                  tip
                  thickness={8}
                  /*
                    Before the first answer of the day there is no arc at all,
                    and a bare grey circle is the largest thing on the panel —
                    it reads as unfinished UI. Tinting the empty track in the
                    dial's own amber keeps it alive without drawing progress
                    that hasn't happened.
                  */
                  trackClassName={
                    progress === 0
                      ? 'stroke-[hsl(var(--dial-from)_/_0.3)]'
                      : 'stroke-[hsl(var(--hero-track))]'
                  }
                    className="h-32 w-32 shrink-0 sm:h-44 sm:w-44"
                    label={`${Math.round(progress)} درصد از مطالعه امروز انجام شده`}
                  >
                    {done ? (
                      <CheckCircle2 className="h-12 w-12 text-mint" aria-hidden="true" />
                    ) : (
                      <>
                        <span className="text-[2.75rem] font-black tabular-nums leading-none text-hero-foreground sm:text-6xl">
                          {faNum(remaining)}
                        </span>
                        <span className="mt-2 text-[11px] font-medium text-hero-muted">واژه</span>
                      </>
                    )}
                  </ProgressRing>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/*
        The closing diagonal. Straight across the middle, eased flat over the
        first and last few percent so it meets each side square instead of
        tapering to a sliver. `preserveAspectRatio="none"` stretches it to any
        width; the horizontal end tangents survive the non-uniform scale.
      */}
      <svg
        aria-hidden="true"
        viewBox="0 0 100 10"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 block h-16 w-full sm:h-28"
      >
        <path
          d="M0,0.8 C1.6,0.8 2.4,0.95 4,1.15 L96,8.35 C97.6,8.55 98.4,8.7 100,8.7 L100,10.5 L0,10.5 Z"
          fill="hsl(var(--background))"
        />
        {/*
          A hairline along the cut. In light mode the panel and the page are
          both warm off-white, so the edge alone was a fade rather than a line —
          the diagonal simply didn't read. `non-scaling-stroke` keeps it one
          pixel thick despite the non-uniform scale.
        */}
        <path
          d="M0,0.8 C1.6,0.8 2.4,0.95 4,1.15 L96,8.35 C97.6,8.55 98.4,8.7 100,8.7"
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </section>
  )
}
