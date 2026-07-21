import { useNavigate } from 'react-router-dom'
import { BookOpen, CheckCircle2, XCircle, CalendarClock, Play, CircleDashed, Zap } from 'lucide-react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'
import { faNum, faPercent, faRelativeDate, motivation } from '../../lib/format'
import { cn } from '../../lib/utils'
import type { WatchlistBook } from '../../types'

interface WatchlistBookCardProps {
  book: WatchlistBook
}

/** A single line of book analytics (icon + label + value). */
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
    <div className="flex items-center gap-2">
      <Icon className={cn('h-4 w-4 shrink-0', className)} aria-hidden="true" />
      <span className="text-muted-foreground">{label}</span>
      <span className="mr-auto font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  )
}

export function WatchlistBookCard({ book }: WatchlistBookCardProps) {
  const navigate = useNavigate()
  const progress = book.totalWords > 0 ? (book.knownWords / book.totalWords) * 100 : 0
  const mood = motivation(progress)

  return (
    <Card className="flex flex-col gap-4 p-5 shadow-soft transition-shadow hover:shadow-md overflow-x-hidden">
      {/* Header: cover/title + motivation */}
      <header className="flex items-start gap-3">
        {book.coverImage ? (
          <img
            src={book.coverImage}
            alt={book.title}
            loading="lazy"
            className="h-14 w-11 shrink-0 rounded-lg object-cover ring-1 ring-border bg-muted"
          />
        ) : (
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
            aria-hidden="true"
          >
            <BookOpen className="h-5 w-5" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold text-foreground">{book.title}</h3>
          <p className={cn('text-xs font-medium', mood.tone)}>{mood.label}</p>
        </div>
      </header>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-muted-foreground">پیشرفت</span>
          <span className="text-sm font-bold tabular-nums text-foreground">
            {faPercent(progress)}
          </span>
        </div>
        <Progress value={progress} label={`پیشرفت ${book.title}`} />
        <p className="text-[11px] text-muted-foreground">
          {faNum(book.knownWords)} از {faNum(book.totalWords)} لغت
        </p>
      </div>

      {/* Per-book analytics */}
      <div className="grid grid-cols-1 gap-2 rounded-lg bg-muted/50 p-3 text-sm sm:grid-cols-2">
        <Metric icon={CheckCircle2} className="text-success" label="یادگرفته" value={faNum(book.knownWords)} />
        <Metric icon={XCircle} className="text-destructive" label="یاد نگرفته" value={faNum(book.unknownWords)} />
        <Metric
          icon={Zap}
          className="text-amber-600 dark:text-amber-400"
          label="سخت"
          value={faNum(book.hardWords)}
        />
        <Metric icon={CircleDashed} className="text-muted-foreground" label="نخوانده" value={faNum(book.notReadWords)} />
        <Metric icon={CalendarClock} className="text-primary" label="آخرین مطالعه" value={faRelativeDate(book.lastStudiedAt)} />
      </div>

      {/* Footer: due + estimate + CTA */}
      <footer className="mt-auto flex items-center justify-between gap-3 pt-1">
        <div className="text-xs text-muted-foreground">
          {book.dueCount > 0 ? (
            <span className="font-medium text-foreground">
              {faNum(book.dueCount)} لغت آماده مرور
            </span>
          ) : (
            <span>همه مرورها انجام شد</span>
          )}
          <span className="mx-1.5 opacity-40">·</span>
          <span>~{faNum(book.estimatedDays)} روز تا پایان</span>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => navigate(`/vocabulary?bookId=${book.bookId}`)}
        >
          <Play className="h-3.5 w-3.5" />
          ادامه مطالعه
        </Button>
      </footer>
    </Card>
  )
}
