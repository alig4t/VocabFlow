import { useNavigate } from 'react-router-dom'
import { BookText, Check, GraduationCap, Info } from 'lucide-react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { faNum } from '../../lib/format'
import { getBookMeta, LEVEL_CLASS } from '../../lib/bookMeta'
import type { DiscoveryBook } from '../../types'

interface DiscoveryBookCardProps {
  book: DiscoveryBook
  /** Open the "Start Learning Plan" dialog for this book. */
  onStartPlan: (book: DiscoveryBook) => void
}

export function DiscoveryBookCard({ book, onStartPlan }: DiscoveryBookCardProps) {
  const navigate = useNavigate()
  const meta = getBookMeta(book.title)

  return (
    <Card className="flex flex-col gap-4 p-5 shadow-soft transition-shadow hover:shadow-md">
      <header className="flex items-start gap-3">
        {book.coverImage ? (
          <img
            src={book.coverImage}
            alt={book.title}
            loading="lazy"
            className="h-16 w-12 shrink-0 rounded-lg object-cover ring-1 ring-border bg-muted"
          />
        ) : (
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
            aria-hidden="true"
          >
            <BookText className="h-6 w-6" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-bold leading-snug text-foreground">{book.title}</h3>
            {book.inWatchlist && (
              <Badge variant="success" className="shrink-0 gap-1">
                <Check className="h-3 w-3" aria-hidden="true" />
                در حال یادگیری
              </Badge>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${LEVEL_CLASS[meta.level]}`}
            >
              {meta.level}
            </span>
            <span className="text-xs text-muted-foreground">{faNum(book.totalWords)} واژه</span>
          </div>
        </div>
      </header>

      {book.description && (
        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {book.description}
        </p>
      )}

      <footer className="mt-auto flex items-center gap-2 pt-1">
        <Button
          variant={book.inWatchlist ? 'outline' : 'default'}
          size="sm"
          className="flex-1 gap-1.5"
          onClick={() => onStartPlan(book)}
        >
          <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
          {book.inWatchlist ? 'مدیریت برنامه' : 'برنامه یادگیری'}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="gap-1.5"
          onClick={() => navigate(`/library/${book.id}`)}
        >
          <Info className="h-3.5 w-3.5" aria-hidden="true" />
          توضیحات
        </Button>
      </footer>
    </Card>
  )
}
