import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { OnboardingSlide } from './components/OnboardingSlide'
import { PaginationDots } from './components/PaginationDots'
import { OnboardingButton } from './components/OnboardingButton'
import { completeOnboarding } from '../../lib/onboarding'
import bg from '../../assets/onboarding/bg.png'
import learn from '../../assets/onboarding/learn.jpg'
import remember from '../../assets/onboarding/remember.png'
import cont from '../../assets/onboarding/continue.png'

const SLIDES = [
  {
    image: learn,
    headline: 'یاد بگیر',
    subtitle: 'کتاب‌های کاربردی انگلیسی',
    body: 'کلمات جدید را از منابع معتبر یاد بگیر.',
  },
  {
    image: remember,
    headline: 'فراموش نکن',
    subtitle: 'مرور هوشمند',
    body: 'VocabFlow تشخیص می‌دهد هر واژه را چه زمانی باید دوباره ببینی.',
  },
  {
    image: cont,
    headline: 'ادامه بده',
    subtitle: 'عادت روزانه',
    body: 'زمان یادآوری را انتخاب کن و با ۶ روز استفاده رایگان شروع کن.',
  },
]

/** Three-slide first-launch onboarding (RTL, swipeable, full-screen). */
export default function OnboardingPage() {
  const navigate = useNavigate()
  const [index, setIndex] = useState(0)
  const touchStartX = useRef<number | null>(null)
  const isLast = index === SLIDES.length - 1

  const finish = useCallback(() => {
    completeOnboarding()
    navigate('/dashboard', { replace: true })
  }, [navigate])

  const next = useCallback(() => {
    if (isLast) finish()
    else setIndex((i) => Math.min(i + 1, SLIDES.length - 1))
  }, [isLast, finish])

  const prev = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0))
  }, [])

  // Keyboard navigation (web / hardware keyboards)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') next()
      if (e.key === 'ArrowRight') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev])

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    // RTL carousel: the next slide sits to the LEFT, so dragging content to
    // the right (positive delta) reveals it.
    if (delta > 50) next()
    else if (delta < -50) prev()
    touchStartX.current = null
  }

  return (
    <div
      dir="rtl"
      className="font-persian relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[hsl(36,77%,95%)]"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Decorative full-bleed background — extends behind the status bar */}
      <img
        src={bg}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />

      {/* Sliding track (RTL flex overflows to the LEFT, so the track must
          translate rightward — positive X — to reveal the next slide) */}
      <div
        className="flex h-full w-full transition-transform duration-300 ease-out"
        style={{ transform: `translateX(${index * 100}%)` }}
      >
        {SLIDES.map((s) => (
          <OnboardingSlide key={s.headline} {...s} />
        ))}
      </div>

      {/* Bottom controls */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-6 pb-[calc(env(safe-area-inset-bottom)+24px)]">
        <PaginationDots count={SLIDES.length} active={index} />
        {isLast ? (
          <OnboardingButton isLast onClick={finish} />
        ) : (
          <OnboardingButton isLast={false} onClick={next} />
        )}
      </div>

      {/* Direction hint (subtle, first slide only) */}
      {index === 0 && (
        <ChevronLeft
          className="pointer-events-none absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 animate-pulse text-[hsl(217,63%,16%,0.25)]"
          aria-hidden
        />
      )}
    </div>
  )
}
