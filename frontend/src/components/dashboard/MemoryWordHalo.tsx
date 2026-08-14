import type { CSSProperties } from 'react'
import { BrainIllustration } from './BrainIllustration'
import { cn } from '../../lib/utils'

/**
 * Where each drifting word sits, as a percentage of the stage.
 *
 * The brain is anchored low (its centre at 58%), which frees the top of the
 * stage for the words: they crowd the crown and run down both upper flanks, and
 * nothing sits underneath it. `inside: true` places a word over the silhouette
 * itself — those are drawn in white, the only thing that reads on the pink.
 *
 * Hand-placed rather than randomised so the halo doesn't reshuffle on every
 * render; `dur` and `delay` are staggered so they never pulse in unison.
 */
const SLOTS = [
  // Right on the crown
  { x: 50, y: 4, size: 9, dur: 7.5, delay: 0 },
  { x: 37, y: 7, size: 8, dur: 8.1, delay: 1.7 },
  { x: 63, y: 6, size: 8, dur: 9.1, delay: 0.4 },
  { x: 44, y: 15, size: 8, dur: 7.6, delay: 2.4 },
  { x: 57, y: 14, size: 8, dur: 8.9, delay: 0.2 },
  // Top-left and top-right shoulders
  { x: 26, y: 2, size: 9, dur: 8.5, delay: 0.6 },
  { x: 74, y: 1, size: 9, dur: 9, delay: 1.2 },
  { x: 27, y: 14, size: 9, dur: 9.3, delay: 1.1 },
  { x: 73, y: 13, size: 9, dur: 7.9, delay: 2.6 },
  { x: 13, y: 7, size: 8, dur: 8.8, delay: 2.8 },
  { x: 87, y: 6, size: 8, dur: 7.3, delay: 1.4 },
  // Hugging the upper flanks, level with the top of the silhouette
  { x: 18, y: 26, size: 9, dur: 7, delay: 0.3 },
  { x: 82, y: 25, size: 9, dur: 8, delay: 1.6 },
  { x: 11, y: 40, size: 8, dur: 9.5, delay: 2.1 },
  { x: 89, y: 38, size: 8, dur: 7.8, delay: 0.9 },
  { x: 19, y: 53, size: 8, dur: 8.4, delay: 3.3 },
  { x: 81, y: 51, size: 8, dur: 9.7, delay: 1.5 },
  /*
    Over the silhouette. Kept near the centre line: these are white, so any
    part that slides past the pink onto the card disappears, and the words come
    from the reader's own list — there is no telling how long they will be.
    Centred, even a long one stays inside the brain's widest span.
  */
  { x: 50, y: 38, size: 9, dur: 8.2, delay: 0.5, inside: true },
  { x: 48, y: 50, size: 8, dur: 9.2, delay: 1.9, inside: true },
  { x: 52, y: 61, size: 8, dur: 8.7, delay: 2.7, inside: true },
  { x: 50, y: 72, size: 8, dur: 7.7, delay: 1.3, inside: true },
] as const

/**
 * Cycled across the outer words so the halo carries the card's own colour
 * system: violet for new, amber for mid-flight, mint for banked.
 */
const TONES = ['text-violet', 'text-warning', 'text-mint'] as const

/** Used before the account has vocabulary of its own. */
const FALLBACK = [
  'remember',
  'vocabulary',
  'review',
  'fluent',
  'improve',
  'recall',
  'practice',
  'learn',
  'words',
  'memory',
  'repeat',
  'meaning',
  'spelling',
  'sentence',
  'phrase',
  'context',
  'listen',
  'speak',
  'read',
  'write',
  'daily',
]

interface MemoryWordHaloProps {
  /** The reader's own words. Padded from FALLBACK when there aren't enough. */
  words?: string[]
  className?: string
}

/**
 * The brain that heads the memory card, crowded with small drifting words.
 *
 * The words are the reader's own vocabulary where there is any, which makes the
 * ornament say something true — this is what is in there. Purely decorative to
 * assistive technology: the counts underneath carry the meaning.
 */
export function MemoryWordHalo({ words = [], className }: MemoryWordHaloProps) {
  const pool = [...words, ...FALLBACK.filter((w) => !words.includes(w))]

  return (
    <div
      aria-hidden="true"
      className={cn('relative mx-auto h-48 w-full max-w-md select-none sm:h-56', className)}
    >
      {SLOTS.map((slot, i) => {
        const inside = 'inside' in slot && slot.inside
        return (
          <span
            key={i}
            dir="ltr"
            className={cn(
              'word-drift absolute z-10 -translate-x-1/2 whitespace-nowrap font-semibold lowercase leading-none',
              inside ? 'text-white' : TONES[i % TONES.length],
            )}
            style={
              {
                left: `${slot.x}%`,
                top: `${slot.y}%`,
                fontSize: `${slot.size}px`,
                '--drift-dur': `${slot.dur}s`,
                '--drift-delay': `${slot.delay}s`,
                // The outer words sit well back, at a level each theme sets
                // for itself; the ones printed on the pink need more weight to
                // stay legible against it.
                '--drift-min': inside ? 0.6 : 'var(--drift-out-min)',
                '--drift-max': inside ? 0.92 : 'var(--drift-out-max)',
              } as CSSProperties
            }
          >
            {pool[i % pool.length]}
          </span>
        )
      })}

      {/* Soft bloom so the brain sits on light, not on nothing. */}
      <span className="pointer-events-none absolute left-1/2 top-[58%] h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-pink/20 blur-2xl sm:h-40 sm:w-40" />

      <BrainIllustration className="absolute left-1/2 top-[58%] h-32 w-32 -translate-x-1/2 -translate-y-1/2 sm:h-40 sm:w-40" />
    </div>
  )
}
