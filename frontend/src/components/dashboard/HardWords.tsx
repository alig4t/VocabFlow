import { useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { Button } from '../ui/button'
import { faNum } from '../../lib/format'
import type { HardWordItem } from '../../types'

interface HardWordsProps {
  words: HardWordItem[]
}

/** "۵ بار سخت" / "۳ بار غلط" — whichever count dominates for this word. */
function struggleLabel(w: HardWordItem): string {
  if (w.hardCount >= w.wrongCount) return `${faNum(w.hardCount)} بار سخت`
  return `${faNum(w.wrongCount)} بار غلط`
}

/**
 * The words that resist memorisation, across every book. Tapping one opens the
 * vocabulary list filtered to it so the user can study it in context.
 */
export function HardWords({ words }: HardWordsProps) {
  const navigate = useNavigate()

  if (words.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        فعلاً واژه‌ی دردسرسازی نداری — عالیه! 🎉
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-1.5">
        {words.map((w) => (
          <li key={w.wordId}>
            <button
              type="button"
              onClick={() => navigate(`/vocabulary?search=${encodeURIComponent(w.eng)}`)}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-right transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <AlertTriangle
                className="h-4 w-4 shrink-0 text-warning"
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span dir="ltr" className="block truncate text-sm font-semibold text-foreground">
                  {w.eng}
                </span>
                <span className="block truncate text-xs text-muted-foreground">{w.per}</span>
              </span>
              <span className="shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-medium tabular-nums text-warning">
                {struggleLabel(w)}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <Button
        variant="outline"
        size="sm"
        className="w-full gap-2"
        onClick={() => navigate('/vocabulary/review')}
      >
        مرور واژه‌های سخت
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  )
}
