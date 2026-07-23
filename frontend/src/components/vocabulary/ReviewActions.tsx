import { useWordStatus } from '@/hooks/useProgress'
import { cn } from '@/lib/utils'
import type { ReviewMode, Word } from '@/types'

interface ReviewActionsProps {
  word: Word
  mode: ReviewMode
  onKnown: () => void
  onNotKnown: () => void
  onSkip: () => void
}

/**
 * The free-review action group (نگرفتم · رد · گرفتم). The active state comes from
 * the word's MANUAL mark, a track entirely separate from the SM-2 program — so
 * every screen using this bar (free review, today's practice) is SM-2-neutral.
 * Compact horizontal layout: always one line, on phones too.
 */
export function ReviewActions({ word, mode, onKnown, onNotKnown, onSkip }: ReviewActionsProps) {
  const status = useWordStatus(word, mode)

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <button
        onClick={onNotKnown}
        aria-pressed={status === 'NOT_KNOWN'}
        className={cn(
          'min-w-0 flex-1 whitespace-nowrap px-2 py-2 rounded-lg text-sm font-semibold border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400',
          status === 'NOT_KNOWN'
            ? 'bg-red-500 text-white border-red-500 shadow-sm'
            : 'border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40',
        )}
      >
        نگرفتم
      </button>

      <button
        onClick={onSkip}
        className="min-w-0 flex-1 whitespace-nowrap px-2 py-2 rounded-lg text-sm font-medium text-muted-foreground border border-border hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        رد
      </button>

      <button
        onClick={onKnown}
        aria-pressed={status === 'KNOWN'}
        className={cn(
          'min-w-0 flex-1 whitespace-nowrap px-2 py-2 rounded-lg text-sm font-semibold border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400',
          status === 'KNOWN'
            ? 'bg-green-500 text-white border-green-500 shadow-sm'
            : 'border-green-300 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950/40',
        )}
      >
        گرفتم
      </button>
    </div>
  )
}
