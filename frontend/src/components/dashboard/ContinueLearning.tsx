import { useNavigate } from 'react-router-dom'
import { Sparkles, ArrowLeft } from 'lucide-react'
import { Button } from '../ui/button'
import { faNum } from '../../lib/format'
import type { ReviewQueueItem } from '../../types'

interface ContinueLearningProps {
  queue: ReviewQueueItem[]
}

/**
 * Smart review queue — aggregates words due across all watchlisted books and
 * offers a single entry point into a study session.
 */
export function ContinueLearning({ queue }: ContinueLearningProps) {
  const navigate = useNavigate()
  const totalDue = queue.reduce((s, q) => s + q.dueCount, 0)

  return (
    <section className="relative overflow-hidden rounded-2xl bg-brand-gradient p-5 text-primary-foreground shadow-soft sm:p-6">
      {/* Decorative glow — purely aesthetic, hidden from AT. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-8 -top-10 h-40 w-40 rounded-full bg-white/15 blur-2xl"
      />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-sm font-medium text-primary-foreground/90">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            ادامه یادگیری
          </p>
          <p className="text-2xl font-bold">
            {totalDue > 0 ? (
              <>{faNum(totalDue)} لغت آماده مرور است</>
            ) : (
              <>فعلاً مروری در انتظار نیست</>
            )}
          </p>
          {queue.length > 0 && (
            <ul className="flex flex-wrap gap-x-3 gap-y-1 pt-1 text-xs text-primary-foreground/85">
              {queue.map((q) => (
                <li key={q.bookId} className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-white/70" aria-hidden="true" />
                  {q.title}
                  <span className="font-semibold tabular-nums">{faNum(q.dueCount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Button
          size="lg"
          variant="secondary"
          className="shrink-0 gap-2 bg-white text-primary shadow-sm hover:bg-white/90"
          disabled={totalDue === 0}
          onClick={() => navigate('/study')}
        >
          شروع جلسه یادگیری
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </section>
  )
}
