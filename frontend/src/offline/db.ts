import {
  CapacitorSQLite,
  SQLiteConnection,
  type SQLiteDBConnection,
} from '@capacitor-community/sqlite'

const DB_NAME = 'vocabflow'
const DB_VERSION = 1

const sqlite = new SQLiteConnection(CapacitorSQLite)
let dbPromise: Promise<SQLiteDBConnection> | null = null

// Schema mirrors the Prisma models, minus multi-user (single local user).
const SCHEMA = `
CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover_image TEXT
);
CREATE TABLE IF NOT EXISTS volumes (
  id TEXT PRIMARY KEY NOT NULL,
  book_id TEXT NOT NULL,
  volume_number INTEGER NOT NULL,
  title TEXT
);
CREATE INDEX IF NOT EXISTS idx_volumes_book ON volumes(book_id);
CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY NOT NULL,
  volume_id TEXT NOT NULL,
  lesson_number INTEGER NOT NULL,
  title TEXT
);
CREATE INDEX IF NOT EXISTS idx_lessons_volume ON lessons(volume_id);
CREATE TABLE IF NOT EXISTS words (
  id TEXT PRIMARY KEY NOT NULL,
  eng TEXT NOT NULL,
  per TEXT NOT NULL,
  description TEXT,
  pronunciation TEXT,
  part_of_speech TEXT,
  word_forms TEXT,
  synonyms TEXT,
  antonyms TEXT,
  primary_example TEXT,
  primary_example_trs TEXT,
  pronunciation_audio TEXT,
  chapter INTEGER,
  unit INTEGER,
  lesson_id TEXT,
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_words_lesson ON words(lesson_id);
CREATE INDEX IF NOT EXISTS idx_words_eng ON words(eng);
CREATE TABLE IF NOT EXISTS word_examples (
  id TEXT PRIMARY KEY NOT NULL,
  word_id TEXT NOT NULL,
  eng_sentence TEXT NOT NULL,
  per_translation TEXT,
  ord INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_examples_word ON word_examples(word_id);
CREATE TABLE IF NOT EXISTS word_phrases (
  id TEXT PRIMARY KEY NOT NULL,
  word_id TEXT NOT NULL,
  pattern_eng TEXT NOT NULL,
  pattern_per TEXT,
  ord INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_phrases_word ON word_phrases(word_id);
CREATE TABLE IF NOT EXISTS word_phrase_examples (
  id TEXT PRIMARY KEY NOT NULL,
  phrase_id TEXT NOT NULL,
  eng_sentence TEXT NOT NULL,
  per_translation TEXT,
  ord INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_phrase_examples_phrase ON word_phrase_examples(phrase_id);
CREATE TABLE IF NOT EXISTS progress (
  word_id TEXT NOT NULL,
  review_mode TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'NOT_READ',
  updated_at TEXT,
  PRIMARY KEY (word_id, review_mode)
);
CREATE INDEX IF NOT EXISTS idx_progress_status ON progress(status);
CREATE TABLE IF NOT EXISTS watchlist (
  book_id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT
);
`

/** Open (or reuse) the single app database connection and ensure the schema. */
export async function getDb(): Promise<SQLiteDBConnection> {
  if (dbPromise) return dbPromise
  dbPromise = (async () => {
    const isConn = (await sqlite.isConnection(DB_NAME, false)).result
    const db = isConn
      ? await sqlite.retrieveConnection(DB_NAME, false)
      : await sqlite.createConnection(DB_NAME, false, 'no-encryption', DB_VERSION, false)
    if (!(await db.isDBOpen()).result) {
      await db.open()
    }
    await db.execute(SCHEMA)
    return db
  })()
  return dbPromise
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  values: unknown[] = [],
): Promise<T[]> {
  const db = await getDb()
  const res = await db.query(sql, values as never[])
  return (res.values ?? []) as T[]
}

export async function run(sql: string, values: unknown[] = []): Promise<void> {
  const db = await getDb()
  await db.run(sql, values as never[])
}

export async function getMeta(key: string): Promise<string | null> {
  const rows = await query<{ value: string }>('SELECT value FROM meta WHERE key = ?', [key])
  return rows[0]?.value ?? null
}

export async function setMeta(key: string, value: string): Promise<void> {
  await run(
    'INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value],
  )
}

export function uid(): string {
  return crypto.randomUUID()
}

export { sqlite, DB_NAME }
