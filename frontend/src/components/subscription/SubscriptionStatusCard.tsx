import {
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Info,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { SUBSCRIPTION_PLANS } from "../../config/subscription";
import type { BillingConfiguration } from "../../lib/bazaarBilling";
import type { EntitlementSnapshot } from "../../lib/entitlement";
import type { BillingState } from "../../services/subscription.service";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";

interface SubscriptionStatusCardProps {
  access: EntitlementSnapshot;
  products?: BillingConfiguration["products"];
  billing: BillingState;
  onRefresh: () => void;
  onRestore: () => void;
}

const dateTime = new Intl.DateTimeFormat("fa-IR", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function SubscriptionStatusCard({
  access,
  products,
  billing,
  onRefresh,
  onRestore,
}: SubscriptionStatusCardProps) {
  const active = access.bazaarStatus === "cached_active";
  const needsVerification = access.bazaarStatus === "needs_verification";
  const busy = billing.refreshing || billing.purchasing;
  const plans = SUBSCRIPTION_PLANS.filter((plan) =>
    products?.some(
      (product) =>
        product.plan === plan.id &&
        access.bazaarProductIds.includes(product.sku),
    ),
  );
  const title = active
    ? plans.length === 1
      ? `اشتراک ${plans[0].title} فعال است`
      : "اشتراک شما فعال است"
    : needsVerification
      ? "اشتراک نیاز به بررسی دارد"
      : access.bazaarStatus === "inactive"
        ? "اشتراک فعالی پیدا نشد"
        : "اشتراک را بررسی کنید";
  const StatusIcon = active
    ? ShieldCheck
    : needsVerification
      ? RefreshCw
      : Info;
  const MessageIcon =
    billing.messageKind === "success"
      ? CircleCheck
      : billing.messageKind === "error"
        ? CircleAlert
        : Info;
  // A previous success message must not outlive the access cache.
  const showMessage =
    billing.message && (billing.messageKind !== "success" || active);

  return (
    <section
      aria-labelledby="subscription-status-title"
      data-subscription-status={access.bazaarStatus}
      className={cn(
        "overflow-hidden rounded-3xl border bg-card shadow-sm",
        active
          ? "border-success/30"
          : needsVerification
            ? "border-warning/30"
            : "border-border",
      )}
    >
      <div
        className={cn(
          "space-y-5 p-5 sm:p-6",
          active && "bg-gradient-to-bl from-success/10 to-transparent",
          needsVerification &&
            "bg-gradient-to-bl from-warning/10 to-transparent",
        )}
      >
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
              active
                ? "bg-success/15 text-success"
                : needsVerification
                  ? "bg-warning/15 text-warning"
                  : "bg-muted text-muted-foreground",
            )}
          >
            <StatusIcon className="h-7 w-7" aria-hidden="true" />
          </span>
          <div className="min-w-0 space-y-2">
            <p
              className={cn(
                "text-xs font-medium",
                active ? "text-success" : "text-muted-foreground",
              )}
            >
              {active ? "تأییدشده در بازار" : "وضعیت اشتراک بازار"}
            </p>
            <h2
              id="subscription-status-title"
              className={cn(
                "text-xl font-bold leading-9",
                active && "text-success",
              )}
            >
              {title}
            </h2>
          </div>
        </div>

        <p className="text-sm leading-7 text-muted-foreground">
          {active
            ? "مطالعه روزانه، مرور آزاد و همه واژگان در دسترس شماست."
            : needsVerification
              ? "برای بررسی وضعیت فعلی اشتراک، به اینترنت وصل شوید و بررسی مجدد را بزنید."
              : access.bazaarStatus === "inactive"
                ? "اگر قبلاً اشتراک خریده‌اید، با همان حساب بازار خریدتان را بازیابی کنید."
                : "با اتصال به اینترنت می‌توانید اشتراک خود را بررسی یا خرید قبلی را بازیابی کنید."}
        </p>
        {active && plans.length > 1 && (
          <p className="text-sm text-success">
            پلن‌های فعال: {plans.map((plan) => plan.title).join("، ")}
          </p>
        )}

        {access.clockSuspicious && (
          <p
            role="alert"
            className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm leading-7 text-destructive"
          >
            زمان دستگاه تغییر کرده است؛ ساعت را تنظیم کنید و بررسی مجدد را
            بزنید.
          </p>
        )}

        {showMessage && (
          <div
            role={billing.messageKind === "error" ? "alert" : "status"}
            className={cn(
              "flex items-start gap-2 rounded-xl border p-3 text-sm leading-7",
              billing.messageKind === "success"
                ? "border-success/20 bg-success/10 text-success"
                : billing.messageKind === "error"
                  ? "border-destructive/20 bg-destructive/5 text-destructive"
                  : "border-border bg-muted/50 text-muted-foreground",
            )}
          >
            <MessageIcon className="mt-1 h-5 w-5 shrink-0" aria-hidden="true" />
            <p>{billing.message}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            disabled={busy}
            className="min-h-11 px-2"
            onClick={onRefresh}
          >
            <RefreshCw
              className={billing.refreshing ? "animate-spin" : ""}
              aria-hidden="true"
            />
            {billing.refreshing ? "در حال بررسی…" : "بررسی مجدد"}
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            className="min-h-11 px-2"
            onClick={onRestore}
          >
            <RotateCcw aria-hidden="true" />
            بازیابی خرید
          </Button>
        </div>
      </div>

      <details className="group border-t border-border/70 px-5 sm:px-6">
        <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-3 py-3 text-sm text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          جزئیات تأیید و استفاده آفلاین
          <ChevronDown
            className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"
            aria-hidden="true"
          />
        </summary>
        <div className="space-y-3 pb-5">
          <dl className="space-y-3 text-sm">
            <div className="space-y-1">
              <dt className="text-muted-foreground">آخرین تأیید بازار</dt>
              <dd>
                {access.lastVerifiedActiveAt === null ? (
                  "هنوز تأییدی دریافت نشده"
                ) : (
                  <time
                    dateTime={new Date(
                      access.lastVerifiedActiveAt,
                    ).toISOString()}
                  >
                    {dateTime.format(new Date(access.lastVerifiedActiveAt))}
                  </time>
                )}
              </dd>
            </div>
            {access.offlineAccessUntil !== null && (
              <div className="space-y-1">
                <dt className="text-muted-foreground">
                  مهلت استفاده بدون تأیید مجدد
                </dt>
                <dd>
                  <time
                    dateTime={new Date(access.offlineAccessUntil).toISOString()}
                  >
                    {dateTime.format(new Date(access.offlineAccessUntil))}
                  </time>
                </dd>
              </div>
            )}
          </dl>
          <p className="text-xs leading-6 text-muted-foreground">
            مهلت ۷روزه فقط برای استفاده بدون بررسی دوباره است. تاریخ پایان یا
            تمدید اشتراک را در حساب بازار ببینید.
          </p>
          <p className="text-xs leading-6 text-muted-foreground">
            برای بازیابی، با همان حساب خرید وارد برنامه بازار شوید و به اینترنت
            وصل باشید.
          </p>
        </div>
      </details>
    </section>
  );
}
