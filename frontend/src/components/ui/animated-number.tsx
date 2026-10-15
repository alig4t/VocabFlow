import { useEffect, useRef, useState } from "react";
import { faNum } from "@/lib/format";

interface AnimatedNumberProps {
  value: number;
  percent?: boolean;
}

/** Animate real updates only, with a stable final value for screen readers. */
export function AnimatedNumber({
  value,
  percent = false,
}: AnimatedNumberProps) {
  const [displayed, setDisplayed] = useState(value);
  const current = useRef(value);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const finish = () => {
      cancelAnimationFrame(frame);
      current.current = value;
      setDisplayed(value);
    };
    if (preference.matches || current.current === value) {
      finish();
      return;
    }
    const from = current.current;
    let started: number | undefined;
    const step = (time: number) => {
      started ??= time;
      const elapsed = Math.min(1, (time - started) / 320);
      const next = from + (value - from) * (1 - (1 - elapsed) ** 3);
      current.current = next;
      setDisplayed(next);
      if (elapsed < 1) frame = requestAnimationFrame(step);
    };
    const onPreferenceChange = () => {
      if (preference.matches) finish();
    };
    preference.addEventListener("change", onPreferenceChange);
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      preference.removeEventListener("change", onPreferenceChange);
    };
  }, [value]);

  const format = (number: number) =>
    `${faNum(Math.round(number))}${percent ? "٪" : ""}`;
  return (
    <span className="tabular-nums">
      <span aria-hidden="true">{format(displayed)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}
