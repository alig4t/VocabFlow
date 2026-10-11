import { isNative } from "../lib/platform";
import { BazaarBilling } from "../lib/bazaarBilling";
import {
  PremiumAccessError,
  type EntitlementSnapshot,
} from "../lib/entitlement";
import type { SubscriptionPlanId } from "../config/subscription";

const offline = () => import("../offline/entitlement.repo");
const WEB_ACCESS: EntitlementSnapshot = {
  evaluatedAt: 0,
  hasPremiumAccess: true,
  source: "web",
  bazaarStatus: "unknown",
  trialRemainingDays: 0,
  trialDayActive: false,
  lastSuccessfulQueryAt: null,
  lastVerifiedActiveAt: null,
  offlineAccessUntil: null,
  developerUntil: null,
  clockSuspicious: false,
};

let snapshotFlight: Promise<EntitlementSnapshot> | null = null;
let refreshFlight: Promise<void> | null = null;
let purchaseFlight: Promise<void> | null = null;
let billingState = { refreshing: false, purchasing: false, message: "" };
const listeners = new Set<() => void>();
function updateBilling(state: Partial<typeof billingState>) {
  billingState = { ...billingState, ...state };
  for (const listener of listeners) listener();
}
function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "بررسی بازار انجام نشد؛ دوباره تلاش کنید.";
}

export const subscriptionService = {
  subscribeState(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getBillingState: () => billingState,

  getSnapshot(): Promise<EntitlementSnapshot> {
    if (!isNative()) return Promise.resolve(WEB_ACCESS);
    if (!snapshotFlight) {
      snapshotFlight = BazaarBilling.getEnvironment()
        .then(async (sample) =>
          (await offline()).getEntitlementSnapshot(sample),
        )
        .finally(() => {
          snapshotFlight = null;
        });
    }
    return snapshotFlight;
  },

  async assertAccess(): Promise<void> {
    if (!(await subscriptionService.getSnapshot()).hasPremiumAccess)
      throw new PremiumAccessError();
  },

  getConfiguration: () => BazaarBilling.getConfiguration(),
  getProducts: () =>
    BazaarBilling.getProducts().then((result) => result.products),

  async onResume(): Promise<void> {
    if (!isNative()) return;
    await subscriptionService.getSnapshot();
    window.dispatchEvent(new Event("vocabflow:entitlement-changed"));
    if ((await BazaarBilling.getEnvironment()).online)
      await subscriptionService.refresh();
  },

  refresh(): Promise<void> {
    if (!isNative()) return Promise.resolve();
    if (refreshFlight) return refreshFlight;
    updateBilling({ refreshing: true, message: "" });
    refreshFlight = (async () => {
      const environment = await BazaarBilling.getEnvironment();
      if (!environment.online)
        throw new Error("برای بررسی اشتراک به اینترنت وصل شوید.");
      const { purchases, clock } = await BazaarBilling.getSubscribedProducts();
      await (await offline()).saveVerifiedSubscriptions(purchases, clock);
      updateBilling({
        message:
          purchases.length > 0
            ? "اشتراک از بازار تأیید شد."
            : "بازار اشتراک فعالی برای این حساب گزارش نکرد.",
      });
    })()
      .catch((error: unknown) => {
        // No cache writes on failure: in particular the 168-hour window stays put.
        updateBilling({ message: errorMessage(error) });
        throw error;
      })
      .finally(() => {
        refreshFlight = null;
        updateBilling({ refreshing: false });
      });
    return refreshFlight;
  },

  restore(): Promise<void> {
    return subscriptionService.refresh();
  },

  purchase(plan: SubscriptionPlanId): Promise<void> {
    if (!isNative())
      return Promise.reject(
        new Error("خرید اشتراک در نسخه اندروید در دسترس است."),
      );
    if (purchaseFlight) return purchaseFlight;
    updateBilling({ purchasing: true, message: "" });
    purchaseFlight = (async () => {
      const configuration = await BazaarBilling.getConfiguration();
      const product = configuration.products.find((item) => item.plan === plan);
      if (!configuration.configured || !product?.sku)
        throw new Error("خرید اشتراک هنوز آماده نیست.");
      await BazaarBilling.subscribe({ sku: product.sku });
      // A purchase callback is not an expiry or a new offline authorization.
      // A query that began before this purchase cannot confirm its result.
      if (refreshFlight) await refreshFlight.catch(() => undefined);
      await subscriptionService.refresh();
    })()
      .catch((error: unknown) => {
        updateBilling({ message: errorMessage(error) });
        throw error;
      })
      .finally(() => {
        purchaseFlight = null;
        updateBilling({ purchasing: false });
      });
    return purchaseFlight;
  },

  async activateDeveloper(code: string): Promise<void> {
    if (!isNative())
      throw new Error("این دسترسی در نسخه اندروید در دسترس است.");
    const grant = await BazaarBilling.activateDeveloper({
      code: code.trim().toUpperCase(),
    });
    await (await offline()).saveDeveloperGrant(grant);
  },
};
