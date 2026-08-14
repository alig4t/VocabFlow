import type { CSSProperties } from 'react'
import { BrainIllustration } from './BrainIllustration'
import { cn } from '../../lib/utils'

/**
 * Hand-placed positions for the drifting words: above the brain, down both
 * flanks, and up into the top corners. None overlaps the silhouette itself.
 *
 * Fixed rather than randomised so the halo doesn't reshuffle on every render.
 * `dur` and `delay` are staggered so the words never pulse in unison.
 */
const SLOTS = [
  // Directly above the brain
  { x: 50, y: 1, size: 9, dur: 7.5, delay: 0 },
  { x: 39, y: 7, size: 8, dur: 8.1, delay: 1.7 },
  { x: 61, y: 6, size: 8, dur: 9.1, delay: 0.4 },
  // Upper shoulders
  { x: 27, y: 3, size: 9, dur: 8.5, delay: 0.6 },
  { x: 73, y: 2, size: 9, dur: 9, delay: 1.2 },
  { x: 30, y: 14, size: 8, dur: 7.6, delay: 2.4 },
  { x: 70, y: 15, size: 8, dur: 8.9, delay: 0.2 },
  // Top corners
  { x: 5, y: 4, size: 8, dur: 8.8, delay: 2.8 },
  { x: 94, y: 3, size: 8, dur: 7.3, delay: 1.4 },
  { x: 14, y: 13, size: 9, dur: 9.3, delay: 1.1 },
  { x: 86, y: 12, size: 9, dur: 7.9, delay: 2.6 },
  // Flanks. Nudged above the midline on purpose — sitting level with the
  // brain's widest point made them read as labels pointing at it.
  { x: 7, y: 27, size: 10, dur: 7, delay: 0.3 },
  { x: 92, y: 25, size: 10, dur: 8, delay: 1.6 },
  { x: 18, y: 38, size: 9, dur: 9.5, delay: 2.1 },
  { x: 82, y: 36, size: 9, dur: 7.8, delay: 0.9 },
  { x: 6, y: 48, size: 8, dur: 8.4, delay: 3.3 },
  { x: 93, y: 46, size: 8, dur: 9.7, delay: 1.5 },
  { x: 30, y: 26, size: 8, dur: 8.2, delay: 2.5 },
  { x: 71, y: 27, size: 8, dur: 9.2, delay: 1.9 },
  { x: 19, y: 58, size: 8, dur: 8.7, delay: 0.8 },
  { x: 81, y: 57, size: 8, dur: 7.4, delay: 2.9 },
  // Lower flanks. The brain occupies roughly y 18–82% at x 35–65%, so nothing
  // is placed inside that column — a slot at (50, 74) landed behind it.
  { x: 9, y: 68, size: 8, dur: 9.6, delay: 1.3 },
  { x: 90, y: 66, size: 8, dur: 8.3, delay: 2.2 },
  { x: 24, y: 78, size: 9, dur: 8.6, delay: 3.1 },
  { x: 77, y: 77, size: 9, dur: 9.4, delay: 2.3 },
  { x: 38, y: 88, size: 8, dur: 7.7, delay: 1.8 },
  { x: 63, y: 89, size: 8, dur: 8.9, delay: 0.7 },
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
  'progress',
  'retain',
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
      className={cn('relative mx-auto h-52 w-full max-w-lg select-none sm:h-60', className)}
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

      {/* Soft bloom so the brain sits on light, not on nothing. */}
      <span className="pointer-events-none absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-pink/20 blur-2xl sm:h-40 sm:w-40" />

      <BrainIllustration className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 sm:h-40 sm:w-40" />
    </div>
  )
}
