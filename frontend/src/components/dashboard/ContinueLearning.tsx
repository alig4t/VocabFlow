import { useNavigate } from 'react-router-dom'
import { Layers, ArrowLeft } from 'lucide-react'
import { Button } from '../ui/button'
import { faNum } from '../../lib/format'
import type { ReviewQueueItem } from '../../types'

interface ContinueLearningProps {
  queue: ReviewQueueItem[]
}

/**
 * The review queue, broken down per book.
 *
 * Deliberately *not* a second gold hero: the daily-study panel above owns the
 * primary call to action, and two gold cards pointing at `/study` left the page
 * with no single obvious next step. This one informs — which book is backing up
 * — and offers a secondary way in.
 */
export function ContinueLearning({ queue }: ContinueLearningProps) {
  const navigate = useNavigate()
  const totalDue = queue.reduce((s, q) => s + q.dueCount, 0)

  if (totalDue === 0) return null

  return (
    <section className="surface rounded-3xl p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-2.5">
          <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Layers className="h-4 w-4 text-accent-foreground" aria-hidden="true" />
            صف مرور
          </p>

          <p className="text-xl font-black text-foreground">
            <span className="tabular-nums">{faNum(totalDue)}</span> واژه آماده مرور است
          </p>

          <ul className="flex flex-wrap gap-x-2 gap-y-1.5">
            {queue.map((q) => (
              <li
                key={q.bookId}
                className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground"
              >
                <span className="truncate max-w-[14rem]">{q.title}</span>
                <span className="font-bold tabular-nums text-foreground">{faNum(q.dueCount)}</span>
              </li>
            ))}
          </ul>
        </div>

        <Button
          variant="outline"
          className="shrink-0 gap-2 font-semibold"
          onClick={() => navigate('/study')}
        >
          رفتن به مرور
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </section>
  )
}
