import type { SQLiteDBConnection } from "@capacitor-community/sqlite";
import { z } from "zod";
import { withTransaction } from "./db";
import {
  advanceClock,
  confirmedBazaarCache,
  evaluateEntitlement,
  type ClockSample,
  type DeveloperGrant,
  type EntitlementRecords,
  type VerifiedPurchase,
} from "../lib/entitlement";

const KEYS = {
  trial: "trial_v1",
  bazaar: "bazaar_subscription_v1",
  developer: "developer_grant_v1",
  clock: "entitlement_clock_v1",
} as const;
const timestamp = z.number().finite().nonnegative();
const purchaseSchema = z.object({
  productId: z.string().min(1),
  packageName: z.literal("ir.vocabflow.app"),
  purchaseToken: z.string().min(1),
  orderId: z.string(),
  purchaseTime: timestamp,
  originalJson: z.string().min(1),
  dataSignature: z.string().min(1),
});
const trialSchema = z.object({
  version: z.literal(1),
  consumedDayKeys: z
    .array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .max(6)
    .refine((days) => new Set(days).size === days.length),
});
const bazaarSchema = z.object({
  version: z.literal(1),
  state: z.enum(["active", "inactive"]),
  lastSuccessfulQueryAt: timestamp,
  lastVerifiedActiveAt: timestamp.nullable(),
  offlineAccessUntil: timestamp.nullable(),
  purchases: z.array(purchaseSchema),
});
const developerSchema = z.object({
  version: z.literal(1),
  activatedAt: timestamp,
  validUntil: timestamp,
  lastCodeDay: z.string().regex(/^\d{8}$/),
});
const clockSchema = z.object({
  wallTime: timestamp,
  elapsedRealtime: timestamp,
  bootId: z.string().nullable(),
  effectiveTime: timestamp,
  suspicious: z.boolean(),
});

export function notifyEntitlementChanged(): void {
  window.dispatchEvent(new Event("vocabflow:entitlement-changed"));
}

export async function writeEntitlementMeta(
  tx: SQLiteDBConnection,
  key: keyof typeof KEYS,
  value: unknown,
): Promise<void> {
  await tx.run(
    "INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
    [KEYS[key], JSON.stringify(value)],
    false,
  );
}

/** No legacy study/streak totals: existing installs start with six full days. */
export async function readEntitlementRecords(
  tx: SQLiteDBConnection,
): Promise<EntitlementRecords> {
  const result = await tx.query(
    "SELECT key, value FROM meta WHERE key IN (?, ?, ?, ?)",
    Object.values(KEYS),
  );
  const rows = (result.values ?? []) as { key: string; value: string }[];
  const raw = new Map(rows.map((row) => [row.key, row.value]));
  const read = <T>(key: keyof typeof KEYS, schema: z.ZodType<T>): T | null => {
    const value = raw.get(KEYS[key]);
    if (value === undefined) return null;
    try {
      return schema.parse(JSON.parse(value));
    } catch {
      // Corruption must not silently grant another six trial days.
      throw new Error(
        "اطلاعات دسترسی قابل خواندن نیست؛ برنامه را دوباره باز کنید.",
      );
    }
  };
  let trial = read("trial", trialSchema);
  if (trial === null) {
    trial = { version: 1, consumedDayKeys: [] };
    await writeEntitlementMeta(tx, "trial", trial);
  }
  return {
    trial,
    bazaar: read("bazaar", bazaarSchema),
    developer: read("developer", developerSchema),
    clock: read("clock", clockSchema),
  };
}

export async function getEntitlementSnapshot(sample: ClockSample) {
  return withTransaction(async (tx) => {
    const records = await readEntitlementRecords(tx);
    records.clock = advanceClock(records.clock, sample);
    await writeEntitlementMeta(tx, "clock", records.clock);
    return evaluateEntitlement(records, new Date(sample.wallTime));
  });
}

export async function saveVerifiedSubscriptions(
  purchases: VerifiedPurchase[],
  sample: ClockSample,
): Promise<void> {
  const parsed = purchaseSchema.array().parse(purchases);
  await withTransaction(async (tx) => {
    const records = await readEntitlementRecords(tx);
    await writeEntitlementMeta(
      tx,
      "bazaar",
      confirmedBazaarCache(records.bazaar, parsed, sample.wallTime),
    );
    await writeEntitlementMeta(
      tx,
      "clock",
      advanceClock(records.clock, sample, true),
    );
  });
  notifyEntitlementChanged();
}

export async function saveDeveloperGrant(grant: DeveloperGrant): Promise<void> {
  const parsed = developerSchema.parse(grant);
  await withTransaction(async (tx) => {
    const records = await readEntitlementRecords(tx);
    if (records.developer?.lastCodeDay === parsed.lastCodeDay) {
      throw new Error("کد امروز قبلاً استفاده شده است.");
    }
    await writeEntitlementMeta(tx, "developer", parsed);
  });
  notifyEntitlementChanged();
}
