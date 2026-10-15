import { useMemo, useState } from "react";
import { faNum, faStudyDate } from "../../lib/format";
import { ChartDayDetails } from "./ChartDayDetails";
import type { HeatmapDay } from "../../types";

interface ActivityHeatmapProps {
  days: HeatmapDay[];
}

/**
 * Map a day's reviewed-word count to one of five intensity buckets.
 *
 * The thresholds are spread wide (1–5 / 6–15 / 16–30 / 31+) on purpose: a
 * learner with a fixed daily quota would otherwise paint every active day the
 * same shade, and the map would carry no information. Counting *reviews* (not
 * new words) is what makes the spread real — an intense catch-up day looks
 * different from a light one.
 */
function level(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count <= 5) return 1;
  if (count <= 15) return 2;
  if (count <= 30) return 3;
  return 4;
}

export function ActivityHeatmap({ days }: ActivityHeatmapProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const activityDays = useMemo(() => {
    const firstActiveIndex = days.findIndex((day) => day.count > 0);
    return days.slice(Math.max(0, firstActiveIndex));
  }, [days]);
  const selectedIndex = Math.max(
    0,
    selectedDate
      ? activityDays.findIndex((day) => day.date === selectedDate)
      : activityDays.length - 1,
  );
  // Start at the first active day, retaining the full grid's size with empty slots.
  const weeks = useMemo(() => {
    return Array.from({ length: Math.ceil(days.length / 7) }, (_, week) =>
      Array.from({ length: 7 }, (_, row) => activityDays[week * 7 + row]),
    );
  }, [activityDays, days.length]);

  const totalReviews = useMemo(
    () => days.reduce((s, d) => s + d.count, 0),
    [days],
  );
  const activeDays = useMemo(
    () => days.filter((d) => d.count > 0).length,
    [days],
  );
  const bestDay = useMemo(
    () => days.reduce((m, d) => Math.max(m, d.count), 0),
    [days],
  );

  return (
    <figure className="m-0">
      {/* Summary remains available alongside the individually selectable days. */}
      <figcaption className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>
          <span className="font-semibold tabular-nums text-foreground">
            {faNum(activeDays)}
          </span>{" "}
          روز فعال
        </span>
        <span
          aria-hidden="true"
          className="h-1 w-1 shrink-0 rounded-full bg-current opacity-40"
        />
        <span>
          <span className="font-semibold tabular-nums text-foreground">
            {faNum(totalReviews)}
          </span>{" "}
          مرور
        </span>
        <span
          aria-hidden="true"
          className="h-1 w-1 shrink-0 rounded-full bg-current opacity-40"
        />
        <span>
          پرکارترین روز{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {faNum(bestDay)}
          </span>{" "}
          مرور
        </span>
      </figcaption>

      {/* Days climb from the bottom left; each new week starts to the right. */}
      <div dir="ltr" className="w-full pb-1">
        <div
          className="flex w-full gap-[3px] sm:gap-1"
          role="group"
          aria-label="روزهای مطالعه؛ برای انتخاب روز از کلیدهای جهت استفاده کنید"
        >
          {weeks.map((week, wi) => (
            <div
              key={wi}
              className="flex min-w-0 flex-1 flex-col-reverse gap-[3px] sm:gap-1"
            >
              {week.map((day, row) =>
                day ? (
                  <button
                    type="button"
                    key={day.date}
                    className={`chart-heat-cell heat-${level(day.count)} aspect-square w-full rounded-[3px]`}
                    aria-label={`${faStudyDate(day.date, true)}، ${faNum(day.count)} مرور`}
                    aria-pressed={wi * 7 + row === selectedIndex}
                    tabIndex={wi * 7 + row === selectedIndex ? 0 : -1}
                    onClick={() => setSelectedDate(day.date)}
                    onFocus={() => setSelectedDate(day.date)}
                    onKeyDown={(event) => {
                      const index = wi * 7 + row;
                      const next =
                        event.key === "ArrowLeft"
                          ? index - 7
                          : event.key === "ArrowRight"
                            ? index + 7
                            : event.key === "ArrowDown"
                              ? index - (row > 0 ? 1 : 0)
                              : event.key === "ArrowUp"
                                ? index + (row < week.length - 1 ? 1 : 0)
                                : event.key === "Home"
                                  ? 0
                                  : event.key === "End"
                                    ? activityDays.length - 1
                                    : null;
                      if (next === null) return;
                      event.preventDefault();
                      const target = Math.max(
                        0,
                        Math.min(activityDays.length - 1, next),
                      );
                      event.currentTarget
                        .closest('[role="group"]')
                        ?.querySelectorAll<HTMLButtonElement>("button")
                        [target]?.focus();
                    }}
                  />
                ) : (
                  <span
                    key={`empty-${row}`}
                    aria-hidden="true"
                    className="heat-0 aspect-square w-full rounded-[3px]"
                  />
                ),
              )}
            </div>
          ))}
        </div>
      </div>

      <ChartDayDetails
        days={activityDays}
        index={selectedIndex}
        onSelect={(index) => setSelectedDate(activityDays[index].date)}
      />

      {/* Legend */}
      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span>کمتر</span>
        <span className="heat-0 h-3 w-3 rounded-[3px]" />
        <span className="heat-1 h-3 w-3 rounded-[3px]" />
        <span className="heat-2 h-3 w-3 rounded-[3px]" />
        <span className="heat-3 h-3 w-3 rounded-[3px]" />
        <span className="heat-4 h-3 w-3 rounded-[3px]" />
        <span>بیشتر</span>
      </div>
    </figure>
  );
}
