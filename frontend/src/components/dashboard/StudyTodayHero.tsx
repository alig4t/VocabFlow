import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Brain,
  Check,
  Flame,
  Repeat2,
  Sparkles,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { HeroBlob } from "./HeroBlob";
import { HeroPattern } from "./HeroPattern";
import { useStudyToday } from "@/hooks/useStudy";
import { faNum, faPercent } from "@/lib/format";

interface StudyTodayHeroProps {
  streak?: number;
  accuracy?: number;
  wordsInMemory?: number;
  loadingStats?: boolean;
}

/** One quiet row of supporting metrics; the daily workload remains the focus. */
function HeroStats({
  streak,
  accuracy,
  wordsInMemory,
  loadingStats,
}: Required<StudyTodayHeroProps>) {
  const metrics = [
    ...(streak > 0
      ? [
          {
            icon: Flame,
            value: faNum(streak),
            label: "روز پیاپی",
            tone: "dashboard-hero-icon-streak",
          },
        ]
      : []),
    ...(accuracy > 0
      ? [
          {
            icon: Target,
            value: faPercent(accuracy),
            label: "دقت پاسخ‌ها",
            tone: "dashboard-hero-icon-accuracy",
          },
        ]
      : []),
    ...(wordsInMemory > 0
      ? [
          {
            icon: Brain,
            value: faNum(wordsInMemory),
            label: "واژه در حافظه",
            tone: "dashboard-hero-icon-memory",
          },
        ]
      : []),
  ];
  return (
    <footer className="dashboard-hero-footer">
      {loadingStats ? (
        <div
          className="dashboard-hero-stats"
          aria-label="در حال بارگذاری آمار"
          aria-busy="true"
        >
          {[0, 1, 2].map((i) => (
            <div key={i} className="dashboard-hero-stat">
              <Skeleton className="dashboard-hero-skeleton h-5 w-12" />
              <Skeleton className="dashboard-hero-skeleton mt-2 h-3 w-16" />
            </div>
          ))}
        </div>
      ) : metrics.length > 0 ? (
        <dl
          className="dashboard-hero-stats"
          style={{
            gridTemplateColumns: `repeat(${metrics.length}, minmax(0, 1fr))`,
          }}
        >
          {metrics.map(({ icon: Icon, value, label, tone }) => (
            <div key={label} className="dashboard-hero-stat">
              <dt className="dashboard-hero-stat-label">{label}</dt>
              <dd className="dashboard-hero-stat-value">
                <Icon
                  className={`h-3.5 w-3.5 ${tone}`}
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
                {value}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="dashboard-hero-signature">
          یادگیری ماندگار، با قدم‌های کوچک.
        </p>
      )}
    </footer>
  );
}

function ProgressSkeleton() {
  return (
    <div
      className="dashboard-hero-progress"
      aria-label="در حال بارگذاری مطالعه امروز"
      aria-busy="true"
    >
      <Skeleton className="dashboard-hero-skeleton h-3 w-20" />
      <Skeleton className="dashboard-hero-skeleton h-4 w-8" />
      <Skeleton className="dashboard-hero-skeleton h-1 w-16" />
      <Skeleton className="dashboard-hero-skeleton h-3 w-10" />
    </div>
  );
}

/** Gold extends behind the existing merged navbar and transparent native status bar. */
export function StudyTodayHero({
  streak = 0,
  accuracy = 0,
  wordsInMemory = 0,
  loadingStats = false,
}: StudyTodayHeroProps) {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useStudyToday();
  const meta = data?.meta;
  const remaining = (meta?.dueCount ?? 0) + (meta?.newCount ?? 0);
  const reviewed = meta?.reviewedToday ?? 0;
  const planned = remaining + reviewed;
  const progress =
    planned > 0 ? Math.min(100, Math.max(0, (reviewed / planned) * 100)) : 0;
  const done = remaining === 0;
  const hasPlans = !!meta?.hasPlans;
  const failed = isError && !data;
  const plan = meta?.plans[0];
  const lessonLabel =
    plan && plan.currentLesson != null
      ? `${plan.continueLesson ? "ادامه‌ی" : "شروع"} درس ${faNum(plan.currentLesson)} — ${plan.bookTitle}`
      : null;

  return (
    <section
      dir="rtl"
      className="dashboard-today-hero page-bleed-under-nav bg-hero-deep relative overflow-hidden pb-16 pt-[calc(6rem+var(--safe-top))] text-deep-foreground sm:pb-20 sm:pt-[calc(7rem+var(--safe-top))]"
      aria-label="مطالعه امروز"
    >
      <HeroBlob className="absolute -bottom-36 -start-24 w-[30rem] opacity-60 sm:w-[36rem]" />
      <HeroBlob
        variant={2}
        className="absolute -end-12 top-0 w-40 -scale-x-100 opacity-50 sm:w-52"
      />
      <HeroPattern />
      <div className="dashboard-hero-inner">
        <div className="dashboard-hero-main">
          <div className="dashboard-hero-copy">
            <p className="dashboard-hero-eyebrow">برنامه‌ی امروز</p>
            {isLoading ? (
              <div className="flex flex-col items-center" aria-hidden="true">
                <Skeleton className="dashboard-hero-skeleton mt-3 h-14 w-44" />
                <Skeleton className="dashboard-hero-skeleton mt-1 h-8 w-52" />
                <Skeleton className="dashboard-hero-skeleton mt-3 h-5 w-48" />
              </div>
            ) : (
              <>
                <h2 className="dashboard-hero-heading">
                  {failed ? (
                    <>
                      برنامه امروز
                      <br />
                      <span>بارگذاری نشد.</span>
                    </>
                  ) : !hasPlans ? (
                    <>
                      یک شروع تازه،
                      <br />
                      <span>با یک کتاب خوب.</span>
                    </>
                  ) : done ? (
                    reviewed > 0 ? (
                      <>
                        امروزت را ساختی.
                        <br />
                        <span>یک قدم دیگر جلوتر.</span>
                      </>
                    ) : (
                      <>
                        امروز، خیالت راحت.
                        <br />
                        <span>برای امروز کاری نمانده.</span>
                      </>
                    )
                  ) : (
                    <>
                      <span className="dashboard-hero-workload">
                        {faNum(remaining)} <span>واژه</span>
                      </span>
                      <span>یک قدم جلوتر، هر روز.</span>
                    </>
                  )}
                </h2>
                {hasPlans && !done && !failed && (
                  <dl className="dashboard-hero-queue">
                    <div>
                      <dt>مرور</dt>
                      <dd>
                        <Repeat2
                          className="dashboard-hero-icon-accuracy h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                        {faNum(meta?.dueCount ?? 0)}
                      </dd>
                    </div>
                    <div>
                      <dt>واژه جدید</dt>
                      <dd>
                        <Sparkles
                          className="dashboard-hero-icon-new h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                        {faNum(meta?.newCount ?? 0)}
                      </dd>
                    </div>
                  </dl>
                )}
                {(failed || !hasPlans) && (
                  <p className="dashboard-hero-description">
                    {failed
                      ? "دوباره تلاش کن تا برنامه‌ات را ببینی."
                      : "از کتابخانه انتخاب کن؛ برنامه روزانه‌ات را ما می‌چینیم."}
                  </p>
                )}
              </>
            )}
          </div>

          {isLoading ? (
            <ProgressSkeleton />
          ) : hasPlans && !failed ? (
            <div className="dashboard-hero-progress">
              {planned > 0 ? (
                <>
                  <p className="dashboard-hero-progress-label">پیشرفت امروز</p>
                  <p className="dashboard-hero-progress-value">
                    {faPercent(Math.round(progress))}
                  </p>
                  <div
                    className="dashboard-hero-progress-track"
                    role="progressbar"
                    aria-label="پیشرفت مطالعه امروز"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(progress)}
                    aria-valuetext={`${faNum(reviewed)} از ${faNum(planned)} واژه مرور شده`}
                  >
                    <span style={{ width: `${progress}%` }} />
                  </div>
                  <p
                    className="dashboard-hero-progress-caption"
                    aria-label={
                      done
                        ? "مطالعه امروز کامل شد"
                        : `${faNum(reviewed)} از ${faNum(planned)} واژه مرور شده`
                    }
                    title={`${faNum(reviewed)} از ${faNum(planned)} واژه مرور شده`}
                  >
                    {done && (
                      <Check
                        className="dashboard-hero-icon-memory h-3.5 w-3.5"
                        aria-hidden="true"
                      />
                    )}
                    <span>
                      {faNum(reviewed)} از {faNum(planned)}
                    </span>
                  </p>
                </>
              ) : (
                <p className="dashboard-hero-rest">
                  <Check
                    className="dashboard-hero-icon-memory h-3.5 w-3.5"
                    aria-hidden="true"
                  />
                  واژه‌ای در صف امروز نیست.
                </p>
              )}
            </div>
          ) : null}
        </div>
        <HeroStats
          streak={streak}
          accuracy={accuracy}
          wordsInMemory={wordsInMemory}
          loadingStats={isLoading || loadingStats}
        />
        <div className="dashboard-hero-actions">
          {isLoading ? (
            <>
              <Skeleton className="dashboard-hero-skeleton h-[52px] w-full rounded-2xl sm:max-w-64" />
              <Skeleton className="dashboard-hero-skeleton mt-2.5 h-4 w-48" />
            </>
          ) : (
            <>
              <Button
                className="dashboard-hero-cta"
                onClick={() =>
                  failed
                    ? void refetch()
                    : navigate(
                        !hasPlans
                          ? "/library"
                          : done
                            ? "/statistics"
                            : "/study",
                      )
                }
              >
                {failed
                  ? "تلاش دوباره"
                  : !hasPlans
                    ? "انتخاب اولین کتاب"
                    : done
                      ? "مشاهده پیشرفت"
                      : reviewed > 0
                        ? "ادامه مطالعه"
                        : "شروع مطالعه"}
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </Button>
              {lessonLabel && hasPlans && !done && (
                <p className="dashboard-hero-lesson" title={lessonLabel}>
                  {lessonLabel}
                </p>
              )}
            </>
          )}
        </div>
      </div>
      <svg
        aria-hidden="true"
        viewBox="0 0 100 20"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 block h-12 w-full sm:h-16"
      >
        <path
          d="M0,11 C12,5 26,15 45,10 C64,5 80,15 100,8 L100,21 L0,21 Z"
          fill="hsl(var(--deep-wave))"
        />
        <path
          d="M0,15 C12,9 26,19 45,14 C64,9 80,19 100,12 L100,22 L0,22 Z"
          fill="hsl(var(--background))"
        />
      </svg>
    </section>
  );
}
