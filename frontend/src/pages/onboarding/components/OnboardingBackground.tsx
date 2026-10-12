interface OnboardingBackgroundProps {
  className?: string;
}
/** Quiet orbital lines frame the illustration without crossing the copy. */
export function OnboardingBackground({ className }: OnboardingBackgroundProps) {
  return (
    <svg
      viewBox="0 0 480 560"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <g stroke="currentColor" opacity="0.12">
        <circle cx="240" cy="295" r="170" />
        <circle cx="240" cy="295" r="215" />
        <path d="M-30 430C110 350 340 475 515 355" />
      </g>
      <g fill="currentColor" opacity="0.45">
        <path d="m95 170 3 10 10 3-10 3-3 10-3-10-10-3 10-3Z" />
        <path d="m385 365 3 10 10 3-10 3-3 10-3-10-10-3 10-3Z" />
        <circle cx="370" cy="185" r="3" />
        <circle cx="115" cy="380" r="3" />
      </g>
    </svg>
  );
}
