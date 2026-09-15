interface OnboardingBackgroundProps {
  className?: string
}

const STROKE = '#B99B32'

/**
 * Decorative organic line-art background, redrawn in SVG (no raster asset).
 * Design space is the reference card ratio (201×435); it stretches with the
 * card via preserveAspectRatio="none".
 */
export function OnboardingBackground({ className }: OnboardingBackgroundProps) {
  return (
    <svg
      viewBox="0 0 201 435"
      preserveAspectRatio="none"
      aria-hidden
      className={className}
    >
      {/* Top-left: nested organic arcs entering from outside the card */}
      <g
        fill="none"
        stroke={STROKE}
        strokeWidth={0.7}
        strokeLinecap="round"
        opacity={0.6}
      >
        <path d="M -18 52 C 22 38, 52 66, 38 108 C 30 132, 8 146, -14 152" />
        <path d="M -22 66 C 16 54, 42 78, 30 114 C 24 134, 6 146, -16 152" />
        <path d="M -26 80 C 12 70, 34 92, 24 122 C 19 138, 4 148, -14 154" />
        <path d="M -30 94 C 8 86, 26 104, 18 130 C 14 144, 2 152, -12 156" />
        {/* small organic marks */}
        <path d="M 44 96 C 48 92, 54 92, 57 97" />
        <path d="M 50 112 C 55 109, 60 111, 62 116" />
        <circle cx={33} cy={128} r={1.4} />
        <circle cx={58} cy={84} r={1} />
        <path d="M 20 162 C 26 158, 33 159, 37 164" />
      </g>

      {/* Top-right: large nested curves from the top-right edge + outlined circle */}
      <g
        fill="none"
        stroke={STROKE}
        strokeWidth={0.7}
        strokeLinecap="round"
        opacity={0.6}
      >
        <path d="M 216 -12 C 196 34, 190 78, 200 122 C 208 156, 224 182, 240 200" />
        <path d="M 224 -14 C 204 30, 198 74, 208 118 C 216 152, 232 180, 246 198" />
        <path d="M 232 -16 C 212 26, 206 70, 216 114 C 224 148, 240 178, 252 196" />
        <path d="M 240 -18 C 222 22, 214 64, 224 110 C 232 144, 248 176, 258 194" />
        <path d="M 248 -20 C 232 18, 224 58, 232 106 C 240 140, 254 172, 264 192" />
        <circle cx={152} cy={92} r={11} />
        <path d="M 168 52 C 172 48, 178 48, 181 53" />
        <path d="M 160 132 C 165 130, 170 132, 172 137" />
      </g>

      {/* Bottom: soft organic orange shape (not a circle/gradient) */}
      <path
        d="M -30 356 C 26 338, 78 334, 118 302 C 152 274, 176 258, 205 268 C 224 274, 234 286, 240 298 L 240 465 L -30 465 Z"
        fill="#F9B641"
      />
      {/* Thin contour lines over the orange shape */}
      <g
        fill="none"
        stroke={STROKE}
        strokeWidth={0.7}
        strokeLinecap="round"
        opacity={0.55}
      >
        <path d="M -30 372 C 30 356, 82 352, 122 322 C 154 298, 180 284, 206 294" />
        <path d="M -30 392 C 34 378, 88 372, 130 344 C 162 322, 186 310, 212 318" />
        <path d="M -30 414 C 38 402, 94 394, 138 368 C 170 348, 192 338, 218 344" />
        <path d="M -30 436 C 42 426, 100 416, 146 392 C 176 376, 198 366, 222 370" />
        <path d="M 96 300 C 104 296, 112 298, 117 305" />
        <path d="M 140 272 C 147 269, 154 271, 158 277" />
      </g>
    </svg>
  )
}
