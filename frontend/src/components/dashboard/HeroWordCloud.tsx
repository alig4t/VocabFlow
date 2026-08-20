import { cn } from '../../lib/utils'

/**
 * Fixed slots for the scattered words.
 *
 * Hand-placed rather than randomised for two reasons: the layout has to be
 * stable across re-renders (a shuffling background is a distraction, and
 * `Math.random` in render would move words on every keystroke elsewhere on the
 * page), and every slot has to stay clear of the middle band where the
 * headline, dial and CTA live.
 *
 * `x`/`y` are percentages of the panel. The big, heavy words stay in the top
 * and bottom bands and along the outer edges; only small, faint ones sit in the
 * middle, where the headline, dial and CTA live. Nothing goes below y 88 — the
 * closing diagonal paints over that strip.
 *
 * `weight` is *relative* (0–1), not a final opacity. The absolute level lives
 * on the container, because the two themes need very different amounts: 6% of
 * near-black on cream is plainly legible text, while 6% of near-white on the
 * dark panel is barely a smudge.
 */
const SLOTS = [
  // Top band
  { x: 4, y: 10, size: 2.4, rotate: -4, weight: 1 },
  { x: 17, y: 2, size: 1.3, rotate: 2, weight: 0.6 },
  { x: 33, y: 7, size: 1.1, rotate: -2, weight: 0.7 },
  { x: 48, y: 19, size: 0.95, rotate: -3, weight: 0.5 },
  { x: 62, y: 13, size: 1.4, rotate: 4, weight: 0.7 },
  { x: 74, y: 3, size: 1.2, rotate: -2, weight: 0.55 },
  { x: 88, y: 19, size: 1.1, rotate: 3, weight: 0.55 },
  { x: 96, y: 6, size: 1.0, rotate: 2, weight: 0.45 },
  { x: 30, y: 26, size: 0.95, rotate: -2, weight: 0.55 },
  // Outer edges, mid height
  { x: 7, y: 40, size: 1.3, rotate: 2, weight: 0.7 },
  { x: 2, y: 64, size: 1.0, rotate: -3, weight: 0.6 },
  { x: 95, y: 47, size: 1.1, rotate: -2, weight: 0.5 },
  { x: 12, y: 54, size: 0.9, rotate: 3, weight: 0.45 },
  // Middle — small and faint on purpose, this is behind the copy
  { x: 31, y: 35, size: 0.95, rotate: -2, weight: 0.4 },
  { x: 68, y: 44, size: 0.9, rotate: 3, weight: 0.4 },
  { x: 45, y: 57, size: 0.85, rotate: -2, weight: 0.35 },
  // Bottom band
  { x: 20, y: 76, size: 1.5, rotate: 3, weight: 0.85 },
  { x: 46, y: 84, size: 2.0, rotate: -5, weight: 0.85 },
  { x: 76, y: 81, size: 1.2, rotate: 2, weight: 0.6 },
  { x: 8, y: 86, size: 1.1, rotate: -3, weight: 0.5 },
  { x: 92, y: 73, size: 1.3, rotate: 2, weight: 0.55 },
  { x: 62, y: 87, size: 1.0, rotate: -2, weight: 0.45 },
] as const

/**
 * Words used when the account has none of its own yet — the vocabulary of
 * learning itself, so a brand-new dashboard still has texture.
 */
const FALLBACK = [
  'vocabulary',
  'remember',
  'fluent',
  'practice',
  'improve',
  'language',
  'review',
  'understand',
  'words',
  'learn',
  'meaning',
  'sentence',
  'speak',
  'listen',
  'phrase',
  'context',
  'recall',
  'progress',
  'daily',
  'memory',
  'repeat',
  'read',
]

interface HeroWordCloudProps {
  /** The user's own words, most interesting first. Padded from FALLBACK. */
  words?: string[]
  /**
   * On the hero band's fixed gold the words must be warm ink at a constant
   * level — the per-theme `text-hero-foreground` + light/dark opacity pair is
   * tuned for the themeable hero band, not a surface that never changes.
   */
  onDeep?: boolean
}

/**
 * The hero's texture: English words drifting behind the content at 4–7%
 * opacity.
 *
 * Real vocabulary from the user's own list where there is any, which makes the
 * background the product rather than decoration. Purely visual — hidden from
 * assistive technology, and never placed where it could sit under body text.
 */
export function HeroWordCloud({ words = [], onDeep = false }: HeroWordCloudProps) {
  const pool = [...words, ...FALLBACK.filter((w) => !words.includes(w))]

  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 select-none overflow-hidden',
        onDeep
          ? 'text-[hsl(45_60%_10%)] opacity-[0.05]'
          : 'text-hero-foreground opacity-[0.032] dark:opacity-[0.085]',
      )}
    >
      {SLOTS.map((slot, i) => (
        <span
          key={i}
          dir="ltr"
          className={cn(
            'absolute font-black lowercase leading-none tracking-tight',
            onDeep ? undefined : 'text-hero-foreground',
          )}
          style={{
            left: `${slot.x}%`,
            top: `${slot.y}%`,
            fontSize: `${slot.size}rem`,
            opacity: slot.weight,
            transform: `rotate(${slot.rotate}deg)`,
          }}
        >
          {pool[i % pool.length]}
        </span>
      ))}
    </div>
  )
}
