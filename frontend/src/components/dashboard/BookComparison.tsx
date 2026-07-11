import { useMemo } from 'react'
import { Progress } from '../ui/progress'
import { faPercent, faNum } from '../../lib/format'
import type { WatchlistBook } from '../../types'

interface BookComparisonProps {
  books: WatchlistBook[]
}

/**
 * Horizontal ranked bar comparison of progress across watchlisted books only.
 * Pure CSS/SVG-free so it stays light and respects the calm-minimal direction.
 */
export function BookComparison({ books }: BookComparisonProps) {
  const ranked = useMemo(
    () =>
      books
        .map((b) => ({
          ...b,
          progress: b.totalWords > 0 ? (b.knownWords / b.totalWords) * 100 : 0,
        }))
        .sort((a, b) => b.progress - a.progress),
    [books],
  )

  if (ranked.length === 0) {
    return <p className="text-sm text-muted-foreground">کتابی برای مقایسه وجود ندارد.</p>
  }

  return (
    <ul className="space-y-4">
      {ranked.map((book, i) => (
        <li key={book.id} className="space-y-1.5">
          <div className="flex items-center gap-2 text-sm">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold tabular-nums text-muted-foreground">
              {faNum(i + 1)}
            </span>
            <span className=" font-medium text-foreground">{book.title}</span>
            <span className="mr-auto shrink-0 font-bold tabular-nums text-foreground">
              {faPercent(book.progress)}
            </span>
          </div>
          <Progress value={book.progress} size="sm" />
        </li>
      ))}
    </ul>
  )
}
