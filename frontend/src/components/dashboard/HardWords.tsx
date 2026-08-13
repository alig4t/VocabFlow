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
 * The top few words that resist memorisation, across every book. The rows are
 * plain text on purpose — the whole list lives on `/hard-words`, reachable via
 * the button below.
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
        {words.map((w) => {
          // Four strikes is where a word stops being "tricky" and starts being
          // a blocker; the bar saturates there so the scale stays readable.
          const strikes = Math.max(w.hardCount, w.wrongCount)
          const severity = Math.min(100, (strikes / 4) * 100)
          return (
            <li
              key={w.wordId}
              className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-2.5"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
              <span className="min-w-0 flex-1 space-y-1">
                {/* dir=ltr keeps the English readable; text-right aligns it with
                    the Persian meaning underneath in the RTL layout. */}
                <span
                  dir="ltr"
                  className="block truncate text-right text-sm font-semibold text-foreground"
                >
                  {w.eng}
                </span>
                <span className="block truncate text-xs text-muted-foreground">{w.per}</span>
                <span className="block h-[3px] w-24 overflow-hidden rounded-full bg-warning/15">
                  <span
                    className="block h-full rounded-full bg-warning/70"
                    style={{ width: `${severity}%` }}
                  />
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-medium tabular-nums text-warning">
                {struggleLabel(w)}
              </span>
            </li>
          )
        })}
      </ul>

      <Button
        variant="outline"
        size="sm"
        className="w-full gap-2"
        onClick={() => navigate('/hard-words')}
      >
        مرور واژه‌های سخت
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  )
}
