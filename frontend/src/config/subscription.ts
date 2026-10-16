/** Set false to hide the discount input and stop sending tokens on all purchases.
 * This is a build-time switch; changing it requires releasing a new app build.
 */
export const SUBSCRIPTION_DISCOUNTS_ENABLED = true;

/** Product policy; actual Bazaar SKUs/RSA live in android/billing.local.properties. */
export const SUBSCRIPTION_POLICY = {
  trialDays: 6,
  offlineGraceMs: 7 * 24 * 60 * 60 * 1000,
  clockToleranceMs: 2 * 60 * 1000,
  developerDays: 30,
  developerTapCount: 7,
  developerTapTimeoutMs: 1500,
} as const;

export const SUBSCRIPTION_PLANS = [
  { id: "monthly", title: "یک‌ماهه", period: "۳۰ روز" },
  { id: "quarterly", title: "سه‌ماهه", period: "۹۰ روز" },
  { id: "yearly", title: "یک‌ساله", period: "۳۶۵ روز" },
] as const;

export type SubscriptionPlanId = (typeof SUBSCRIPTION_PLANS)[number]["id"];
