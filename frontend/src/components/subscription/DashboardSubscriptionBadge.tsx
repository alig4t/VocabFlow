import { Link } from "react-router-dom";
import {
  CircleHelp,
  Crown,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useEntitlement } from "../../hooks/useSubscription";
import { faNum } from "../../lib/format";
import { isNative } from "../../lib/platform";

function NativeSubscriptionBadge() {
  // Only reads the shared local snapshot; useSubscription would query Bazaar.
  const { data: access, isPending, isError } = useEntitlement();
  const status = (() => {
    if (isPending)
      return {
        id: "loading",
        Icon: LoaderCircle,
        label: "وضعیت اشتراک",
        shortLabel: "در حال بررسی",
        detail: "در حال خواندن وضعیت دسترسی",
        tone: "",
      };
    if (isError || !access)
      return {
        id: "unknown",
        Icon: CircleHelp,
        label: "بررسی وضعیت اشتراک",
        shortLabel: "بررسی وضعیت",
        detail: "وضعیت دسترسی بارگذاری نشد",
        tone: "",
      };
    if (access.source === "bazaar")
      return {
        id: "active",
        Icon: Crown,
        label: "اشتراک ویژه فعال",
        shortLabel: "ویژه فعال",
        detail: "دسترسی ویژه شما با تأیید بازار فعال است",
        tone: "text-success",
      };
    if (access.source === "developer")
      return {
        id: "developer",
        Icon: ShieldCheck,
        label: "دسترسی توسعه‌دهنده",
        shortLabel: "توسعه‌دهنده",
        detail: "دسترسی ویژه توسعه‌دهنده فعال است",
        tone: "text-success",
      };
    if (access.bazaarStatus === "needs_verification" || access.clockSuspicious)
      return {
        id: "verification",
        Icon: RefreshCw,
        label: "اشتراک نیاز به تأیید دارد",
        shortLabel: "نیاز به تأیید",
        detail: "برای تأیید دوباره اشتراک، صفحه اشتراک من را باز کنید",
        tone: "text-foreground",
      };
    if (access.source === "trial")
      return {
        id: "trial",
        Icon: Sparkles,
        label: "دوره آزمایشی",
        shortLabel: "آزمایشی",
        detail:
          access.trialRemainingDays === 0 && access.trialDayActive
            ? "آخرین روز آزمایشی تا ساعت ۶ صبح بعدی فعال است"
            : `${faNum(access.trialRemainingDays)} روز مطالعه آزمایشی باقی مانده`,
        tone: "text-foreground",
      };
    return {
      id: "inactive",
      Icon: Crown,
      label: "اشتراک ویژه غیرفعال",
      shortLabel: "غیرفعال",
      detail:
        "برای تهیه اشتراک یا بازیابی خرید قبلی، صفحه اشتراک من را باز کنید",
      tone: "text-muted-foreground",
    };
  })();
  const { Icon } = status;

  return (
    <Link
      to="/subscription"
      dir="rtl"
      data-dashboard-subscription={status.id}
      aria-label={`${status.label}؛ ${status.detail}؛ مشاهده اشتراک من`}
      aria-busy={isPending}
      title={`${status.label}؛ ${status.detail}`}
      className="absolute -left-2 top-[calc(5rem+var(--safe-top))] z-10 flex min-h-11 max-w-28 items-center rounded-r-lg text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:-left-4 md:-left-6 md:top-[calc(5.5rem+var(--safe-top))] lg:-left-8 lg:top-[calc(6rem+var(--safe-top))]"
    >
      <span className="dashboard-subscription-label flex min-h-8 max-w-full items-center gap-1.5 rounded-r-lg border border-l-0 py-1.5 pl-3 pr-2.5 text-[11px] font-semibold shadow-sm transition-shadow hover:shadow-md">
        <Icon
          className={`h-3.5 w-3.5 shrink-0 ${status.tone} ${isPending ? "animate-spin motion-reduce:animate-none" : ""}`}
          aria-hidden="true"
        />
        <span className="truncate" aria-live="polite">
          {status.shortLabel}
        </span>
      </span>
    </Link>
  );
}

export function DashboardSubscriptionBadge() {
  return isNative() ? <NativeSubscriptionBadge /> : null;
}
