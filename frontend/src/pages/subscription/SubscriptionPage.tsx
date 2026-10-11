import { Crown, RefreshCw, RotateCcw, Check } from "lucide-react";
import { SUBSCRIPTION_PLANS } from "../../config/subscription";
import { useSubscription } from "../../hooks/useSubscription";
import { Button } from "../../components/ui/button";
import { PageLoader } from "../../components/layout/PageLoader";
import { isNative } from "../../lib/platform";

const date = (time: number | null) =>
  time === null
    ? "هنوز تأییدی دریافت نشده"
    : new Intl.DateTimeFormat("fa-IR", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(time));

export function SubscriptionPage() {
  const { entitlement, billing, configuration, products, actions } =
    useSubscription();
  if (!isNative())
    return (
      <p dir="rtl" className="font-persian">
        اشتراک در نسخه اندروید در دسترس است.
      </p>
    );
  if (entitlement.isPending) return <PageLoader />;
  if (entitlement.isError)
    return (
      <div dir="rtl" className="space-y-4 text-center font-persian">
        <p>اطلاعات دسترسی بارگذاری نشد.</p>
        <Button onClick={() => void entitlement.refetch()}>تلاش مجدد</Button>
      </div>
    );
  const access = entitlement.data;
  const busy = billing.refreshing || billing.purchasing;
  const status =
    access.bazaarStatus === "cached_active"
      ? "دسترسی با آخرین تأیید بازار"
      : access.bazaarStatus === "needs_verification"
        ? "برای ادامه دسترسی اشتراکی، بررسی مجدد لازم است"
        : access.bazaarStatus === "inactive"
          ? "بازار اشتراک فعالی برای این حساب گزارش نکرده است"
          : "اشتراک هنوز بررسی نشده است";

  return (
    <div dir="rtl" className="mx-auto max-w-3xl space-y-6 pb-6 font-persian">
      <header className="space-y-2 text-center">
        <Crown className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
        <h1 className="text-2xl font-bold">اشتراک من</h1>
        <p className="text-sm leading-7 text-muted-foreground">
          دسترسی به مطالعه، مرور آزاد و همه واژگان
        </p>
      </header>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-bold">وضعیت اشتراک بازار</h2>
        <p className="text-sm leading-7">{status}</p>
        <dl className="space-y-2 text-sm text-muted-foreground">
          <div>
            <dt className="inline">آخرین تأیید اشتراک فعال: </dt>
            <dd className="inline">{date(access.lastVerifiedActiveAt)}</dd>
          </div>
          {access.offlineAccessUntil !== null && (
            <div>
              <dt className="inline">مهلت استفاده بدون تأیید مجدد: </dt>
              <dd className="inline">{date(access.offlineAccessUntil)}</dd>
            </div>
          )}
        </dl>
        <p className="text-xs leading-6 text-muted-foreground">
          این مهلت ۷روزه، تاریخ انقضای واقعی اشتراک نیست. خطای بررسی، وضعیت
          تأییدشده قبلی را پاک نمی‌کند.
        </p>
        {access.clockSuspicious && (
          <p className="text-sm text-destructive">
            زمان دستگاه تغییر کرده است؛ ساعت را تنظیم کنید و بررسی مجدد را
            بزنید.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={busy}
            className="gap-2"
            onClick={() => void actions.refresh().catch(() => undefined)}
          >
            <RefreshCw
              className={`h-4 w-4 ${billing.refreshing ? "animate-spin" : ""}`}
            />
            بررسی مجدد
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            className="gap-2"
            onClick={() => void actions.restore().catch(() => undefined)}
          >
            <RotateCcw className="h-4 w-4" />
            بازیابی خرید
          </Button>
        </div>
        <p className="text-xs leading-6 text-muted-foreground">
          برای بازیابی، با همان حساب خرید وارد برنامه بازار شوید و به اینترنت
          وصل باشید.
        </p>
        {billing.message && (
          <p role="status" className="text-sm leading-7">
            {billing.message}
          </p>
        )}
      </section>

      <section className="space-y-2 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-bold">دوره آزمایشی</h2>
        <p className="text-sm">
          {new Intl.NumberFormat("fa-IR").format(access.trialRemainingDays)} روز
          مطالعه باقی مانده
        </p>
        {access.trialDayActive && (
          <p className="text-sm text-primary">
            روز آزمایشی امروز تا ساعت ۶ صبح بعدی در دسترس است.
          </p>
        )}
        <p className="text-xs leading-6 text-muted-foreground">
          دوره آزمایشی ۶ روز مطالعه است. هنگام دسترسی با اشتراک یا دسترسی
          توسعه‌دهنده، روز آزمایشی مصرف نمی‌شود.
        </p>
        {access.source === "trial" && (
          <p className="text-sm text-primary">در حال استفاده از دوره آزمایشی</p>
        )}
      </section>

      {access.developerUntil !== null && (
        <section className="space-y-2 rounded-2xl border border-border bg-card p-5">
          <h2 className="font-bold">دسترسی توسعه‌دهنده</h2>
          <p className="text-sm text-muted-foreground">
            اعتبار تا: {date(access.developerUntil)}
          </p>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-bold">انتخاب اشتراک</h2>
        <ul className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          {["همه کتاب‌ها", "مطالعه روزانه", "مرور آزاد", "همه واژگان"].map(
            (text) => (
              <li key={text} className="flex items-center gap-1">
                <Check className="h-4 w-4 text-primary" />
                {text}
              </li>
            ),
          )}
        </ul>
        <div className="grid gap-3 sm:grid-cols-3">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const sku = configuration.data?.products.find(
              (item) => item.plan === plan.id,
            )?.sku;
            const product = products.data?.find((item) => item.sku === sku);
            return (
              <article
                key={plan.id}
                className="space-y-4 rounded-2xl border border-border bg-card p-5 text-center"
              >
                <h3 className="font-bold">{plan.title}</h3>
                <p className="text-xs text-muted-foreground">{plan.period}</p>
                <p className="min-h-6 text-sm font-semibold">
                  {product?.price ?? "قیمت از بازار دریافت می‌شود"}
                </p>
                <Button
                  className="w-full"
                  disabled={busy || !product || !configuration.data?.configured}
                  onClick={() =>
                    void actions.purchase(plan.id).catch(() => undefined)
                  }
                >
                  {billing.purchasing ? "در حال خرید…" : "خرید اشتراک"}
                </Button>
              </article>
            );
          })}
        </div>
        {configuration.data?.configured === false && (
          <p
            role="status"
            className="text-center text-sm text-muted-foreground"
          >
            خرید اشتراک هنوز آماده نیست؛ دوره آزمایشی در دسترس است.
          </p>
        )}
        {(products.isError || configuration.isError) && (
          <div className="space-y-2 text-center">
            <p className="text-sm text-muted-foreground">
              اطلاعات اشتراک‌ها دریافت نشد.
            </p>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                void configuration.refetch();
                void products.refetch();
              }}
            >
              دریافت دوباره قیمت‌ها
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
