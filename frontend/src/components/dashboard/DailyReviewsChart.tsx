import { useMemo, useState } from "react";
import { ChartDayDetails } from "./ChartDayDetails";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import { faNum, faStudyDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DailyStat } from "@/types";

export function DailyReviewsChart({ days }: { days: DailyStat[] }) {
  const ordered = useMemo(
    () => [...days].sort((a, b) => a.date.localeCompare(b.date)),
    [days],
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { ref, entered } = useInViewOnce<HTMLDivElement>();
  const max = Math.max(1, ...ordered.map((day) => day.reviews));
  const total = ordered.reduce((sum, day) => sum + day.reviews, 0);
  const selectedIndex = Math.max(
    0,
    selectedDate
      ? ordered.findIndex((day) => day.date === selectedDate)
      : ordered.length - 1,
  );

  // Hooks/observer stay mounted when a background refresh adds the first review.
  return (
    <div ref={ref}>
      {total === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          در ۳۰ روز اخیر مروری ثبت نشده است.
        </p>
      ) : (
        <figure className="m-0 space-y-3">
          <figcaption className="text-xs text-muted-foreground">
            مجموع {faNum(total)} مرور — بیشترین {faNum(max)} در یک روز
          </figcaption>
          <div
            dir="ltr"
            role="group"
            aria-label="مرورهای روزانه؛ با کلیدهای چپ و راست روز را انتخاب کنید"
            className="flex h-32 items-end gap-[3px]"
          >
            {ordered.map((day, index) => (
              <button
                key={day.date}
                type="button"
                className="chart-review-day"
                aria-label={`${faStudyDate(day.date, true)}، ${faNum(day.reviews)} مرور`}
                aria-pressed={index === selectedIndex}
                tabIndex={index === selectedIndex ? 0 : -1}
                onClick={() => setSelectedDate(day.date)}
                onFocus={() => setSelectedDate(day.date)}
                onKeyDown={(event) => {
                  const next =
                    event.key === "ArrowRight"
                      ? index + 1
                      : event.key === "ArrowLeft"
                        ? index - 1
                        : event.key === "Home"
                          ? 0
                          : event.key === "End"
                            ? ordered.length - 1
                            : null;
                  if (next === null) return;
                  event.preventDefault();
                  const target = Math.max(
                    0,
                    Math.min(ordered.length - 1, next),
                  );
                  event.currentTarget.parentElement
                    ?.querySelectorAll<HTMLButtonElement>("button")
                    [target]?.focus();
                }}
              >
                <span
                  data-entered={entered}
                  className={cn(
                    "chart-review-fill",
                    day.reviews > 0 ? "bg-primary/70" : "bg-muted",
                  )}
                  style={{
                    height:
                      day.reviews > 0
                        ? `${Math.max(4, (day.reviews / max) * 100)}%`
                        : "3%",
                  }}
                />
              </button>
            ))}
          </div>
          <div
            dir="ltr"
            className="flex justify-between text-[11px] text-muted-foreground"
          >
            <span>{faStudyDate(ordered[0].date)}</span>
            <span>{faStudyDate(ordered[ordered.length - 1].date)}</span>
          </div>
          <ChartDayDetails
            days={ordered.map((day) => ({
              date: day.date,
              count: day.reviews,
            }))}
            index={selectedIndex}
            onSelect={(index) => setSelectedDate(ordered[index].date)}
          />
        </figure>
      )}
    </div>
  );
}
