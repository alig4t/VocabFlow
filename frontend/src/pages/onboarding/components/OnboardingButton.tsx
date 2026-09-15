interface OnboardingButtonProps {
  label: string
  onClick: () => void
}

/** Circular black forward button with a small Persian label. */
export function OnboardingButton({ label, onClick }: OnboardingButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[22cqw] w-[22cqw] items-center justify-center rounded-full bg-[#080808] text-[5cqw] text-white transition-transform duration-150 active:scale-95"
    >
      {label}
    </button>
  )
}
