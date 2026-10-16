import type { ReactNode } from "react";
import { OnboardingBackground } from "./OnboardingBackground";
import { faNum } from "@/lib/format";
interface OnboardingSlideProps {
  headline: string[];
  eyebrow: string;
  body: string;
  imgSrc: string;
  step: number;
  children: ReactNode;
}
export function OnboardingSlide({
  headline,
  eyebrow,
  body,
  imgSrc,
  step,
  children,
}: OnboardingSlideProps) {
  return (
    <div className="onboarding-shell">
      <div className="onboarding-art">
        <OnboardingBackground className="pointer-events-none absolute inset-0 h-full w-full" />
        <header className="onboarding-brand">
          <span className="text-base font-bold">وکب فلو</span>
        </header>
        <div className="onboarding-illustration">
          <img
            key={imgSrc}
            src={imgSrc}
            alt=""
            draggable={false}
            className="onboarding-image"
          />
        </div>
        <span className="onboarding-art-caption" dir="ltr">
          A little every day. A lot over time.
        </span>
      </div>
      <div className="onboarding-content">
        <div
          key={eyebrow}
          className="onboarding-copy"
          aria-live="polite"
          aria-atomic="true"
        >
          <p className="mb-4 flex items-center gap-3 text-xs font-semibold text-accent-foreground">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent tabular-nums">
              {faNum(step).padStart(2, "۰")}
            </span>
            {eyebrow}
          </p>
          <h1 className="onboarding-headline">
            {headline.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h1>
          <p className="mt-5 max-w-sm text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">
            {body}
          </p>
        </div>
        <footer className="onboarding-controls">{children}</footer>
      </div>
    </div>
  );
}
