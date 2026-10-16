import { SUBSCRIPTION_POLICY } from "../config/subscription";
import { startOfDay } from "../offline/srs";

export interface VerifiedPurchase {
  productId: string;
  packageName: string;
  purchaseToken: string;
  orderId: string;
  purchaseTime: number;
  originalJson: string;
  dataSignature: string;
}

export interface BazaarCache {
  version: 1;
  state: "active" | "inactive";
  lastSuccessfulQueryAt: number;
  lastVerifiedActiveAt: number | null;
  offlineAccessUntil: number | null;
  purchases: VerifiedPurchase[];
}

export interface TrialState {
  version: 1;
  consumedDayKeys: string[];
}

export interface DeveloperGrant {
  version: 1;
  activatedAt: number;
  validUntil: number;
  lastCodeDay: string;
}

export interface ClockSample {
  wallTime: number;
  elapsedRealtime: number;
  bootId: string | null;
}

export interface ClockState extends ClockSample {
  effectiveTime: number;
  suspicious: boolean;
}

export interface EntitlementRecords {
  trial: TrialState;
  bazaar: BazaarCache | null;
  developer: DeveloperGrant | null;
  clock: ClockState | null;
}

export interface EntitlementSnapshot {
  evaluatedAt: number;
  hasPremiumAccess: boolean;
  source: "bazaar" | "developer" | "trial" | "locked" | "web";
  bazaarStatus: "cached_active" | "inactive" | "needs_verification" | "unknown";
  /** Verified SKUs only while the Bazaar access cache is usable. */
  bazaarProductIds: string[];
  trialRemainingDays: number;
  trialDayActive: boolean;
  lastSuccessfulQueryAt: number | null;
  lastVerifiedActiveAt: number | null;
  offlineAccessUntil: number | null;
  developerUntil: number | null;
  clockSuspicious: boolean;
}

export function studyDayKey(now: Date): string {
  const day = startOfDay(now);
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
}

/** Monotonic time during a boot; a persisted high-water mark across boots. */
export function advanceClock(
  previous: ClockState | null,
  sample: ClockSample,
  verified = false,
): ClockState {
  if (!previous || verified) {
    return { ...sample, effectiveTime: sample.wallTime, suspicious: false };
  }
  const sameBoot = sample.bootId !== null && sample.bootId === previous.bootId;
  const elapsed = sameBoot
    ? Math.max(0, sample.elapsedRealtime - previous.elapsedRealtime)
    : 0;
  const expected = previous.effectiveTime + elapsed;
  return {
    ...sample,
    effectiveTime: Math.max(expected, sample.wallTime),
    suspicious:
      previous.suspicious ||
      sample.wallTime < expected - SUBSCRIPTION_POLICY.clockToleranceMs ||
      (sameBoot && sample.elapsedRealtime < previous.elapsedRealtime),
  };
}

export function confirmedBazaarCache(
  previous: BazaarCache | null,
  purchases: VerifiedPurchase[],
  now: number,
): BazaarCache {
  const active = purchases.length > 0;
  return {
    version: 1,
    state: active ? "active" : "inactive",
    lastSuccessfulQueryAt: now,
    lastVerifiedActiveAt: active
      ? now
      : (previous?.lastVerifiedActiveAt ?? null),
    offlineAccessUntil: active
      ? now + SUBSCRIPTION_POLICY.offlineGraceMs
      : null,
    purchases: active ? purchases : [],
  };
}

export function evaluateEntitlement(
  records: EntitlementRecords,
  now: Date,
): EntitlementSnapshot {
  const { trial, bazaar, developer, clock } = records;
  const effectiveTime = Math.max(now.getTime(), clock?.effectiveTime ?? 0);
  const clockSuspicious = clock?.suspicious ?? false;
  const bazaarActive =
    bazaar?.state === "active" &&
    !clockSuspicious &&
    bazaar.offlineAccessUntil !== null &&
    effectiveTime < bazaar.offlineAccessUntil;
  const developerActive =
    developer !== null && effectiveTime < developer.validUntil;
  const trialRemainingDays = Math.max(
    0,
    SUBSCRIPTION_POLICY.trialDays - trial.consumedDayKeys.length,
  );
  const trialDayActive = trial.consumedDayKeys.includes(
    studyDayKey(new Date(effectiveTime)),
  );
  const source = bazaarActive
    ? "bazaar"
    : developerActive
      ? "developer"
      : trialRemainingDays > 0 || trialDayActive
        ? "trial"
        : "locked";
  return {
    evaluatedAt: effectiveTime,
    hasPremiumAccess: source !== "locked",
    source,
    bazaarStatus: bazaarActive
      ? "cached_active"
      : bazaar?.state === "inactive"
        ? "inactive"
        : bazaar?.state === "active"
          ? "needs_verification"
          : "unknown",
    bazaarProductIds: bazaarActive
      ? [...new Set(bazaar.purchases.map((purchase) => purchase.productId))]
      : [],
    trialRemainingDays,
    trialDayActive,
    lastSuccessfulQueryAt: bazaar?.lastSuccessfulQueryAt ?? null,
    lastVerifiedActiveAt: bazaar?.lastVerifiedActiveAt ?? null,
    offlineAccessUntil: bazaar?.offlineAccessUntil ?? null,
    developerUntil: developer?.validUntil ?? null,
    clockSuspicious,
  };
}

/** Called only in the transaction that successfully records a non-SKIP answer. */
export function consumeTrialDay(
  records: EntitlementRecords,
  now: Date,
): TrialState {
  const entitlement = evaluateEntitlement(records, now);
  if (!entitlement.hasPremiumAccess) throw new PremiumAccessError();
  if (entitlement.source !== "trial" || entitlement.trialDayActive)
    return records.trial;
  const effective = Math.max(now.getTime(), records.clock?.effectiveTime ?? 0);
  return {
    version: 1,
    consumedDayKeys: [
      ...records.trial.consumedDayKeys,
      studyDayKey(new Date(effective)),
    ],
  };
}

export class PremiumAccessError extends Error {
  constructor() {
    super("برای ادامه، وضعیت اشتراک را بررسی کنید یا اشتراک تهیه کنید.");
    this.name = "PremiumAccessError";
  }
}
