import { cn } from '@/lib/utils'
import type { Word, ReviewMode } from '@/types'

interface ReviewCardProps {
  word: Word
  mode: ReviewMode
  /** Controlled flip state (owned by the parent so the Space key can toggle it). */
  flipped: boolean
  /** Toggle the flip state (show/hide the translation). */
  onToggle: () => void
}

export function ReviewCard({ word, mode, flipped, onToggle }: ReviewCardProps) {
  // Derive what shows on front vs back
  const frontContent =
    mode === 'EN_TO_FA'
      ? { label: 'انگلیسی', text: word.eng, dir: 'ltr' }
      : { label: 'فارسی', text: word.per, dir: 'rtl' }

  const backContent =
    mode === 'EN_TO_FA'
      ? { label: 'فارسی', text: word.per, dir: 'rtl' }
      : { label: 'انگلیسی', text: word.eng, dir: 'ltr' }

  // `flipped` is controlled by the parent (ReviewPage), which resets it on word change.

  return (
    <div className="w-full max-w-3xl mx-auto select-none">
      {/* 3D flip container */}
      <div
        className="relative w-full"
        style={{ perspective: '1200px', height: '340px' }}
      >
        <div
          className="relative w-full h-full"
          style={{
            transformStyle: 'preserve-3d',
            transition: 'transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* FRONT face */}
          <div
            className="absolute inset-0 rounded-2xl border border-border bg-card shadow-lg flex flex-col items-center justify-center p-8"
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
          >
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-6">
              {frontContent.label}
            </span>

            <p
              dir={frontContent.dir}
              className={cn(
                'text-center font-bold leading-tight break-words max-w-full',
                frontContent.dir === 'rtl'
                  ? 'text-4xl sm:text-5xl rtl'
                  : 'text-4xl sm:text-5xl tracking-tight',
              )}
            >
              {frontContent.text}
            </p>

            <button
              onClick={onToggle}
              className="mt-10 px-8 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
            >
              {mode === 'EN_TO_FA' ? 'نمایش فارسی' : 'نمایش انگلیسی'}
            </button>
          </div>

          {/* BACK face */}
          <div
            className="absolute inset-0 rounded-2xl border border-border bg-card shadow-lg flex flex-col items-center justify-center p-8"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              {backContent.label}
            </span>

            <p
              dir={backContent.dir}
              className={cn(
                'text-center font-bold leading-tight break-words max-w-full',
                backContent.dir === 'rtl'
                  ? 'text-4xl sm:text-5xl rtl'
                  : 'text-4xl sm:text-5xl tracking-tight',
              )}
            >
              {backContent.text}
            </p>

            {/* Description */}
            {word.description && (
              <p className="mt-4 text-sm text-muted-foreground text-center max-w-md leading-relaxed">
                {word.description}
              </p>
            )}

            {/* Primary example */}
            {word.primaryExample && (
              <div className="mt-4 max-w-md text-center space-y-1">
                <p className="text-sm text-foreground italic leading-relaxed">
                  "{word.primaryExample}"
                </p>
                {word.primaryExampleTrs && (
                  <p
                    dir="rtl"
                    className="text-sm text-muted-foreground rtl leading-relaxed"
                  >
                    {word.primaryExampleTrs}
                  </p>
                )}
              </div>
            )}

            <button
              onClick={onToggle}
              className="mt-6 px-5 py-1.5 rounded-full border border-border text-muted-foreground text-xs font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              نمایش {frontContent.label}
            </button>
          </div>
        </div>
      </div>

      {/* Tap hint when not flipped */}
      {!flipped && (
        <p className="text-center text-xs text-muted-foreground mt-3">
          کلید <kbd className="px-1.5 py-0.5 rounded border border-border font-mono text-xs">Space</kbd> را فشار دهید تا نمایش داده شود
        </p>
      )}
    </div>
  )
}
