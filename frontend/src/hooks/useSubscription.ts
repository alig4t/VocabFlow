import { useEffect, useSyncExternalStore } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isNative } from "../lib/platform";
import { subscriptionService } from "../services/subscription.service";

export const ENTITLEMENT_QUERY_KEY = ["subscription", "entitlement"] as const;

export function useEntitlement() {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ENTITLEMENT_QUERY_KEY,
    queryFn: () => subscriptionService.getSnapshot(),
    staleTime: 0,
    retry: false,
    // Native resume, entitlement events and deadline timers keep this local
    // snapshot current; focusing the window does not need another read.
    refetchOnWindowFocus: false,
    refetchInterval: isNative() ? 60_000 : false,
  });
  useEffect(() => {
    if (!isNative()) return;
    const invalidate = () => {
      void client.invalidateQueries({ queryKey: ENTITLEMENT_QUERY_KEY });
    };
    window.addEventListener("vocabflow:entitlement-changed", invalidate);
    return () =>
      window.removeEventListener("vocabflow:entitlement-changed", invalidate);
  }, [client]);
  useEffect(() => {
    if (!isNative() || !query.data) return;
    const evaluatedAt = query.data.evaluatedAt;
    const candidates = [
      query.data.offlineAccessUntil,
      query.data.developerUntil,
    ].filter((time): time is number => time !== null && time > evaluatedAt);
    // Re-evaluate both paid deadlines and the 06:00 study-day rollover.
    const nextDay = new Date(evaluatedAt);
    nextDay.setHours(6, 0, 0, 0);
    if (nextDay.getTime() <= evaluatedAt)
      nextDay.setDate(nextDay.getDate() + 1);
    candidates.push(nextDay.getTime());
    const timeout = window.setTimeout(
      () => {
        void client.invalidateQueries({ queryKey: ENTITLEMENT_QUERY_KEY });
      },
      Math.min(
        2_147_483_647,
        Math.max(1, Math.min(...candidates) - evaluatedAt),
      ),
    );
    return () => window.clearTimeout(timeout);
  }, [client, query.data]);
  return query;
}

export function useSubscription() {
  const entitlement = useEntitlement();
  const billing = useSyncExternalStore(
    subscriptionService.subscribeState,
    subscriptionService.getBillingState,
  );
  const configuration = useQuery({
    queryKey: ["subscription", "configuration"],
    queryFn: subscriptionService.getConfiguration,
    enabled: isNative(),
    retry: false,
    staleTime: Infinity,
  });
  const products = useQuery({
    queryKey: ["subscription", "products"],
    queryFn: subscriptionService.getProducts,
    enabled: isNative() && configuration.data?.configured === true,
    retry: false,
  });
  useEffect(() => {
    if (!isNative()) return;
    // Each page visit uses the manual refresh flow, sharing any pending query.
    // Failures are reported through billing state without changing cached access.
    void subscriptionService.refresh().catch(() => undefined);
  }, []);
  return {
    entitlement,
    billing,
    configuration,
    products,
    actions: subscriptionService,
  };
}
