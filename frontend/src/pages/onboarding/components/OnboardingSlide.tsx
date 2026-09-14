interface OnboardingSlideProps {
  image: string
  headline: string
  subtitle: string
  body: string
}

/** One full-viewport onboarding slide (illustration on top, text below). */
export function OnboardingSlide({ image, headline, subtitle, body }: OnboardingSlideProps) {
  return (
    <div
      dir="rtl"
      className="flex h-full w-full shrink-0 flex-col items-center justify-between px-6 pb-[calc(env(safe-area-inset-bottom)+160px)] pt-[calc(env(safe-area-inset-top)+16px)]"
    >
      {/* Illustration — roughly 40–48% of the slide height */}
      <div className="flex min-h-0 w-full flex-1 items-center justify-center py-4">
        <img
          src={image}
          alt={headline}
          className="max-h-full max-w-full object-contain drop-shadow-sm"
          draggable={false}
        />
      </div>

      {/* Text block */}
      <div className="flex shrink-0 flex-col items-center gap-3 text-center">
        <h1 className="text-4xl font-extrabold text-[hsl(217,63%,16%)] sm:text-5xl">{headline}</h1>
        <p className="text-lg font-semibold text-[hsl(31,74%,48%)]">{subtitle}</p>
        <p className="max-w-xs text-[15px] leading-7 text-[hsl(217,25%,35%)]">{body}</p>
      </div>
    </div>
  )
}
