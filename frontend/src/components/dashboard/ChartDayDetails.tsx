import { ChevronLeft, ChevronRight } from "lucide-react";
import { faNum, faStudyDate } from "@/lib/format";
import type { HeatmapDay } from "@/types";

/** Large adjacent-day controls complement the dense chart's touch targets. */
export function ChartDayDetails({
  days,
  index,
  onSelect,
}: {
  days: HeatmapDay[];
  index: number;
  onSelect: (index: number) => void;
}) {
  const day = days[index];
  if (!day) return null;
  return (
    <div dir="rtl" className="chart-day-details">
      <button
        type="button"
        className="chart-day-step"
        aria-label="روز قبل"
        disabled={index === 0}
        onClick={() => onSelect(index - 1)}
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="min-w-0 flex-1 text-center text-xs leading-6"
      >
        <span className="block text-muted-foreground">
          {faStudyDate(day.date, true)}
        </span>
        <span className="font-bold tabular-nums text-foreground">
          {faNum(day.count)} مرور
        </span>
      </p>
      <button
        type="button"
        className="chart-day-step"
        aria-label="روز بعد"
        disabled={index === days.length - 1}
        onClick={() => onSelect(index + 1)}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
