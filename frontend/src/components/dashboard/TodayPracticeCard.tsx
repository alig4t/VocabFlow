import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dumbbell,
  Lock,
  ArrowLeft,
  ShieldCheck,
  Brain,
  GalleryVerticalEnd,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStudyToday } from "@/hooks/useStudy";
import { cn } from "@/lib/utils";
import { faNum } from "@/lib/format";

/**
 * Heading for the practice section, deliberately outside the box.
 *
 * It sits at the inline start (the physical right), which is where the hero's
 * closing diagonal is shallowest and leaves a wedge of empty page above this
 * section — the heading fills it instead of the layout carrying dead space.
 */
function PracticeHeading({
  icon: Icon,
  badge,
  badgeClassName,
  chipClassName,
}: {
  icon: typeof Lock;
  badge: string;
  badgeClassName: string;
  chipClassName: string;
}) {
  return (
    <header className="flex items-center justify-start gap-2 pb-3 ps-1">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          chipClassName,
        )}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <h2 className="text-lg font-bold text-foreground">
        <span className="text-accent-foreground">تمرین</span> امروز
      </h2>
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-[10px] font-bold",
          badgeClassName,
        )}
      >
        {badge}
      </span>
    </header>
  );
}

/**
 * The section wrapper.
 *
 * `mt-*` pushes it clear of the hero's diagonal. The page container pulls its
 * children up onto that edge on purpose, but this is the first card and a
 * translucent panel sitting on the cream produced a stray gold wedge showing
 * through the box; the surface below is opaque for the same reason.
 */
function PracticeSection({ children }: { children: ReactNode }) {
  return <section className="mt-10 sm:mt-14">{children}</section>;
}

function PracticeTitle({ title }: { title: string }) {
  if (title === "مرور واژه‌های سخت امروز") {
    return (
      <>
        مرور واژه‌های <span className="text-destructive">سخت</span> امروز
      </>
    );
  }
  if (title === "مرور مجدد واژگان جدید امروز") {
    return (
      <>
        مرور مجدد واژگان <span className="text-success">جدید</span> امروز
      </>
    );
  }
  return title;
}

/**
 * "تمرین: مرور مجدد واژگان جدید امروز" — the reward section on Home.
 *
 * Both practice choices use the hero's queue metadata and stay locked until
 * the whole queue is empty.
 */
export function TodayPracticeCard() {
  const navigate = useNavigate();
  const { data, isLoading, isFetching, isError } = useStudyToday();

  if (isLoading || isFetching || isError || !data) return null;

  const { dueCount, newCount, introducedToday, hardTodayCount, hasPlans } =
    data.meta;
  const remaining = dueCount + newCount;

  // No practice without plans, or after an empty day with no practice words.
  if (!hasPlans) return null;

  const unlocked = remaining === 0;
  if (unlocked && introducedToday === 0 && !hardTodayCount) return null;

  if (!unlocked) {
    const lockedChoices = [
      ...(newCount > 0 || introducedToday > 0
        ? [
            {
              title: "مرور مجدد واژگان جدید امروز",
              description:
                introducedToday > 0
                  ? `${faNum(introducedToday)} واژه تا اینجا خوانده‌اید. `
                  : "",
            },
          ]
        : []),
      { title: "مرور واژه‌های سخت امروز", description: "" },
    ];

    return (
      <PracticeSection>
        <PracticeHeading
          icon={Lock}
          badge="قفل"
          chipClassName="bg-muted text-muted-foreground"
          badgeClassName="bg-muted text-muted-foreground"
        />

        <div
          className={cn(
            "grid gap-4",
            lockedChoices.length > 1 && "lg:grid-cols-2",
          )}
        >
          {lockedChoices.map(({ title, description }) => (
            <div
              key={title}
              aria-disabled="true"
              className="surface rounded-3xl border border-dashed border-border p-4 sm:p-5"
            >
              <p className="text-sm font-medium text-muted-foreground">
                <PracticeTitle title={title} />
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground/80">
                {description}
                با تمام‌کردن مطالعه امروز باز می‌شود.
              </p>
            </div>
          ))}
        </div>
      </PracticeSection>
    );
  }

  const choices = [
    ...(introducedToday > 0
      ? [
          {
            title: "مرور مجدد واژگان جدید امروز",
            description: "واژه‌هایی که امروز برای اولین بار خواندید",
            count: introducedToday,
            path: "/review-today",
            action: "شروع تمرین",
            icon: GalleryVerticalEnd,
          },
        ]
      : []),
    ...(hardTodayCount > 0
      ? [
          {
            title: "مرور واژه‌های سخت امروز",
            description: "واژه‌هایی که «سخت» یا «بلد نیستم» پاسخ دادید",
            count: hardTodayCount,
            path: "/review-hard-today",
            action: "تمرین واژه‌های سخت",
            icon: Brain,
          },
        ]
      : []),
  ];

  return (
    <PracticeSection>
      <PracticeHeading
        icon={Dumbbell}
        badge="باز شد"
        chipClassName="bg-primary text-primary-foreground shadow-sm"
        badgeClassName="bg-primary/15 text-accent-foreground"
      />

      <div className={cn("grid gap-4", choices.length > 1 && "lg:grid-cols-2")}>
        {choices.map(
          ({ title, description, count, path, action, icon: Icon }) => (
            <div
              key={path}
              className="surface relative overflow-hidden rounded-3xl p-5 sm:p-6"
            >
              {/* Soft glow — decorative only */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -left-10 -top-14 h-40 w-40 rounded-full bg-primary/15 blur-3xl"
              />

              <div
                className={cn(
                  "relative flex h-full flex-col gap-4",
                  choices.length === 1 &&
                    "sm:flex-row sm:items-center sm:justify-between",
                )}
              >
                <div className="flex min-w-0 items-center gap-4">
                  {/*
              The count leads. This is the second action on the page and it was
              reading as another paragraph of card copy; the numeral gives it
              something to be seen by from across the screen.
            */}
                  <span
                    className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-accent text-accent-foreground"
                    aria-hidden="true"
                  >
                    <span className="text-2xl font-black leading-none tabular-nums">
                      {faNum(count)}
                    </span>
                    <span className="mt-1 text-[10px] font-medium">واژه</span>
                  </span>

                  <div className="min-w-0 space-y-1.5">
                    <p className="text-base font-bold text-foreground">
                      <PracticeTitle title={title} />
                    </p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {description}
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <ShieldCheck
                        className="h-3.5 w-3.5 shrink-0"
                        aria-hidden="true"
                      />
                      بدون اثر روی زمان‌بندی مرور
                    </p>
                  </div>
                </div>

                <Button
                  size="lg"
                  className={cn(
                    "mt-auto w-full shrink-0 gap-2 text-base font-bold shadow-sm",
                    choices.length === 1 && "sm:mt-0 sm:w-auto",
                  )}
                  onClick={() => navigate(path)}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {action}
                  <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                </Button>
              </div>
            </div>
          ),
        )}
      </div>
    </PracticeSection>
  );
}
