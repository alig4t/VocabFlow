import type { HTMLAttributes } from "react";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import { cn } from "@/lib/utils";

/** Content stays visible and interactive even before the observer fires. */
export function Reveal({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  const { ref, entered } = useInViewOnce<HTMLDivElement>();
  return (
    <div
      ref={ref}
      data-entered={entered}
      className={cn("ui-reveal", className)}
      {...props}
    />
  );
}
