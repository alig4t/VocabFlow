import type { CSSProperties } from 'react'
import { BrainIllustration } from './BrainIllustration'
import { cn } from '../../lib/utils'

/**
 * Hand-placed positions for the drifting words: above the brain, out to each
 * side, and up into both top corners. Nothing sits below it — the donut starts
 * there — and nothing overlaps the silhouette itself.
 *
 * Fixed rather than randomised so the halo doesn't reshuffle on every render.
 * `dur` and `delay` are staggered so the words never pulse in unison.
 */
const SLOTS = [
  { x: 50, y: 2, size: 11, dur: 7.5, delay: 0 },
  { x: 26, y: 10, size: 12, dur: 8.5, delay: 0.6 },
  { x: 74, y: 9, size: 12, dur: 9, delay: 1.2 },
  { x: 9, y: 26, size: 13, dur: 7, delay: 0.3 },
  { x: 90, y: 24, size: 13, dur: 8, delay: 1.6 },
  { x: 15, y: 55, size: 11, dur: 9.5, delay: 2.1 },
  { x: 85, y: 53, size: 11, dur: 7.8, delay: 0.9 },
  { x: 34, y: 30, size: 10, dur: 8.2, delay: 2.5 },
  { x: 67, y: 31, size: 10, dur: 9.2, delay: 1.9 },
  { x: 3, y: 8, size: 10, dur: 8.8, delay: 2.8 },
  { x: 96, y: 7, size: 10, dur: 7.3, delay: 1.4 },
  // The brain occupies roughly y 20–80% at x 38–62%; a slot at (50, 74) landed
  // squarely behind it, so there is deliberately nothing directly below.
  { x: 22, y: 78, size: 10, dur: 8.6, delay: 3.1 },
  { x: 79, y: 77, size: 10, dur: 9.4, delay: 2.3 },
] as const

/**
 * Cycled across the words so the halo carries the card's own colour system:
 * violet for new, amber for mid-flight, mint for banked.
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
  'meaning',
  'learn',
  'words',
  'memory',
  'repeat',
]

interface MemoryWordHaloProps {
  /** The reader's own words. Padded from FALLBACK when there aren't enough. */
  words?: string[]
  className?: string
}

/**
 * The brain that heads the memory card, ringed by small drifting words.
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
      className={cn('relative mx-auto h-40 w-full max-w-md select-none sm:h-44', className)}
    >
      {SLOTS.map((slot, i) => (
        <span
          key={i}
          dir="ltr"
          className={cn(
            'word-drift absolute -translate-x-1/2 whitespace-nowrap font-semibold lowercase leading-none',
            TONES[i % TONES.length],
          )}
          style={
            {
              left: `${slot.x}%`,
              top: `${slot.y}%`,
              fontSize: `${slot.size}px`,
              '--drift-dur': `${slot.dur}s`,
              '--drift-delay': `${slot.delay}s`,
              '--drift-min': 0.45,
              '--drift-max': 0.85,
            } as CSSProperties
          }
        >
          {pool[i % pool.length]}
        </span>
      ))}

      {/* Soft violet bloom so the brain sits on light, not on nothing. */}
      <span className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet/15 blur-2xl" />

      <BrainIllustration className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 sm:h-28 sm:w-28" />
    </div>
  )
}
