import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { OnboardingBackground } from './components/OnboardingBackground'
import { PaginationDots } from './components/PaginationDots'
import { OnboardingButton } from './components/OnboardingButton'
import { OnboardingSlide } from './components/OnboardingSlide'
import { completeOnboarding } from '../../lib/onboarding'

const SLIDES = [
  {
    headline: 'یاد بگیر',
    subtitle: 'کتاب‌های کاربردی انگلیسی',
    body: 'کلمات جدید را از منابع معتبر یاد بگیر.',
  },
  {
    headline: 'فراموش نکن',
    subtitle: 'مرور هوشمند',
    body: 'VocabFlow تشخیص می‌دهد هر واژه را چه زمانی باید دوباره ببینی.',
  },
  {
    headline: 'ادامه بده',
    subtitle: 'عادت روزانه',
    body: 'زمان یادآوری را انتخاب کن و با ۶ روز استفاده رایگان شروع کن.',
  },
]

/**
 * Three-slide first-launch onboarding (RTL, swipeable). Recreates the
 * reference design: warm-yellow card on a light gray page, organic SVG
 * line-art background, text-only slides, dots at bottom-left and a round
 * black "next" button at bottom-right.
 */
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
      className="font-persian flex h-[100dvh] w-full items-center justify-center bg-[#F4F4F4]"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Mobile card — reference ratio 201:435, full-bleed on phones.
          Sizing via container units keeps the design proportional. */}
      <div className="relative aspect-[201/435] max-h-[calc(100dvh-24px)] w-[calc(100vw-24px)] max-w-[420px] overflow-hidden rounded-[22px] bg-[#F9D040] [container-type:size]">
        {/* Decorative background (SVG, clipped by the card) */}
        <OnboardingBackground className="pointer-events-none absolute inset-0 h-full w-full" />

        {/* Sliding track (RTL flex overflows to the LEFT, so the track must
            translate rightward — positive X — to reveal the next slide) */}
        <div
          className="absolute inset-0 flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(${index * 100}%)` }}
        >
          {SLIDES.map((s) => (
            <OnboardingSlide key={s.headline} {...s} />
          ))}
        </div>

        {/* Bottom controls — dots at bottom-right, next button at bottom-left
            (in RTL the first flex child is laid out on the RIGHT) */}
        <div className="absolute inset-x-0 bottom-[7%] flex items-center justify-between px-[7.5%]">
          <PaginationDots count={SLIDES.length} active={index} />
          <OnboardingButton label={isLast ? 'شروع' : 'بعدی'} onClick={next} />
        </div>
      </div>
    </div>
  )
}
