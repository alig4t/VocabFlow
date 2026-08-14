/**
 * Fixed slots for the scattered words.
 *
 * Hand-placed rather than randomised for two reasons: the layout has to be
 * stable across re-renders (a shuffling background is a distraction, and
 * `Math.random` in render would move words on every keystroke elsewhere on the
 * page), and every slot has to stay clear of the middle band where the
 * headline, dial and CTA live.
 *
 * `x`/`y` are percentages of the panel. Nothing sits between y 30–72 on the
 * inner half, which is the content's safe zone.
 *
 * `weight` is *relative* (0–1), not a final opacity. The absolute level lives
 * on the container, because the two themes need very different amounts: 6% of
 * near-black on cream is plainly legible text, while 6% of near-white on the
 * dark panel is barely a smudge.
 */
const SLOTS = [
  { x: 4, y: 12, size: 2.4, rotate: -4, weight: 1 },
  { x: 20, y: 78, size: 1.5, rotate: 3, weight: 0.85 },
  { x: 33, y: 8, size: 1.1, rotate: -2, weight: 0.7 },
  { x: 46, y: 86, size: 2.0, rotate: -5, weight: 0.85 },
  { x: 8, y: 44, size: 1.3, rotate: 2, weight: 0.7 },
  { x: 62, y: 14, size: 1.4, rotate: 4, weight: 0.7 },
  { x: 2, y: 66, size: 1.0, rotate: -3, weight: 0.6 },
  { x: 76, y: 84, size: 1.2, rotate: 2, weight: 0.6 },
  { x: 30, y: 26, size: 0.95, rotate: -2, weight: 0.55 },
  { x: 88, y: 20, size: 1.1, rotate: 3, weight: 0.55 },
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
]

interface HeroWordCloudProps {
  /** The user's own words, most interesting first. Padded from FALLBACK. */
  words?: string[]
}

/**
 * The hero's texture: English words drifting behind the content at 4–7%
 * opacity.
 *
 * Real vocabulary from the user's own list where there is any, which makes the
 * background the product rather than decoration. Purely visual — hidden from
 * assistive technology, and never placed where it could sit under body text.
 */
export function HeroWordCloud({ words = [] }: HeroWordCloudProps) {
  const pool = [...words, ...FALLBACK.filter((w) => !words.includes(w))]

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 select-none overflow-hidden opacity-[0.032] dark:opacity-[0.085]"
    >
      {SLOTS.map((slot, i) => (
        <span
          key={i}
          dir="ltr"
          className="absolute font-black lowercase leading-none tracking-tight text-hero-foreground"
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
