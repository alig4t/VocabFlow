import { cn } from '@/lib/utils'
import type { Word } from '@/types'

interface WordDescriptionProps {
  word: Pick<Word, 'description' | 'descriptionPer'>
  /**
   * `card` — full block with a label, for the flip card (Study Today / Free Review).
   * `compact` — clamped two-liner for the dense vocabulary list.
   */
  variant?: 'card' | 'compact'
  className?: string
}

/**
 * The definition gloss carried by the newer collocation/idiom books:
 * an English definition plus its Persian rendering. Older books have neither,
 * so this renders nothing for them.
 */
export function WordDescription({ word, variant = 'card', className }: WordDescriptionProps) {
  const { description: eng, descriptionPer: per } = word
  if (!eng && !per) return null

  if (variant === 'compact') {
    return (
      <div className={cn('mt-1.5 space-y-0.5', className)}>
        {eng && (
          <p dir="ltr" className="line-clamp-1 text-start text-xs leading-snug text-muted-foreground">
            {eng}
          </p>
        )}
        {per && (
          <p dir="rtl" className="rtl line-clamp-1 text-start text-xs leading-snug text-muted-foreground/80">
            {per}
          </p>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'mt-4 w-full max-w-md overflow-hidden rounded-xl border border-primary/20 bg-primary/5',
        className,
      )}
    >
      <div className="border-b border-primary/10 bg-primary/5 px-3 py-1">
        <span className="font-persian text-[10px] font-semibold tracking-wide text-primary/80">تعریف</span>
      </div>
      <div className="space-y-1 px-3 py-2.5">
        {eng && (
          <p dir="ltr" className="text-start text-sm leading-relaxed text-foreground/90">
            {eng}
          </p>
        )}
        {per && (
          <p dir="rtl" className="rtl text-start text-xs leading-relaxed text-muted-foreground">
            {per}
          </p>
        )}
      </div>
    </div>
  )
}
