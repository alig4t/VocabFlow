import { useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { Button } from '../ui/button'
import { faNum } from '../../lib/format'
import { cn } from '../../lib/utils'
import type { HardWordItem } from '../../types'

interface HardWordsProps {
  words: HardWordItem[]
}

/** "۵ بار سخت" / "۳ بار غلط" — whichever count dominates for this word. */
function struggleLabel(w: HardWordItem): string {
  if (w.hardCount >= w.wrongCount) return `${faNum(w.hardCount)} بار سخت`
  return `${faNum(w.wrongCount)} بار غلط`
}

/** Four strikes is where a word stops being tricky and becomes a blocker. */
const MAX_STRIKES = 4

/**
 * The words that resist memorisation, as a row of cards you swipe through.
 *
 * A vertical list read as a table of rows; these are individual words the user
 * is going to work on, so each gets its own card with the English large, the
 * Persian under it, and a dot meter for how often it has gone wrong. The whole
 * list lives on `/hard-words`, reachable from the button below.
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
    <div className="space-y-4">
      {/*
        Negative margins let the row bleed to the card's padding edge, so a card
        is clipped mid-way at the end — the standard cue that this scrolls.
      */}
      <ul className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2">
        {words.map((w) => {
          const strikes = Math.min(MAX_STRIKES, Math.max(w.hardCount, w.wrongCount))
          return (
            <li
              key={w.wordId}
              // Fixed width on a phone so the row scrolls; on wider screens the
              // cards share the space instead of leaving a gap at the end.
              className="surface-sunken flex w-40 shrink-0 snap-start flex-col gap-2 rounded-2xl p-3.5 sm:w-auto sm:min-w-0 sm:flex-1"
            >
              <div className="flex items-start justify-between gap-2">
                {/* dir=ltr keeps the English readable; text-right aligns it with
                    the Persian meaning underneath in the RTL layout. */}
                <span
                  dir="ltr"
                  className="min-w-0 flex-1 truncate text-right text-base font-bold text-foreground"
                >
                  {w.eng}
                </span>
                <AlertTriangle className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
              </div>

              <span className="truncate text-xs text-muted-foreground">{w.per}</span>

              <span
                className="flex gap-1 pt-1"
                role="img"
                aria-label={struggleLabel(w)}
              >
                {Array.from({ length: MAX_STRIKES }, (_, i) => (
                  <span
                    key={i}
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      i < strikes ? 'bg-warning' : 'bg-warning/20',
                    )}
                  />
                ))}
              </span>

              <span className="text-[11px] tabular-nums text-muted-foreground">
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
