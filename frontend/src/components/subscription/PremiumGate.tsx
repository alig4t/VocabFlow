import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Crown, RefreshCw } from "lucide-react";
import { isNative } from "../../lib/platform";
import { useEntitlement } from "../../hooks/useSubscription";
import { Button } from "../ui/button";
import { PageLoader } from "../layout/PageLoader";

export function PremiumPaywall({ compact = false }: { compact?: boolean }) {
  return (
    <div
      dir="rtl"
      className={`font-persian rounded-2xl border border-border bg-card text-center ${compact ? "p-5" : "mx-auto max-w-lg space-y-5 p-8"}`}
    >
      <Crown className="mx-auto h-9 w-9 text-primary" aria-hidden="true" />
      <h2 className="mt-3 text-lg font-bold">
        ادامه یادگیری با دسترسی Premium
      </h2>
      <p className="my-3 text-sm leading-7 text-muted-foreground">
        برای ادامه، وضعیت اشتراک را در بازار بررسی کنید یا اشتراک تهیه کنید.
        پیشرفت مطالعه شما محفوظ است.
      </p>
      <Button asChild className="gap-2">
        <Link to="/subscription">
          <Crown className="h-4 w-4" />
          اشتراک من
        </Link>
      </Button>
    </div>
  );
}

function AccessGuard({
  children,
  compact,
  hideWhenLocked,
}: {
  children: ReactNode;
  compact?: boolean;
  hideWhenLocked?: boolean;
}) {
  const entitlement = useEntitlement();
  if (entitlement.isPending) return compact ? null : <PageLoader />;
  if (entitlement.isError) {
    return (
      <div
        dir="rtl"
        className="space-y-3 rounded-2xl border border-border p-6 text-center font-persian"
      >
        <p className="text-sm text-muted-foreground">
          اطلاعات دسترسی بارگذاری نشد.
        </p>
        <Button
          variant="outline"
          onClick={() => void entitlement.refetch()}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          تلاش مجدد
        </Button>
      </div>
    );
  }
  if (!entitlement.data.hasPremiumAccess)
    return hideWhenLocked ? null : <PremiumPaywall compact={compact} />;
  return children;
}

/** Also used for word previews on otherwise accessible dashboard/statistics. */
export function PremiumContent({
  children,
  hideWhenLocked,
}: {
  children: ReactNode;
  hideWhenLocked?: boolean;
}) {
  return isNative() ? (
    <AccessGuard compact hideWhenLocked={hideWhenLocked}>
      {children}
    </AccessGuard>
  ) : (
    children
  );
}

export function PremiumGate({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const protectedPath =
    /^\/(study|review-today|review-hard-today|hard-words)(\/|$)/.test(
      pathname,
    ) ||
    /^\/vocabulary(\/|$)/.test(pathname) ||
    /^\/admin\/words(\/|$)/.test(pathname);
  return isNative() && protectedPath ? (
    <AccessGuard>{children}</AccessGuard>
  ) : (
    children
  );
}
