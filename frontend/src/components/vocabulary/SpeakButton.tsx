import { useCallback, useEffect, useRef, useState } from 'react'
import { Volume2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  currentPlayToken,
  playPronunciation,
  stopPronunciation,
  subscribePronunciation,
} from '@/lib/pronounce'

interface SpeakButtonProps {
  /** English text to read aloud (a word or a full example sentence). */
  text: string
  /** Optional server audio URL; falls back to the device speech engine. */
  audioUrl?: string | null
  /** Visual size of the round button. `sm` fits inline beside example sentences. */
  size?: 'sm' | 'md'
  /** Accessible label / tooltip. */
  label?: string
  className?: string
}

const SIZES = {
  sm: { box: 'h-9 w-9', icon: 'h-4 w-4' },
  md: { box: 'h-10 w-10', icon: 'h-[18px] w-[18px]' },
} as const

/**
 * A round "read this aloud" control with a live playing state.
 *
 * While speaking it shows a pinging ring; tapping again stops playback. It
 * resets itself the instant another sentence (or the word audio) takes over,
 * so only one button ever looks active. 36–40px tap target with a visible
 * focus ring and an aria-label for screen readers.
 */
export function SpeakButton({
  text,
  audioUrl,
  size = 'sm',
  label = 'پخش تلفظ جمله',
  className,
}: SpeakButtonProps) {
  const [playing, setPlaying] = useState(false)
  // The playback token this button owns while it is the active speaker.
  const tokenRef = useRef(-1)

  // Any new playback (another sentence, the word audio, autoplay) resets us.
  useEffect(
    () =>
      subscribePronunciation((token) => {
        if (token !== tokenRef.current) setPlaying(false)
      }),
    [],
  )

  const handleClick = useCallback(() => {
    if (playing) {
      stopPronunciation()
      setPlaying(false)
      return
    }
    setPlaying(true)
    const promise = playPronunciation({ eng: text, pronunciationAudio: audioUrl ?? undefined })
    // playPronunciation bumped the token synchronously — claim it as ours.
    tokenRef.current = currentPlayToken()
    void promise.finally(() => {
      // Only clear if nothing else started speaking in the meantime.
      if (tokenRef.current === currentPlayToken()) setPlaying(false)
    })
  }, [playing, text, audioUrl])

  const { box, icon } = SIZES[size]

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      aria-pressed={playing}
      title={label}
      className={cn(
        'group relative inline-flex flex-shrink-0 items-center justify-center rounded-full border transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        box,
        playing
          ? 'border-primary/40 bg-primary/15 text-primary'
          : 'border-border/70 bg-background/60 text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary',
        className,
      )}
    >
      {playing && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-full ring-2 ring-primary/40 motion-safe:animate-ping"
        />
      )}
      <Volume2 className={cn(icon, playing && 'motion-safe:animate-pulse')} />
    </button>
  )
}
