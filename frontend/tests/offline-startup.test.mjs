// Real SQLite wrapper, schema and seed; the native plugin and asset decryption are fixtures.
// Run from frontend/: node --test tests/offline-startup.test.mjs
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { webcrypto } from "node:crypto";
import { resolve } from "node:path";
import { build } from "esbuild";
import initSqlJs from "sql.js";

globalThis.crypto ??= webcrypto;
const originalFetch = globalThis.fetch;
const SQL = await initSqlJs();
const databases = [];
after(() => {
  globalThis.fetch = originalFetch;
  for (const database of databases) database.close();
});
const bundled = await build({
  stdin: {
    contents: `export * from './src/offline/db';
      export { prepareNative } from './src/offline/bootstrap';`,
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
  define: { "import.meta.env": "{}" },
  plugins: [
    {
      name: "startup-native-boundary",
      setup(builder) {
        builder.onResolve({ filter: /^@capacitor-community\/sqlite$/ }, () => ({
          path: "sqlite",
          namespace: "fixture",
        }));
        builder.onResolve({ filter: /(?:^|\/)lib\/platform$/ }, () => ({
          path: "platform",
          namespace: "fixture",
        }));
        builder.onResolve({ filter: /(?:^|\/)seed-crypto$/ }, () => ({
          path: "crypto",
          namespace: "fixture",
        }));
        builder.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path }) => ({
          resolveDir: process.cwd(),
          contents:
            path === "sqlite"
              ? `export { SQLiteConnection } from ${JSON.stringify(resolve("node_modules/@capacitor-community/sqlite/dist/esm/definitions.js"))};
             export const CapacitorSQLite = globalThis.startupFixture.plugin;`
              : path === "platform"
                ? "export const isNative = () => globalThis.startupFixture.native;"
                : "export const decryptSeedJson = async data => JSON.parse(new TextDecoder().decode(data));",
        }));
      },
    },
  ],
});
let moduleId = 0;
async function fixture({ native = true, stale = false, fail = null } = {}) {
  const db = new SQL.Database();
  databases.push(db);
  const state = {
    native,
    connection: stale,
    open: stale,
    secret: true,
    fail,
    checks: 0,
    creates: 0,
    opens: 0,
    begins: 0,
    fetches: 0,
  };
  function maybeFail(stage) {
    if (state.fail === stage) {
      state.fail = null;
      throw new Error(`injected ${stage} failure`);
    }
  }
  state.plugin = {
    async checkConnectionsConsistency({ dbNames }) {
      state.checks++;
      maybeFail("consistency");
      if (!dbNames.length || !state.connection) {
        state.connection = state.open = false;
        return { result: false };
      }
      return { result: true };
    },
    async isSecretStored() {
      return { result: state.secret };
    },
    async setEncryptionSecret() {
      state.secret = true;
    },
    async isDatabase() {
      return { result: false };
    },
    async createConnection() {
      if (state.connection)
        throw new Error("Connection vocabflow already exists");
      state.creates++;
      state.connection = true;
    },
    async isDBOpen() {
      return { result: state.open };
    },
    async open() {
      state.opens++;
      maybeFail("open");
      state.open = true;
    },
    async execute({ statements }) {
      maybeFail("schema");
      db.run(statements);
      return {};
    },
    async query({ statement, values = [] }) {
      maybeFail("migration");
      const stmt = db.prepare(statement);
      try {
        stmt.bind(values);
        const rows = [];
        while (stmt.step()) rows.push(stmt.getAsObject());
        return { values: rows };
      } finally {
        stmt.free();
      }
    },
    async run({ statement, values = [] }) {
      db.run(statement, values);
      return {};
    },
    async beginTransaction() {
      state.begins++;
      db.run("BEGIN");
    },
    async commitTransaction() {
      db.run("COMMIT");
    },
    async rollbackTransaction() {
      db.run("ROLLBACK");
    },
  };
  globalThis.startupFixture = state;
  globalThis.fetch = async (url) => {
    state.fetches++;
    // Let overlapping callers reach initialization before the asset resolves.
    await new Promise((resolve) => setTimeout(resolve, 1));
    if (url.endsWith("manifest.json"))
      return { json: async () => ["fixture-book"] };
    maybeFail("asset");
    const book = {
      bookSlug: "fixture-book",
      volumeNumber: 1,
      lessons: [
        {
          lessonNumber: 1,
          words: [{ eng: "ready", meanings: [{ per: "آماده", examples: [] }] }],
        },
      ],
    };
    return {
      arrayBuffer: async () =>
        new TextEncoder().encode(JSON.stringify(book)).buffer,
    };
  };
  const api = await import(
    `data:text/javascript;base64,${Buffer.from(`${bundled.outputFiles[0].text}\n// ${moduleId++}\n//# sourceURL=vocabflow-startup-fixture.js`).toString("base64")}`
  );
  return { api, db, state };
}

for (const stage of ["consistency", "open", "schema", "migration"]) {
  test(`a failed ${stage} attempt is shared and can be retried in the same app`, async () => {
    const { api, state } = await fixture({ fail: stage });
    const attempts = await Promise.allSettled([
      api.getDb(),
      api.getDb(),
      api.query("SELECT 1"),
    ]);
    assert.ok(attempts.every((result) => result.status === "rejected"));
    assert.equal(attempts[0].reason, attempts[1].reason);
    assert.equal(attempts[0].reason, attempts[2].reason);
    assert.match(attempts[0].reason.message, new RegExp(stage));
    assert.deepEqual(await api.query("SELECT 1 AS ready"), [{ ready: 1 }]);
    assert.equal(state.creates, 1);
  });
}

test("a recreated WebView reconciles a connection left in the native plugin", async () => {
  const { api, state } = await fixture({ stale: true });
  await api.getDb();
  assert.equal(state.checks, 1);
  assert.equal(state.creates, 1);
  assert.deepEqual(await api.query("SELECT COUNT(*) AS count FROM words"), [
    { count: 0 },
  ]);
});

test("overlapping startup callers share one seed and both receive progress", async () => {
  const { api, state } = await fixture();
  const first = [],
    second = [];
  const results = await Promise.allSettled([
    api.prepareNative((progress, label) => first.push({ progress, label })),
    api.prepareNative((progress, label) => second.push({ progress, label })),
  ]);
  assert.ok(
    results.every((result) => result.status === "fulfilled"),
    results.map((result) => result.reason).join("\n"),
  );
  assert.equal(state.begins, 1);
  assert.equal(state.fetches, 2);
  assert.equal(first.at(-1).progress, 1);
  assert.deepEqual(second, first);
  assert.deepEqual(await api.query("SELECT eng FROM words"), [
    { eng: "ready" },
  ]);
});

test("a failed seed rolls back and the next startup attempt succeeds", async () => {
  const { api, state } = await fixture({ fail: "asset" });
  await assert.rejects(api.prepareNative(), /injected asset failure/);
  assert.equal(await api.getMeta("seed_version"), null);
  assert.deepEqual(await api.query("SELECT COUNT(*) AS count FROM words"), [
    { count: 0 },
  ]);
  await api.prepareNative();
  assert.equal(state.begins, 2);
  assert.equal(await api.getMeta("seed_version"), "5");
  assert.deepEqual(await api.query("SELECT eng FROM words"), [
    { eng: "ready" },
  ]);
});

test("an existing install keeps its progress and skips seed assets", async () => {
  const { api, state } = await fixture();
  await api.setMeta("seed_version", "5");
  await api.run(
    "INSERT INTO progress (word_id,review_mode,status,manual_status,review_count) VALUES ('kept','EN_TO_FA','KNOWN','NOT_KNOWN',7)",
  );
  await api.prepareNative();
  assert.equal(state.fetches, 0);
  assert.deepEqual(
    await api.query(
      "SELECT word_id, status, manual_status, review_count FROM progress",
    ),
    [
      {
        word_id: "kept",
        status: "KNOWN",
        manual_status: "NOT_KNOWN",
        review_count: 7,
      },
    ],
  );
});

test("web startup never opens SQLite or fetches seed assets", async () => {
  const { api, state } = await fixture({ native: false });
  await api.prepareNative();
  assert.equal(state.creates, 0);
  assert.equal(state.fetches, 0);
});
