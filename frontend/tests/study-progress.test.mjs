// Actual offline queries/answers in SQLite and web metadata with a repository fixture.
// Native plugins and Prisma's runtime enums are replaced at the test boundary.
// Run from frontend/: node --test tests/study-progress.test.mjs
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { build } from "esbuild";
import initSqlJs from "sql.js";

process.env.TZ = "Asia/Tehran";
globalThis.crypto ??= webcrypto;
globalThis.window = new EventTarget();
const RealDate = Date;
let clock = new RealDate(2026, 9, 13, 12).getTime();
globalThis.Date = class extends RealDate {
  constructor(...args) {
    super(...(args.length ? args : [clock]));
  }
  static now() {
    return clock;
  }
};
const SQL = await initSqlJs();
const databases = [];
after(() => {
  globalThis.Date = RealDate;
  for (const database of databases) database.close();
});

const bundled = await build({
  stdin: {
    contents: `export { getDb } from './src/offline/db';
      export { getStudyToday, answerStudy } from './src/offline/repo';
      export { StudyService } from '../backend/src/modules/study/study.service';`,
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  plugins: [
    {
      name: "native-and-prisma-boundaries",
      setup(builder) {
        builder.onResolve({ filter: /^@capacitor-community\/sqlite$/ }, () => ({
          path: "sqlite",
          namespace: "test",
        }));
        builder.onResolve({ filter: /^@capacitor\/core$/ }, () => ({
          path: "core",
          namespace: "test",
        }));
        builder.onResolve({ filter: /^@prisma\/client$/ }, () => ({
          path: "enums",
          namespace: "test",
        }));
        builder.onLoad({ filter: /.*/, namespace: "test" }, ({ path }) => ({
          contents:
            path === "sqlite"
              ? `export const CapacitorSQLite = {};
             export class SQLiteConnection {
               async isConnection() { return { result: true }; }
               async retrieveConnection() { return globalThis.__vfStudyDatabase; }
             }`
              : path === "core"
                ? `export const Capacitor = { isNativePlatform: () => true };
               export const registerPlugin = () => ({});`
                : `export const ReviewMode = { EN_TO_FA: 'EN_TO_FA', FA_TO_EN: 'FA_TO_EN' };
               export const CardOrder = { SEQUENTIAL: 'SEQUENTIAL', RANDOM: 'RANDOM' };
               export const ReviewAnswer = { EASY: 'EASY', HARD: 'HARD', AGAIN: 'AGAIN' };
               export const WordStatus = { KNOWN: 'KNOWN', NOT_KNOWN: 'NOT_KNOWN', NOT_READ: 'NOT_READ' };`,
          loader: "js",
        }));
      },
    },
  ],
});
let moduleNumber = 0;

async function fixture() {
  clock = new RealDate(2026, 9, 13, 12).getTime();
  const database = new SQL.Database();
  databases.push(database);
  let active = false;
  const query = async (sql, values = []) => {
    const statement = database.prepare(sql);
    try {
      statement.bind(values);
      const rows = [];
      while (statement.step()) rows.push(statement.getAsObject());
      return { values: rows };
    } finally {
      statement.free();
    }
  };
  globalThis.__vfStudyDatabase = {
    isDBOpen: async () => ({ result: true }),
    execute: async (sql) => {
      database.run(sql);
      return {};
    },
    query,
    run: async (sql, values = []) => {
      database.run(sql, values);
      return {};
    },
    beginTransaction: async () => {
      database.run("BEGIN");
      active = true;
    },
    commitTransaction: async () => {
      database.run("COMMIT");
      active = false;
    },
    rollbackTransaction: async () => {
      database.run("ROLLBACK");
      active = false;
    },
    isTransactionActive: async () => ({ result: active }),
  };
  const api = await import(
    `data:text/javascript;base64,${Buffer.from(`// fixture ${moduleNumber++}\n${bundled.outputFiles[0].text}`).toString("base64")}`
  );
  await api.getDb();
  database.run(`INSERT INTO books (id,title) VALUES ('book','Test');
    INSERT INTO volumes (id,book_id,volume_number) VALUES ('volume','book',1),('inactive','book',2);
    INSERT INTO lessons (id,volume_id,lesson_number) VALUES ('lesson','volume',1),('inactive-lesson','inactive',1);
    INSERT INTO learning_plans (id,volume_id,daily_new_words,daily_goal,is_active) VALUES ('plan','volume',10,30,1),('inactive-plan','inactive',10,30,0);
    INSERT INTO user_settings (id,study_direction) VALUES ('local','EN_TO_FA');`);
  for (let i = 1; i <= 14; i++) {
    database.run(
      "INSERT INTO words (id,eng,per,lesson_id) VALUES (?,?,?,'lesson')",
      [`word-${i}`, `word ${i}`, "meaning"],
    );
    database.run(
      `INSERT INTO progress (word_id,review_mode,introduced_at,next_review_at)
      VALUES (?,'EN_TO_FA',?,?)`,
      [
        `word-${i}`,
        new RealDate(2026, 9, 10, 12).toISOString(),
        new RealDate(2026, 9, 12, 6).toISOString(),
      ],
    );
  }
  return { api, database, query };
}

test("leaving after two answers reports 2 of 14 without finishing a session", async () => {
  const { api, query } = await fixture();
  assert.equal((await api.getStudyToday()).meta.dueCount, 14);
  await api.answerStudy("word-1", "EASY");
  await api.answerStudy("word-2", "HARD");
  const { meta } = await api.getStudyToday();
  assert.equal(meta.dueCount, 12);
  assert.equal(meta.reviewedToday, 2);
  assert.equal(meta.dueCount + meta.newCount + meta.reviewedToday, 14);
  assert.equal(
    (await query("SELECT COUNT(*) AS c FROM study_sessions")).values[0].c,
    0,
  );
  for (let i = 3; i <= 14; i++) await api.answerStudy(`word-${i}`, "EASY");
  const finished = (await api.getStudyToday()).meta;
  assert.equal(finished.dueCount + finished.newCount, 0);
  assert.equal(finished.reviewedToday, 14);
});

test("AGAIN and first read stay pending; repeated answers count once; SKIP adds nothing", async () => {
  const { api, database, query } = await fixture();
  database.run(
    "INSERT INTO words (id,eng,per,lesson_id) VALUES ('new','new','meaning','lesson')",
  );
  await api.answerStudy("word-1", "AGAIN");
  await api.answerStudy("new", "AGAIN");
  let meta = (await api.getStudyToday()).meta;
  assert.equal(meta.reviewedToday, 0);
  assert.equal(meta.dueCount, 15);
  assert.equal(meta.newCount, 0);
  await api.answerStudy("word-1", "EASY");
  await api.answerStudy("word-1", "HARD");
  await api.answerStudy("new", "EASY");
  await api.answerStudy("word-2", "SKIP");
  meta = (await api.getStudyToday()).meta;
  assert.equal(meta.reviewedToday, 2);
  assert.equal(meta.dueCount + meta.reviewedToday, 15);
  assert.equal(
    (
      await query(
        "SELECT COUNT(*) AS c FROM review_events WHERE word_id='word-2'",
      )
    ).values[0].c,
    0,
  );
});

test("counts respect direction, active plans, reset progress and the 06:00 boundary", async () => {
  const { api, database } = await fixture();
  await api.answerStudy("word-1", "EASY");
  database.run("UPDATE user_settings SET study_direction='FA_TO_EN'");
  assert.equal((await api.getStudyToday()).meta.reviewedToday, 0);
  await api.answerStudy("word-2", "HARD");
  assert.equal((await api.getStudyToday()).meta.reviewedToday, 1);
  database.run("UPDATE user_settings SET study_direction='EN_TO_FA'");
  database.run(
    "UPDATE words SET lesson_id='inactive-lesson' WHERE id='word-1'",
  );
  assert.equal((await api.getStudyToday()).meta.reviewedToday, 0);
  database.run("UPDATE words SET lesson_id='lesson' WHERE id='word-1'");
  database.run(
    "UPDATE progress SET introduced_at=NULL,next_review_at=NULL WHERE word_id='word-1' AND review_mode='EN_TO_FA'",
  );
  assert.equal((await api.getStudyToday()).meta.reviewedToday, 0);

  clock = new RealDate(2026, 9, 14, 5, 59).getTime();
  await api.answerStudy("word-3", "EASY");
  assert.equal((await api.getStudyToday()).meta.reviewedToday, 1);
  clock = new RealDate(2026, 9, 14, 6).getTime();
  assert.equal((await api.getStudyToday()).meta.reviewedToday, 0);
  await api.answerStudy("word-4", "EASY");
  assert.equal((await api.getStudyToday()).meta.reviewedToday, 1);
  database.run("UPDATE learning_plans SET is_active=0");
  assert.equal((await api.getStudyToday()).meta.reviewedToday, 0);
});

test("web today metadata uses live completed words, with the current direction and day", async () => {
  const { api } = await fixture();
  let countArguments;
  const service = new api.StudyService({
    getUserSettings: async () => ({
      studyDirection: "FA_TO_EN",
      cardOrder: "SEQUENTIAL",
    }),
    getActivePlans: async () => [
      {
        id: "plan",
        dailyNewWords: 10,
        dailyGoal: 30,
        volume: { id: "volume", title: "Volume", book: { title: "Book" } },
      },
    ],
    getDueWords: async () =>
      Array.from({ length: 12 }, (_, i) => ({ id: `word-${i}` })),
    countIntroducedToday: async () => 0,
    getNewWords: async () => [],
    getTodaySessionTotals: async () => {
      throw new Error("Unfinished sessions cannot supply live progress");
    },
    countCompletedTodayWords: async (...args) => {
      countArguments = args;
      return 2;
    },
  });
  const { meta } = await service.getToday("user", new Date());
  assert.equal(meta.reviewedToday, 2);
  assert.equal(meta.dueCount + meta.newCount + meta.reviewedToday, 14);
  assert.equal(countArguments[0], "user");
  assert.equal(countArguments[1], "FA_TO_EN");
  assert.deepEqual(countArguments[2], ["volume"]);
  assert.equal(
    countArguments[3].getTime(),
    new RealDate(2026, 9, 13, 6).getTime(),
  );
  assert.equal(
    countArguments[4].getTime(),
    new RealDate(2026, 9, 14, 6).getTime() - 1,
  );
});
