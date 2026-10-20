// Focused vocabulary regressions. Uses the same sql.js/esbuild fixtures as subscription.test.mjs.
// Run from frontend/: node --test tests/vocabulary.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import initSqlJs from "sql.js";

const SQL = await initSqlJs();
const bundled = await build({
  stdin: {
    contents: `export { getDb } from './src/offline/db';
      export { getStats, getWords } from './src/offline/repo';
      export * from './src/lib/vocabFilters';
      export { progressService } from './src/services/progress.service';`,
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  define: { "import.meta.env": "{}" },
  plugins: [
    {
      name: "vocabulary-boundaries",
      setup(builder) {
        builder.onResolve({ filter: /^@capacitor-community\/sqlite$/ }, () => ({
          path: "sqlite",
          namespace: "fixture",
        }));
        builder.onResolve({ filter: /^@capacitor\/core$/ }, () => ({
          path: "core",
          namespace: "fixture",
        }));
        builder.onResolve({ filter: /(?:^|\/)lib\/axios$/ }, () => ({
          path: "http",
          namespace: "fixture",
        }));
        builder.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path }) => ({
          contents:
            path === "sqlite"
              ? `export const CapacitorSQLite = {};
          export class SQLiteConnection {
            async checkConnectionsConsistency() { return {result:true}; }
            async isConnection() { return {result:true}; }
            async retrieveConnection() { return globalThis.__vocabDatabase; }
          }`
              : path === "http"
                ? `export default {get: (...args) => globalThis.__vocabHttp(...args)};`
                : `export const Capacitor = {isNativePlatform: () => globalThis.__vocabNative};
           export const registerPlugin = () => ({});`,
          loader: "js",
        }));
      },
    },
  ],
});
let moduleId = 0;
async function app() {
  const db = new SQL.Database();
  globalThis.__vocabNative = true;
  globalThis.__vocabDatabase = {
    isDBOpen: async () => ({ result: true }),
    execute: async (sql) => {
      db.run(sql);
      return {};
    },
    query: async (sql, params = []) => {
      const stmt = db.prepare(sql);
      try {
        stmt.bind(params);
        const values = [];
        while (stmt.step()) values.push(stmt.getAsObject());
        return { values };
      } finally {
        stmt.free();
      }
    },
    run: async (sql, params = []) => {
      db.run(sql, params);
      return {};
    },
  };
  const api = await import(
    `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text + `\n// ${moduleId++}`).toString("base64")}`
  );
  await api.getDb();
  db.run(`INSERT INTO books (id,title) VALUES ('b1','Oxford'),('b2','Essential');
    INSERT INTO volumes (id,book_id,volume_number) VALUES ('v1','b1',1),('v2','b1',2),('v3','b2',1);
    INSERT INTO lessons (id,volume_id,lesson_number) VALUES ('l1','v1',1),('l2','v1',2),('l3','v2',1),('l4','v3',1);
    INSERT INTO words (id,eng,per,lesson_id,chapter,unit) VALUES
      ('w1','achieve','رسیدن','l1',1,1), ('w2','accept','پذیرفتن','l1',1,1),
      ('w3','anxious','نگران','l2',2,2), ('w4','arrive','رسیدن','l3',1,1),
      ('w5','achieve','رسیدن','l4',1,1), ('w6','custom','شخصی',NULL,3,1);
    INSERT INTO progress (word_id,review_mode,status,manual_status) VALUES
      ('w1','EN_TO_FA','NOT_READ','KNOWN'), ('w3','EN_TO_FA','NOT_READ','NOT_KNOWN'),
      ('w3','FA_TO_EN','NOT_READ','KNOWN'), ('w4','EN_TO_FA','KNOWN','NOT_READ'),
      ('w5','EN_TO_FA','NOT_READ','KNOWN'), ('removed','EN_TO_FA','KNOWN','KNOWN');`);
  return { api, db };
}

test("counts untouched and daily-only words as unmarked, independently in both directions", async () => {
  const { api, db } = await app();
  const stats = await api.getStats();
  assert.deepEqual(
    await api.getStats({ status: "KNOWN", mode: "EN_TO_FA", bookIds: ["b1"] }),
    stats,
  );
  assert.deepEqual(stats.EN_TO_FA, {
    KNOWN: 2,
    NOT_KNOWN: 1,
    NOT_READ: 3,
    total: 6,
  });
  assert.deepEqual(stats.FA_TO_EN, {
    KNOWN: 1,
    NOT_KNOWN: 0,
    NOT_READ: 5,
    total: 6,
  });
  assert.deepEqual(await api.progressService.getStats(), stats);
  db.close();
});

test("book, volume, lesson, chapter and search counts match browsing in each direction", async () => {
  const { api, db } = await app();
  const scopes = [
    { bookId: "b1" },
    { bookId: "b1", volumeId: "v1" },
    { bookId: "b1", volumeId: "v1", lessonId: "l1" },
    { chapter: 2 },
    { bookId: "b1", search: "رسیدن" },
    { bookId: "b1", search: "ACH" },
    { bookId: "missing" },
  ];
  for (const scope of scopes) {
    const stats = await api.getStats(scope);
    for (const mode of ["EN_TO_FA", "FA_TO_EN"]) {
      const all = await api.getWords({ ...scope, mode, limit: 20 });
      assert.equal(stats[mode].total, all.meta.total);
      for (const status of ["KNOWN", "NOT_KNOWN", "NOT_READ"]) {
        const words = await api.getWords({ ...scope, mode, status, limit: 20 });
        assert.equal(
          stats[mode][status],
          words.meta.total,
          JSON.stringify({ scope, mode, status }),
        );
      }
    }
  }
  assert.deepEqual(
    (await api.getStats({ bookId: "b1", volumeId: "v1", lessonId: "l1" }))
      .EN_TO_FA,
    { KNOWN: 1, NOT_KNOWN: 0, NOT_READ: 1, total: 2 },
  );
  db.close();
});

test("web service normalizes the API array and forwards the selected content scope", async () => {
  const { api, db } = await app();
  const expected = await api.getStats({ bookId: "b1" });
  globalThis.__vocabNative = false;
  let request;
  globalThis.__vocabHttp = async (path, options) => {
    request = { path, options };
    return {
      data: Object.entries(expected).map(([reviewMode, counts]) => ({
        reviewMode,
        ...counts,
      })),
    };
  };
  assert.deepEqual(
    await api.progressService.getStats({ bookId: "b1" }),
    expected,
  );
  assert.deepEqual(request, {
    path: "/progress/stats",
    options: { params: { bookId: "b1" } },
  });
  db.close();
});

test("review transfer preserves all/known, search, order and unrestricted book scope", async () => {
  const { api, db } = await app();
  for (const status of ["ALL", "KNOWN", "NOT_KNOWN", "NOT_READ"]) {
    const filters = {
      ...api.DEFAULT_VOCAB_FILTERS,
      status,
      bookId: "outside-plans",
      volumeId: "v1",
      lessonId: "l1",
      search: "goal",
      sort: "eng",
      mode: "FA_TO_EN",
    };
    const params = api.serializeReviewParams(filters);
    assert.equal(params.get("source"), "vocabulary");
    assert.equal(params.get("status"), status);
    assert.deepEqual(api.parseVocabParams(params).filters, filters);
  }
  const chapterScope = {
    ...api.DEFAULT_VOCAB_FILTERS,
    bookId: "b1",
    chapter: 2,
    search: "goal",
  };
  assert.deepEqual(
    api.parseVocabParams(api.serializeReviewParams(chapterScope)).filters,
    chapterScope,
  );
  const normalized = api.parseVocabParams(
    new URLSearchParams("bookId=b1&chapter=2&lessonId=orphan&page=Infinity"),
  );
  assert.equal(normalized.filters.chapter, 2);
  assert.equal(normalized.filters.lessonId, undefined);
  assert.equal(normalized.page, 1);
  assert.equal(
    api.parseVocabParams(new URLSearchParams("chapter=2")).filters.chapter,
    undefined,
  );
  const withoutBook = { ...chapterScope, bookId: undefined };
  assert.equal(api.serializeVocabParams(withoutBook, 1).has("chapter"), false);
  assert.equal(api.toApiFilters(withoutBook, 1, 20).chapter, undefined);
  db.close();
});
