interface OnboardingSlideProps {
  headline: string
  subtitle: string
  body: string
    imgSrc: string
}

/**
 * One text-only onboarding slide, positioned like the reference design:
 * brand line, big heading and description in the upper-middle, right-aligned.
 * Sizes are container units of the card, so they scale with it.
 */
export function OnboardingSlide({ headline, subtitle, body,imgSrc }: OnboardingSlideProps) {
  return (
    <div className="relative h-full w-full shrink-0">


        <img src={imgSrc} className={'mx-auto mt-10 max-w-[60%]'} />

        {/*<p className="absolute right-[8%] top-[24.8%] text-[4.5cqw] font-bold text-[#111111]">
        VocabFlow
      </p>*/}
      <h1 className="absolute right-[8%] top-[39.1%] text-[12cqw] font-bold leading-[1.15] text-[#111111]">
        {headline}
      </h1>
      <p className="absolute right-[8%] top-[57%] max-w-[80%] text-[5.5cqw] font-bold leading-[1.6] text-[#111111]">
        {subtitle}
      </p>
      <p className="absolute right-[8%] top-[66%] max-w-[80%] text-[5cqw] leading-[1.6] text-[#6F663D]">
        {body}
      </p>
    </div>
  )
}
