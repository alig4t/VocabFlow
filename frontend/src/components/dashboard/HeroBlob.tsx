import { cn } from '@/lib/utils'

interface HeroBlobProps {
  className?: string
  /**
   * 1 — the field's main blob (`--deep-blob`, the theme's primary gold);
   * 2 — its lighter companion (`--deep-blob-2`), used for the high, small
   * counterweight instance.
   */
  variant?: 1 | 2
}

/**
 * The hero band's organic blob — the user's Haikei shape (`blob-haikei`),
 * path lifted verbatim from the shipped SVG, minus its background rect (the
 * band's gradient is that background). Colour comes from the theme tokens so
 * each mode fields its own gold pair. Scaled and flipped per instance
 * through `className`.
 */
export function HeroBlob({ className, variant = 1 }: HeroBlobProps) {
  return (
    <svg
      viewBox="40 280 420 420"
      fill="none"
      aria-hidden="true"
      className={cn(
        'pointer-events-none select-none',
        variant === 1 ? 'fill-[hsl(var(--deep-blob))]' : 'fill-[hsl(var(--deep-blob-2))]',
        className,
      )}
    >
      <path
        d="M160.6 -164.6C193.9 -127.3 197 -63.6 192.5 -4.5C188 54.7 176 109.4 142.7 146.5C109.4 183.7 54.7 203.3 11.4 191.9C-31.8 180.5 -63.6 138 -94 100.8C-124.3 63.6 -153.2 31.8 -154.6 -1.4C-156 -34.6 -130 -69.3 -99.6 -106.6C-69.3 -144 -34.6 -184 14.5 -198.5C63.6 -213 127.3 -201.9 160.6 -164.6"
        transform="translate(250.26398703965282 484.75660630077414)"
      />
    </svg>
  )
}
