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
  const frontContent =
    mode === 'EN_TO_FA'
      ? { label: 'انگلیسی', text: word.eng, dir: 'ltr' as const, isEnglish: true }
      : { label: 'فارسی', text: word.per, dir: 'rtl' as const, isEnglish: false }

  const backContent =
    mode === 'EN_TO_FA'
      ? { label: 'فارسی', text: word.per, dir: 'rtl' as const, isEnglish: false }
      : { label: 'انگلیسی', text: word.eng, dir: 'ltr' as const, isEnglish: true }

  const phonetic = word.pronunciation
  const pos = word.partOfSpeech

  // Primary example + a couple of extras — enough context without clutter.
  const examples = [
    ...(word.primaryExample ? [{ eng: word.primaryExample, per: word.primaryExampleTrs }] : []),
    ...(word.examples ?? []).slice(0, 2).map((e) => ({ eng: e.engSentence, per: e.perTranslation })),
  ]

  const Label = ({ text }: { text: string }) => (
    <div className="mb-3 flex items-center justify-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{text}</span>
      {pos && (
        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground/70">
          {pos}
        </span>
      )}
    </div>
  )

  const Phonetic = ({ show }: { show: boolean }) =>
    show && phonetic ? (
      <p dir="ltr" className="mt-2 font-mono text-sm tracking-wide text-muted-foreground/60">
        {phonetic}
      </p>
    ) : null

  return (
    <div className="w-full max-w-4xl mx-auto select-none">
      <div className="relative w-full" style={{ perspective: '1200px', height: '420px' }}>
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
            className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-lg"
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
          >
            <Label text={frontContent.label} />
            <p
              dir={frontContent.dir}
              className={cn(
                'max-w-full break-words text-center font-bold leading-tight',
                frontContent.dir === 'rtl' ? 'rtl text-4xl sm:text-5xl' : 'text-4xl tracking-tight sm:text-5xl',
              )}
            >
              {frontContent.text}
            </p>
            <Phonetic show={frontContent.isEnglish} />

            <button
              onClick={onToggle}
              className="mt-8 rounded-full bg-primary px-8 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              {mode === 'EN_TO_FA' ? 'نمایش فارسی' : 'نمایش انگلیسی'}
            </button>
          </div>

          {/* BACK face */}
          <div
            className="absolute inset-0 flex flex-col items-center overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-lg"
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="flex shrink-0 flex-col items-center pt-2">
              <Label text={backContent.label} />
              <p
                dir={backContent.dir}
                className={cn(
                  'max-w-full break-words text-center font-bold leading-tight',
                  backContent.dir === 'rtl' ? 'rtl text-3xl sm:text-4xl' : 'text-3xl tracking-tight sm:text-4xl',
                )}
              >
                {backContent.text}
              </p>
              <Phonetic show={backContent.isEnglish} />
            </div>

            {/* Scrollable detail area — description + examples, no clutter/overflow */}
            <div className="mt-3 w-full max-w-md flex-1 space-y-3 overflow-y-auto px-1">
              {word.description && (
                <p className="text-center text-sm leading-relaxed text-muted-foreground">{word.description}</p>
              )}
              {examples.map((ex, i) => (
                <div key={i} className="rounded-lg bg-muted/40 px-3 py-2 text-center">
                  <p dir="ltr" className="text-sm italic leading-relaxed text-foreground/90">
                    “{ex.eng}”
                  </p>
                  {ex.per && (
                    <p dir="rtl" className="rtl mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {ex.per}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={onToggle}
              className="mt-3 shrink-0 rounded-full border border-border px-5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              نمایش {frontContent.label}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
