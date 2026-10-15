import { useEffect, useRef, useState } from "react";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import { faNum } from "@/lib/format";

interface AnimatedNumberProps {
  value: number;
  percent?: boolean;
}

/** Count on first view and on real updates; screen readers get the final value. */
export function AnimatedNumber({
  value,
  percent = false,
}: AnimatedNumberProps) {
  const { ref, entered } = useInViewOnce<HTMLSpanElement>();
  const [displayed, setDisplayed] = useState(() =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ? value : 0,
  );
  const current = useRef(displayed);
  const animated = useRef(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const finish = () => {
      cancelAnimationFrame(frame);
      current.current = value;
      setDisplayed(value);
    };
    const onPreferenceChange = () => {
      if (preference.matches) finish();
    };
    preference.addEventListener("change", onPreferenceChange);
    if (preference.matches) {
      finish();
    } else if (entered && current.current !== value) {
      const from = current.current;
      const duration = animated.current ? 320 : 600;
      animated.current = true;
      let started: number | undefined;
      const step = (time: number) => {
        started ??= time;
        const elapsed = Math.min(1, (time - started) / duration);
        const next = from + (value - from) * (1 - (1 - elapsed) ** 3);
        current.current = next;
        setDisplayed(next);
        if (elapsed < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    }
    return () => {
      cancelAnimationFrame(frame);
      preference.removeEventListener("change", onPreferenceChange);
    };
  }, [value, entered]);

  const format = (number: number) =>
    `${faNum(Math.round(number))}${percent ? "٪" : ""}`;
  return (
    <span ref={ref} className="relative inline-block tabular-nums">
      <span aria-hidden="true" className="absolute inset-0 whitespace-nowrap">
        {format(displayed)}
      </span>
      {/* Reserve the final width while the visible number counts up. */}
      <span aria-hidden="true" className="invisible">
        {format(value)}
      </span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}
