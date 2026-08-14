import { useNavigate } from 'react-router-dom'
import { BookOpen, CheckCircle2, XCircle, CalendarClock, Play, CircleDashed, Zap } from 'lucide-react'
import { Button } from '../ui/button'
import { ProgressRing } from './ProgressRing'
import { faNum, faPercent, faRelativeDate, motivation } from '../../lib/format'
import { cn } from '../../lib/utils'
import type { WatchlistBook } from '../../types'

interface WatchlistBookCardProps {
  book: WatchlistBook
}

/**
 * One book statistic.
 *
 * Stacked and centred rather than a label-dots-value row: at card width the row
 * form pushed every value to the far edge of its column, so labels and numbers
 * stopped reading as pairs.
 */
function Metric({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: typeof BookOpen
  label: string
  value: string
  className?: string
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 text-center">
      <Icon className={cn('h-4 w-4 shrink-0', className)} aria-hidden="true" />
      <span className="text-base font-bold tabular-nums leading-none text-foreground">
        {value}
      </span>
      <span className="text-[11px] leading-tight text-muted-foreground">{label}</span>
    </div>
  )
}

/**
 * A book in the learning list, led by its cover.
 *
 * The cover used to be a 44px thumbnail next to a stack of numbers, which made
 * every book look like a database row. Here it is the anchor of the card, with
 * the progress dial overlapping its corner — the two things you actually pick a
 * book by. The analytics stay, folded underneath.
 */
export function WatchlistBookCard({ book }: WatchlistBookCardProps) {
  const navigate = useNavigate()
  const progress = book.totalWords > 0 ? (book.knownWords / book.totalWords) * 100 : 0
  const mood = motivation(progress, book.notReadWords, book.dueCount)
  // Nothing left for this book at all — every word read AND no review due.
  const bookComplete = book.notReadWords === 0 && book.dueCount === 0

  return (
    <article className="surface flex flex-col gap-4 overflow-hidden rounded-3xl p-4 transition-shadow hover:shadow-lg">
      <header className="flex items-start gap-4">
        {/* Cover, at a real book's 2:3 — big enough to recognise on a shelf. */}
        <div className="relative shrink-0">
          {book.coverImage ? (
            <img
              src={book.coverImage}
              alt=""
              loading="lazy"
              className="h-[7.5rem] w-20 rounded-2xl bg-muted object-cover shadow-md"
            />
          ) : (
            <span
              className="flex h-[7.5rem] w-20 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-md"
              aria-hidden="true"
            >
              <BookOpen className="h-8 w-8" />
            </span>
          )}

          {/* Dial sits on the cover itself — hanging it off the inner edge put
              it on top of the title column. */}
          <ProgressRing
            value={progress}
            gradient="violet"
            thickness={12}
            trackClassName="stroke-muted"
            className="absolute bottom-1 left-1 h-12 w-12 rounded-full bg-card p-0.5 shadow-md"
            label={`پیشرفت ${faPercent(progress)}`}
          >
            <span className="text-[11px] font-black tabular-nums text-foreground">
              {faPercent(progress)}
            </span>
          </ProgressRing>
        </div>

        <div className="min-w-0 flex-1 space-y-1.5 pt-1">
          <h3 className="text-base font-bold leading-snug text-foreground">{book.title}</h3>
          <p className={cn('text-xs font-medium', mood.tone)}>{mood.label}</p>
          <p className="pt-1 text-xs text-muted-foreground">
            <span className="font-bold tabular-nums text-foreground">
              {faNum(book.knownWords)}
            </span>{' '}
            از {faNum(book.totalWords)} واژه
          </p>
          {book.dueCount > 0 && (
            <p className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-accent-foreground">
              {faNum(book.dueCount)} واژه آماده مرور
            </p>
          )}
        </div>
      </header>

      {/* Per-book analytics. Four counts across; "last studied" is a date, not
          a count, so it reads better as a caption than as a fifth tile. */}
      <div className="surface-sunken space-y-3 rounded-2xl p-3">
        <div className="grid grid-cols-4 gap-2">
          <Metric icon={CheckCircle2} className="text-mint" label="یادگرفته" value={faNum(book.knownWords)} />
          <Metric icon={XCircle} className="text-destructive" label="یاد نگرفته" value={faNum(book.unknownWords)} />
          <Metric icon={Zap} className="text-warning" label="سخت" value={faNum(book.hardWords)} />
          <Metric icon={CircleDashed} className="text-muted-foreground" label="نخوانده" value={faNum(book.notReadWords)} />
        </div>

        <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5 text-violet" aria-hidden="true" />
          آخرین مطالعه: {faRelativeDate(book.lastStudiedAt)}
        </p>
      </div>

      <footer className="mt-auto flex items-center justify-between gap-3">
        {/* A drawn dot, not "·" — beside Persian numerals a middot reads as ۰. */}
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          {book.dueCount === 0 && (
            <>
              <span>
                {book.notReadWords === book.totalWords
                  ? // Nothing has ever been introduced for this book (freshly
                    // added) — "همه مرورها انجام شد" would falsely imply reviews
                    // existed and got finished. notReadWords===totalWords is
                    // equivalent to introducedWords===0 on both the offline and
                    // backend paths.
                    'هنوز واژه‌ای برای مرور نداری'
                  : 'همه مرورها انجام شد'}
              </span>
              <span
                aria-hidden="true"
                className="h-1 w-1 shrink-0 rounded-full bg-current opacity-40"
              />
            </>
          )}
          <span>~{faNum(book.estimatedDays)} روز تا پایان</span>
        </span>

        <Button
          size="sm"
          variant={bookComplete ? 'outline' : 'default'}
          className="gap-1.5"
          disabled={bookComplete}
          /*
            The daily programme, not `/vocabulary/review`. Those are two
            independent tracks: `/study` drives the SM-2 schedule, while the
            free-review page only writes `manual_status` and would leave this
            card's counts untouched. "ادامه مطالعه" means carry on with today's
            plan. `/study` takes no book parameter — it serves the queue across
            every active plan.
          */
          onClick={() => navigate('/study')}
        >
          {bookComplete ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" />
              کامل شد
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5" />
              ادامه مطالعه
            </>
          )}
        </Button>
      </footer>
    </article>
  )
}
