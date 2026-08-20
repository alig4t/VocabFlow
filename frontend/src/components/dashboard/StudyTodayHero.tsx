import { useNavigate } from 'react-router-dom'
import {
  GraduationCap,
  CheckCircle2,
  Flame,
  Target,
  Brain,
  ArrowLeft,
  BarChart3,
  Compass,
  Trophy,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProgressRing } from '@/components/dashboard/ProgressRing'
import { HeroWordCloud } from '@/components/dashboard/HeroWordCloud'
import { HeroBlob } from '@/components/dashboard/HeroBlob'
import { useStudyToday } from '@/hooks/useStudy'
import { faNum, faPercent } from '@/lib/format'
import { cn } from '@/lib/utils'

interface StudyTodayHeroProps {
  /** Consecutive study days. Pill is hidden at zero. */
  streak?: number
  /** 0–100 share of answers marked known. Pill is hidden with no data. */
  accuracy?: number
  /** Words currently in the SM-2 review cycle. Pill is hidden at zero. */
  wordsInMemory?: number
  /** The user's own vocabulary, used as the panel's background texture. */
  textureWords?: string[]
}

/*
  The band's palette, per the reference: gold field, warm ink, white accents.
  Deep amber marks numbers and icons; everything else is ink or white glass.
*/
const TONE = {
  amber: 'text-[hsl(36_85%_32%)]',
  ink: 'text-deep-foreground',
} as const

/** Glass — white frosted, the band's one material for chips and badges. */
const GLASS = 'bg-white/35 ring-1 ring-white/50 backdrop-blur-md'

/**
 * A stat chip — one number worth knowing before anything else. Frosted white
 * glass on the gold; zeros are left out rather than shown, an empty row beats
 * a row of noughts.
 */
function StatChip({
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
    <span className={cn('inline-flex items-center gap-1.5 rounded-full py-1.5 pe-3 ps-2.5', GLASS)}>
      <Icon className={cn('h-4 w-4 shrink-0', tone)} aria-hidden="true" />
      <span className="text-sm font-bold tabular-nums text-deep-foreground">{value}</span>
      <span className="text-[11px] text-deep-muted">{label}</span>
    </span>
  )
}

/** A drawn separator dot. See the note where it is used. */
function Dot() {
  return (
    <li aria-hidden="true" className="h-1 w-1 shrink-0 rounded-full bg-current opacity-40" />
  )
}

/** The merged band's single primary action: an ink pill, white text. */
function HeroCTA({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <Button
      size="lg"
      className="h-14 w-full shrink-0 gap-2 rounded-full bg-[hsl(45_60%_10%)] px-8 text-base font-black text-white shadow-[0_18px_44px_-14px_hsl(45_60%_8%_/_0.55)] hover:bg-[hsl(45_60%_14%)] hover:text-white sm:w-auto"
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

/** A quiet secondary action — glass, never a greyed-out primary. */
function GhostCTA({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <Button
      size="lg"
      variant="outline"
      className={cn(
        'h-14 w-full shrink-0 gap-2 rounded-full border-white/60 px-8 text-base font-bold text-deep-foreground hover:bg-white/50 hover:text-deep-foreground sm:w-auto',
        GLASS,
      )}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

/**
 * The dashboard's opening band, merged with the navbar into one block.
 *
 * The Layout renders its navbar inside <main> directly above this section;
 * `page-bleed-under-nav` pulls the band up the bar's full height so the
 * Haikei gold runs edge to edge behind it — bar and band read as one object,
 * with the bar's ink controls floating on the same field. The band closes
 * with a straight cut: the page's first card simply starts below it, and a
 * hairline progress strip along the cut fills with ink as the day's words
 * are answered.
 *
 * The field is the user's reference SVG — gold with its darker organic blob
 * (`<HeroBlob>`, the verbatim Haikei path) — textured further with the
 * reader's own vocabulary. On a finished day the dial gives way to a trophy
 * stat, so the band never repeats itself. Renders in every state — including
 * "still loading" and "no plans yet" — so the band never disappears.
 *
 * The band doesn't end on a straight cut but on a two-layer wave: a pale-gold
 * swell (lighter than the field) riding an underwave painted in the page's own
 * background, so the gold dissolves into the page instead of stopping at it.
 * The day-progress strip rides the crest.
 */
export function StudyTodayHero({
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

  const chips = (
    <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
      {streak > 0 && (
        <StatChip icon={Flame} value={faNum(streak)} label="روز پیاپی" tone={TONE.amber} />
      )}
      {accuracy > 0 && (
        <StatChip icon={Target} value={faPercent(accuracy)} label="دقت" tone={TONE.ink} />
      )}
      {wordsInMemory > 0 && (
        <StatChip icon={Brain} value={faNum(wordsInMemory)} label="واژه در حافظه" tone={TONE.ink} />
      )}
    </div>
  )

  return (
    <section
      dir="rtl"
      className="page-bleed-under-nav bg-hero-deep relative overflow-hidden pb-20 pt-24 text-deep-foreground sm:pb-24 sm:pt-28"
    >
      {/*
        The reference's organic blobs: one large, low, behind the dial; one
        small, high, opposite. Same Haikei path, coloured per theme through
        the `--deep-blob` tokens — tone-on-tone depth, not decoration.
      */}
      <HeroBlob className="absolute -bottom-28 -start-20 w-[26rem] opacity-90 sm:w-[30rem]" />
      <HeroBlob
        variant={2}
        className="absolute -end-10 top-6 w-40 -scale-x-100 opacity-60 sm:w-52"
      />

      <HeroWordCloud words={textureWords} onDeep />

      {/* A hairline of light along the top edge — the merged block's crown. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-white/60 to-transparent" />
      </div>

      {/*
        Mirrors Layout's <main> padding, then the same max-width, so the band's
        content sits on the same left/right edge as the cards below it.
      */}
      <div className="relative px-2 sm:px-4 md:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {/*
            The at-a-glance numbers, on their own row — centred on phones to
            match the centred stack below, start-aligned from `sm`.
          */}
          {!isLoading && (streak > 0 || accuracy > 0 || wordsInMemory > 0) && chips}

          {isLoading ? (
            /*
              Shaped to the loaded band, block for block: the dial, two
              headline lines, the meta row, the CTA at its real 56px. A
              skeleton that only approximates the layout it replaces just
              moves everything when the data lands.
            */
            <div className="flex animate-pulse flex-col items-center gap-7 pt-10 sm:flex-row sm:items-center sm:gap-10">
              <div className="min-w-0 flex-1 space-y-4 text-center sm:text-right">
                <span className="mx-auto block h-9 w-2/3 rounded-xl bg-black/10 sm:mx-0 sm:h-11" />
                <span className="mx-auto block h-6 w-1/2 rounded-lg bg-black/10 sm:mx-0" />
                <span className="mx-auto block h-5 w-3/5 rounded bg-black/10 sm:mx-0" />
                <span className="block h-14 w-full rounded-full bg-black/10 sm:w-56" />
              </div>
              <span className="h-36 w-36 shrink-0 rounded-full bg-black/10 sm:h-48 sm:w-48" />
            </div>
          ) : !meta?.hasPlans ? (
            <div className="flex flex-col items-center gap-5 pt-10 text-center sm:flex-row sm:justify-between sm:pt-9 sm:text-right">
              <div className="space-y-2">
                <h2 className="text-[1.75rem] font-black leading-tight sm:text-4xl">
                  هنوز برنامه‌ای نداری
                </h2>
                <p className="text-sm text-deep-muted">
                  یک کتاب از کتابخانه انتخاب کن تا برنامه روزانه‌ات ساخته شود.
                </p>
              </div>
              <HeroCTA onClick={() => navigate('/library')}>
                <Compass className="h-5 w-5" aria-hidden="true" />
                انتخاب کتاب
              </HeroCTA>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-7 pt-9 text-center sm:flex-row sm:gap-10 sm:pt-8 sm:text-right">
              {/*
                Headline and CTA travel together — one block, one action. Capped
                rather than free-growing so the dial never gets pushed to the
                far edge of a wide band.
              */}
              <div className="order-2 min-w-0 flex-1 space-y-4 sm:order-1 sm:max-w-2xl">
                <h2 className="text-[1.625rem] font-black leading-[1.3] sm:text-4xl">
                  {done ? (
                    <>
                      <span className="text-deep-foreground">امروز تمام شد</span>
                      <span className="mt-1 block text-base font-bold text-deep-muted sm:text-xl">
                        {reviewedToday > 0
                          ? 'هدف امروزت را کامل کردی.'
                          : 'برای امروز چیزی در صف نبود.'}
                      </span>
                    </>
                  ) : (
                    <>
                      امروز{' '}
                      <span className={TONE.amber}>{faNum(remaining)} واژه</span>
                      <span className="block">در انتظار توست</span>
                    </>
                  )}
                </h2>

                {/*
                  What was actually achieved, rather than a greyed-out button.
                  A disabled primary CTA is the loudest element on the band and
                  it does nothing — on a finished day the band should report
                  the win and offer somewhere real to go.
                */}
                {done && (reviewedToday > 0 || streak > 0) && (
                  <ul className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                    {reviewedToday > 0 && (
                      <li className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold text-deep-foreground',
                        GLASS,
                      )}>
                        <CheckCircle2 className={cn('h-4 w-4', TONE.amber)} aria-hidden="true" />
                        {faNum(reviewedToday)} واژه مرور شد
                      </li>
                    )}
                    {streak > 0 && (
                      <li className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold text-deep-foreground',
                        GLASS,
                      )}>
                        <Flame className={cn('h-4 w-4', TONE.amber)} aria-hidden="true" />
                        {faNum(streak)} روز پیاپی
                      </li>
                    )}
                  </ul>
                )}

                {!done && (
                  /*
                    Separated by a drawn dot, never the "·" character: in the
                    Persian numerals this line is full of, a middot is all but
                    identical to ۰, so "۱۶ · واژه" reads as "۱۶۰ واژه".
                  */
                  <ul className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-sm text-deep-muted sm:justify-start">
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
                  {done ? (
                    <GhostCTA onClick={() => navigate('/statistics')}>
                      <BarChart3 className="h-5 w-5" aria-hidden="true" />
                      مشاهده پیشرفت
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    </GhostCTA>
                  ) : (
                    <HeroCTA onClick={() => navigate('/study')}>
                      <GraduationCap className="h-5 w-5" aria-hidden="true" />
                      شروع مطالعه
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    </HeroCTA>
                  )}

                  {lessonLabel && !done && (
                    <p className="truncate text-xs text-deep-muted">{lessonLabel}</p>
                  )}
                </div>
              </div>

              {/*
                The focal point. Mid-session it's the dial — ink arc on the
                gold, the remaining count huge in the middle; on phones it
                sits above the headline like a medal. On a finished day the
                dial gives way to the trophy stat: the day's achievement as a
                number, not a second ring repeating the strip below.
              */}
              {done ? (
                <div className="order-1 flex shrink-0 flex-col items-center gap-3 sm:order-2">
                  <span
                    className={cn(
                      'flex h-20 w-20 items-center justify-center rounded-[1.75rem] shadow-lg shadow-black/10',
                      GLASS,
                    )}
                  >
                    <Trophy className={cn('h-10 w-10', TONE.amber)} aria-hidden="true" />
                  </span>
                  {reviewedToday > 0 && (
                    <p className="text-center leading-tight">
                      <span className="block text-4xl font-black tabular-nums text-deep-foreground">
                        {faNum(reviewedToday)}
                      </span>
                      <span className="mt-1 block text-xs font-medium text-deep-muted">
                        واژه مرور شدی
                      </span>
                    </p>
                  )}
                </div>
              ) : (
                <ProgressRing
                  value={progress}
                  gradient="hero"
                  tip
                  thickness={8}
                  /*
                    Before the first answer of the day there is no arc at all,
                    and a bare grey circle is the largest thing on the band —
                    it reads as unfinished UI. Tinting the empty track ink
                    keeps it alive without drawing progress that hasn't
                    happened.
                  */
                  trackClassName={
                    progress === 0
                      ? 'stroke-[hsl(45_60%_10%_/_0.3)]'
                      : 'stroke-deep-track'
                  }
                  className="order-1 h-36 w-36 shrink-0 sm:order-2 sm:h-52 sm:w-52"
                  label={`${Math.round(progress)} درصد از مطالعه امروز انجام شده`}
                >
                  <span className="text-[2.6rem] font-black tabular-nums leading-none text-deep-foreground sm:text-6xl">
                    {faNum(remaining)}
                  </span>
                  <span className="mt-1.5 text-[11px] font-medium text-deep-muted">واژه</span>
                </ProgressRing>
              )}
            </div>
          )}
        </div>
      </div>

      {/*
        The day, as a strip. A hairline that rides the wave crest — the top of
        the wave zone below — and fills with ink as today's words are answered,
        full when the day is done. The one progress mark that is always
        visible, even while the rest of the band is still loading its numbers.
      */}
      {!isLoading && meta?.hasPlans && (
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-12 h-[5px] bg-black/10 sm:bottom-16"
        >
          <div
            className="h-full bg-[hsl(45_60%_10%)] transition-[width] duration-700 ease-out motion-reduce:transition-none"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}

      {/*
        The closing wave. Two layers: a pale-gold swell — lighter than the
        field, tuned per theme through `--deep-wave` — then an underwave in
        the page's own background colour that carries the band into the page.
        SVG paths rather than clip-path: clip-path renders a visibly stepped
        edge in Blink and the Android WebView. `preserveAspectRatio="none"`
        stretches the swell to any width; the crest reads the same at 390px
        and 1440px.
      */}
      <svg
        aria-hidden="true"
        viewBox="0 0 100 20"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 block h-12 w-full sm:h-16"
      >
        <path
          d="M0,11 C12,5 26,15 45,10 C64,5 80,15 100,8 L100,21 L0,21 Z"
          fill="hsl(var(--deep-wave))"
        />
        <path
          d="M0,15 C12,9 26,19 45,14 C64,9 80,19 100,12 L100,22 L0,22 Z"
          fill="hsl(var(--background))"
        />
      </svg>
    </section>
  )
}
