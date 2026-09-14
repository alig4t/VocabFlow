import { ArrowLeft, Check } from 'lucide-react'

interface OnboardingButtonProps {
  isLast: boolean
  onClick: () => void
}

/** Circular navy forward button; a check mark replaces the arrow on the last slide. */
export function OnboardingButton({ isLast, onClick }: OnboardingButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isLast ? 'شروع' : 'اسلاید بعدی'}
      className="flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(217,63%,16%)] text-[hsl(36,77%,95%)] shadow-sm transition-transform duration-150 active:scale-95"
    >
      {isLast ? <Check className="h-6 w-6" strokeWidth={2.5} /> : <ArrowLeft className="h-6 w-6" strokeWidth={2.5} />}
    </button>
  )
}
