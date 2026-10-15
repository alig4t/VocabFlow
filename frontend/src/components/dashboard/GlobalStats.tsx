import { Flame, Repeat2, Clock, Target } from "lucide-react";
import { StatTile } from "./StatTile";
import { AnimatedNumber } from "../ui/animated-number";
import { Reveal } from "../ui/reveal";
import type { DashboardGlobalStats } from "../../types";

interface GlobalStatsProps {
  stats: DashboardGlobalStats;
}

/**
 * Four "how am I doing" tiles. Deliberately *not* six: the learned-words count
 * now lives (with far more meaning) in the memory breakdown, and the book count
 * is already obvious from the "کتاب‌های من" section below.
 *
 * Units live in the hint line so the numeral itself can be the loud part, and
 * every tile has a written zero state — four «۰» in a row reads as a broken
 * dashboard rather than a new account.
 */
export function GlobalStats({ stats }: GlobalStatsProps) {
  // accuracyRate is 0 both when there are no answers and when every answer was
  // wrong; the latter effectively never happens, so treat 0 as "no data yet".
  const noReviews = stats.accuracyRate === 0;

  return (
    <Reveal>
      <section
        aria-label="آمار کلی"
        className="surface grid grid-cols-2 gap-1 rounded-3xl p-2 sm:gap-2 sm:p-3 lg:grid-cols-4"
      >
        <StatTile
          icon={Flame}
          accent="warning"
          label="پشتکار"
          value={<AnimatedNumber value={stats.currentStreak} />}
          hint="روز متوالی"
          empty={stats.currentStreak === 0}
          emptyLabel="هنوز شروع نشده"
        />
        <StatTile
          icon={Target}
          accent="mint"
          label="دقت"
          value={<AnimatedNumber value={stats.accuracyRate} percent />}
          hint="پاسخ‌های درست"
          empty={noReviews}
          emptyLabel="هنوز مروری نداری"
        />
        <StatTile
          icon={Repeat2}
          accent="primary"
          label="مرور امروز"
          value={<AnimatedNumber value={stats.reviewsToday} />}
          hint="واژه"
          empty={stats.reviewsToday === 0}
          emptyLabel="امروز شروع نشده"
        />
        <StatTile
          icon={Clock}
          accent="violet"
          label="میانگین مطالعه"
          value={<AnimatedNumber value={stats.avgStudyMinutes} />}
          hint="دقیقه در هر جلسه"
          empty={stats.avgStudyMinutes === 0}
          emptyLabel="هنوز جلسه‌ای نبوده"
        />
      </section>
    </Reveal>
  );
}
