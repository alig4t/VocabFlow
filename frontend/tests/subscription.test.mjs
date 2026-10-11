// Real application modules + SQLite (sql.js), with only the Capacitor boundary replaced.
// Run from frontend/: node --test tests/subscription.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { build } from "esbuild";
import initSqlJs from "sql.js";

process.env.TZ = "Asia/Tehran";
globalThis.crypto ??= webcrypto;
globalThis.window = new EventTarget();
const SQL = await initSqlJs();
const bundled = await build({
  stdin: {
    contents: `export * from './src/lib/entitlement';
      export * from './src/offline/entitlement.repo';
      export * from './src/offline/db';
      export { answerStudy, updateWordStatus, resetProgress } from './src/offline/repo';
      export { subscriptionService } from './src/services/subscription.service';`,
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  plugins: [
    {
      name: "capacitor-test-boundary",
      setup(builder) {
        builder.onResolve({ filter: /^@capacitor-community\/sqlite$/ }, () => ({
          path: "sqlite",
          namespace: "test",
        }));
        builder.onResolve({ filter: /^@capacitor\/core$/ }, () => ({
          path: "core",
          namespace: "test",
        }));
        builder.onLoad({ filter: /.*/, namespace: "test" }, ({ path }) => ({
          contents:
            path === "core"
              ? `export const Capacitor = { isNativePlatform: () => globalThis.__vfNative };
         export const registerPlugin = () => globalThis.__vfBilling;`
              : `export const CapacitorSQLite = {};
         export class SQLiteConnection {
           async isConnection() { return {result:true}; }
           async retrieveConnection() { return globalThis.__vfDatabase; }
         }`,
          loader: "js",
        }));
      },
    },
  ],
});
const compiled = bundled.outputFiles[0].text;
let moduleNumber = 0;
const day = (dayNumber, hour = 12, minute = 0) =>
  new Date(2026, 9, dayNumber, hour, minute);
const purchase = {
  productId: "test.monthly",
  packageName: "ir.vocabflow.app",
  purchaseToken: "receipt-token",
  orderId: "order",
  purchaseTime: day(1).getTime(),
  originalJson: "signed-json",
  dataSignature: "signature",
};
const exhaustedDays = [1, 2, 3, 4, 5, 6].map((value) => `2026-10-0${value}`);
const records = () => ({
  trial: { version: 1, consumedDayKeys: [] },
  bazaar: null,
  developer: null,
  clock: null,
});

class SQLiteAdapter {
  db;
  constructor(contents) {
    this.db = new SQL.Database(contents);
  }
  active = false;
  failOn = null;
  async isDBOpen() {
    return { result: true };
  }
  async execute(sql) {
    this.db.run(sql);
    return {};
  }
  async query(sql, values = []) {
    const statement = this.db.prepare(sql);
    try {
      statement.bind(values);
      const rows = [];
      while (statement.step()) rows.push(statement.getAsObject());
      return { values: rows };
    } finally {
      statement.free();
    }
  }
  async run(sql, values = [], transaction = true) {
    if (this.active && transaction)
      throw new Error("nested transaction requested");
    if (this.failOn && sql.includes(this.failOn))
      throw new Error("injected storage failure");
    this.db.run(sql, values);
    return { changes: { changes: this.db.getRowsModified() } };
  }
  async beginTransaction() {
    this.db.run("BEGIN");
    this.active = true;
  }
  async commitTransaction() {
    this.db.run("COMMIT");
    this.active = false;
  }
  async rollbackTransaction() {
    this.db.run("ROLLBACK");
    this.active = false;
  }
  async isTransactionActive() {
    return { result: this.active };
  }
}

async function app(contents) {
  globalThis.__vfNative = true;
  const database = new SQLiteAdapter(contents);
  globalThis.__vfDatabase = database;
  const sample = {
    wallTime: day(11).getTime(),
    elapsedRealtime: 100_000,
    bootId: "1",
  };
  const billing = {
    getEnvironment: async () => ({
      ...sample,
      online: true,
      bazaarInstalled: true,
    }),
    getSubscribedProducts: async () => ({
      purchases: [purchase],
      clock: { ...sample },
    }),
    getConfiguration: async () => ({
      configured: true,
      products: [{ plan: "monthly", sku: "test.monthly" }],
    }),
    subscribe: async () => {},
  };
  globalThis.__vfBilling = billing;
  const api = await import(
    `data:text/javascript;base64,${Buffer.from(`// isolated module ${moduleNumber++}\n${compiled}`).toString("base64")}`
  );
  await api.getDb();
  return { api, database, billing, sample };
}

test("168-hour window has an exact boundary and uses confirmation, not purchase time", async () => {
  const { api } = await app();
  const state = records();
  state.trial.consumedDayKeys = exhaustedDays;
  state.bazaar = api.confirmedBazaarCache(null, [purchase], day(11).getTime());
  assert.equal(state.bazaar.offlineAccessUntil, day(18).getTime());
  assert.equal(
    api.evaluateEntitlement(state, new Date(day(18).getTime() - 1)).source,
    "bazaar",
  );
  const ended = api.evaluateEntitlement(state, day(18));
  assert.equal(ended.hasPremiumAccess, false);
  assert.equal(ended.bazaarStatus, "needs_verification");
});

test("trial gives six independent study days and retains the sixth day through 05:59", async () => {
  const { api } = await app();
  const state = records();
  for (let value = 1; value <= 6; value++)
    state.trial = api.consumeTrialDay(state, day(value));
  assert.equal(state.trial.consumedDayKeys.length, 6);
  assert.equal(
    api.evaluateEntitlement(state, day(7, 5, 59)).hasPremiumAccess,
    true,
  );
  assert.equal(
    api.evaluateEntitlement(state, day(7, 6)).hasPremiumAccess,
    false,
  );
  assert.throws(() => api.consumeTrialDay(state, day(7, 6)), /برای ادامه/);
});

test("paid cache/developer access freezes trial, then remaining trial resumes", async () => {
  const { api } = await app();
  const state = records();
  state.trial = api.consumeTrialDay(state, day(1));
  const originalTrial = state.trial;
  state.bazaar = api.confirmedBazaarCache(null, [purchase], day(2).getTime());
  assert.equal(api.consumeTrialDay(state, day(3)), originalTrial);
  state.trial = api.consumeTrialDay(state, day(10));
  assert.equal(state.trial.consumedDayKeys.length, 2);
  state.developer = {
    version: 1,
    activatedAt: day(10).getTime(),
    validUntil: day(25).getTime(),
    lastCodeDay: "20261010",
  };
  assert.equal(api.consumeTrialDay(state, day(11)), state.trial);
});

test("successful empty inventory revokes cache immediately without resetting trial or developer", async () => {
  const { api } = await app();
  const state = records();
  state.trial.consumedDayKeys = ["2026-10-01"];
  state.bazaar = api.confirmedBazaarCache(null, [purchase], day(11).getTime());
  state.bazaar = api.confirmedBazaarCache(state.bazaar, [], day(12).getTime());
  const result = api.evaluateEntitlement(state, day(12));
  assert.equal(result.source, "trial");
  assert.equal(result.bazaarStatus, "inactive");
  assert.equal(result.trialRemainingDays, 5);
  assert.equal(state.bazaar.offlineAccessUntil, null);
});

test("clock rollback stays suspicious across a reboot until a fresh market verification", async () => {
  const { api } = await app();
  const previous = api.advanceClock(null, {
    wallTime: day(11).getTime(),
    elapsedRealtime: 1_000,
    bootId: "1",
  });
  const rollback = api.advanceClock(previous, {
    wallTime: day(10).getTime(),
    elapsedRealtime: 60_000,
    bootId: "1",
  });
  assert.equal(rollback.suspicious, true);
  assert.equal(rollback.effectiveTime, previous.effectiveTime + 59_000);
  const reboot = api.advanceClock(rollback, {
    wallTime: day(11).getTime(),
    elapsedRealtime: 100,
    bootId: "2",
  });
  assert.equal(reboot.suspicious, true);
  assert.equal(
    api.advanceClock(
      reboot,
      { wallTime: day(11).getTime(), elapsedRealtime: 100, bootId: "2" },
      true,
    ).suspicious,
    false,
  );
});

test("storage failure rolls back progress, event and trial as one SQLite transaction", async () => {
  const { api, database, sample } = await app();
  await api.getEntitlementSnapshot(sample);
  database.failOn = "INSERT INTO review_events";
  await assert.rejects(
    api.answerStudy("word-1", "AGAIN"),
    /injected storage failure/,
  );
  assert.equal(
    (await database.query("SELECT * FROM progress")).values.length,
    0,
  );
  assert.equal(
    (await database.query("SELECT * FROM review_events")).values.length,
    0,
  );
  assert.equal(
    JSON.parse(await api.getMeta("trial_v1")).consumedDayKeys.length,
    0,
  );
});

test("concurrent answers consume one day; both directions and manual review share the trial", async () => {
  const { api } = await app();
  await Promise.all([
    api.answerStudy("word-1", "AGAIN"),
    api.answerStudy("word-2", "HARD"),
  ]);
  await api.updateWordStatus("word-3", "FA_TO_EN", "LEARNED");
  assert.equal(
    JSON.parse(await api.getMeta("trial_v1")).consumedDayKeys.length,
    1,
  );
  await api.resetProgress();
  assert.equal(
    JSON.parse(await api.getMeta("trial_v1")).consumedDayKeys.length,
    1,
  );
});

test("SKIP records no event and consumes no trial; legacy history starts with six days", async () => {
  const { api, database, sample } = await app();
  await database.run(
    "INSERT INTO study_sessions (id, started_at) VALUES (?, ?)",
    ["legacy", day(1).toISOString()],
  );
  assert.equal(
    (await api.getEntitlementSnapshot(sample)).trialRemainingDays,
    6,
  );
  await api.answerStudy("word", "SKIP");
  assert.equal(
    JSON.parse(await api.getMeta("trial_v1")).consumedDayKeys.length,
    0,
  );
  assert.equal(
    (await database.query("SELECT * FROM review_events")).values.length,
    0,
  );
});

test("concurrent market refreshes share one request; failures leave confirmation/deadline intact", async () => {
  const { api, billing, sample } = await app();
  let calls = 0;
  billing.getSubscribedProducts = async () => {
    calls++;
    return { purchases: [purchase], clock: { ...sample } };
  };
  const first = api.subscriptionService.refresh();
  const second = api.subscriptionService.refresh();
  assert.equal(first, second);
  await Promise.all([first, second]);
  assert.equal(calls, 1);
  const original = await api.getMeta("bazaar_subscription_v1");
  sample.wallTime += 24 * 60 * 60 * 1000;
  billing.getSubscribedProducts = async () => {
    throw new Error("billing unavailable");
  };
  await assert.rejects(
    api.subscriptionService.refresh(),
    /billing unavailable/,
  );
  assert.equal(await api.getMeta("bazaar_subscription_v1"), original);
});

test("purchase callback alone does not extend cache if its verification fails", async () => {
  const { api, billing, sample } = await app();
  await api.subscriptionService.refresh();
  const original = await api.getMeta("bazaar_subscription_v1");
  sample.wallTime += 60_000;
  billing.getSubscribedProducts = async () => {
    throw new Error("query failed");
  };
  await assert.rejects(
    api.subscriptionService.purchase("monthly"),
    /query failed/,
  );
  assert.equal(await api.getMeta("bazaar_subscription_v1"), original);
});

test("developer grant is separate and today's code cannot extend it repeatedly", async () => {
  const { api } = await app();
  const grant = {
    version: 1,
    activatedAt: day(11).getTime(),
    validUntil: day(30).getTime(),
    lastCodeDay: "20261011",
  };
  await api.saveDeveloperGrant(grant);
  await assert.rejects(
    api.saveDeveloperGrant({ ...grant, validUntil: day(31).getTime() }),
    /قبلاً استفاده/,
  );
  assert.equal(
    JSON.parse(await api.getMeta("developer_grant_v1")).validUntil,
    grant.validUntil,
  );
});

test("a purchase performs a fresh query after an already-running refresh", async () => {
  const { api, billing, sample } = await app();
  let releaseOldQuery;
  let markQueryStarted;
  const queryStarted = new Promise((resolve) => {
    markQueryStarted = resolve;
  });
  let calls = 0;
  billing.getSubscribedProducts = () => {
    calls++;
    if (calls === 1) {
      markQueryStarted();
      return new Promise((resolve) => {
        releaseOldQuery = () =>
          resolve({ purchases: [], clock: { ...sample } });
      });
    }
    return Promise.resolve({ purchases: [purchase], clock: { ...sample } });
  };
  let markPurchased;
  const purchased = new Promise((resolve) => {
    markPurchased = resolve;
  });
  billing.subscribe = async () => {
    markPurchased();
  };
  const oldRefresh = api.subscriptionService.refresh();
  await queryStarted;
  const purchaseFlow = api.subscriptionService.purchase("monthly");
  await purchased;
  releaseOldQuery();
  await Promise.all([oldRefresh, purchaseFlow]);
  assert.equal(calls, 2);
  assert.equal(
    JSON.parse(await api.getMeta("bazaar_subscription_v1")).state,
    "active",
  );
});

test("an answer is blocked at the cache boundary and cannot persist progress or another trial day", async () => {
  const { api, database, billing, sample } = await app();
  const trial = {
    version: 1,
    consumedDayKeys: Array.from({ length: 6 }, (_, index) =>
      api.studyDayKey(new Date(Date.now() - (index + 1) * 86400000)),
    ),
  };
  await api.setMeta("trial_v1", JSON.stringify(trial));
  // Use the current device day: an offline answer must not derive access from
  // old study history or an exhausted trial's previously active sixth day.
  sample.wallTime = Date.now() - 168 * 60 * 60 * 1000;
  await api.subscriptionService.refresh();
  sample.wallTime += 168 * 60 * 60 * 1000;
  billing.getEnvironment = async () => ({ ...sample, online: false });
  await assert.rejects(api.subscriptionService.assertAccess(), /اشتراک/);
  await assert.rejects(api.answerStudy("word", "EASY"), /اشتراک/);
  assert.equal(
    (await database.query("SELECT * FROM progress")).values.length,
    0,
  );
  assert.equal(
    (await database.query("SELECT * FROM review_events")).values.length,
    0,
  );
  assert.equal(await api.getMeta("trial_v1"), JSON.stringify(trial));
});

test("corrupt trial metadata is rejected instead of granting a new trial", async () => {
  const { api, sample } = await app();
  await api.setMeta("trial_v1", "broken-json");
  await assert.rejects(api.getEntitlementSnapshot(sample), /اطلاعات دسترسی/);
  assert.equal(await api.getMeta("trial_v1"), "broken-json");
});

test("closing and reopening preserves the confirmation, deadline and consumed trial days", async () => {
  const first = await app();
  const trial = { version: 1, consumedDayKeys: exhaustedDays.slice(0, 4) };
  await first.api.setMeta("trial_v1", JSON.stringify(trial));
  await first.api.subscriptionService.refresh();
  await first.api.getEntitlementSnapshot(first.sample);
  const cache = await first.api.getMeta("bazaar_subscription_v1");
  const stored = first.database.db.export();
  first.database.db.close();
  const reopened = await app(stored);
  reopened.sample.wallTime += 86400000;
  reopened.sample.elapsedRealtime += 86400000;
  const access = await reopened.api.subscriptionService.getSnapshot();
  assert.equal(access.source, "bazaar");
  assert.equal(access.trialRemainingDays, 2);
  assert.equal(await reopened.api.getMeta("bazaar_subscription_v1"), cache);
  assert.equal(await reopened.api.getMeta("trial_v1"), JSON.stringify(trial));
});

test("restoring on a fresh install uses Bazaar inventory and retains the fresh trial", async () => {
  const { api, billing, sample } = await app();
  let queries = 0;
  billing.getSubscribedProducts = async () => {
    queries++;
    return {
      purchases: [purchase],
      clock: { ...sample },
    };
  };
  await api.subscriptionService.restore();
  const access = await api.subscriptionService.getSnapshot();
  assert.equal(queries, 1);
  assert.equal(access.source, "bazaar");
  assert.equal(access.trialRemainingDays, 6);
});

test("web access never touches the Android bridge or consumes native trial", async () => {
  const { api, billing } = await app();
  globalThis.__vfNative = false;
  billing.getEnvironment = async () => {
    throw new Error("must not call native");
  };
  assert.equal((await api.subscriptionService.getSnapshot()).source, "web");
  await api.subscriptionService.refresh();
  assert.equal(await api.getMeta("trial_v1"), null);
});
