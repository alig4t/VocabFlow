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
  description_per TEXT,
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
  manual_status TEXT NOT NULL DEFAULT 'NOT_READ',
  updated_at TEXT,
  repetitions INTEGER NOT NULL DEFAULT 0,
  interval_days INTEGER NOT NULL DEFAULT 0,
  ease_factor REAL NOT NULL DEFAULT 2.5,
  review_count INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  last_reviewed_at TEXT,
  next_review_at TEXT,
  introduced_at TEXT,
  PRIMARY KEY (word_id, review_mode)
);
CREATE INDEX IF NOT EXISTS idx_progress_status ON progress(status);
-- NOTE: idx_progress_due depends on the next_review_at column, which is added by
-- migrateSchema() for old installs — so it is created there, AFTER the ALTER TABLE,
-- not here. Creating it in this batch would fail on a pre-SM-2 progress table and
-- abort the whole schema execution.
CREATE TABLE IF NOT EXISTS watchlist (
  book_id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT
);
-- Per-volume learning plans (source of truth for the daily learning system).
CREATE TABLE IF NOT EXISTS learning_plans (
  id TEXT PRIMARY KEY NOT NULL,
  volume_id TEXT NOT NULL UNIQUE,
  daily_new_words INTEGER NOT NULL DEFAULT 10,
  daily_goal INTEGER NOT NULL DEFAULT 30,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT
);
-- One row per completed daily study session (streak / heatmap / accuracy).
CREATE TABLE IF NOT EXISTS study_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  started_at TEXT,
  ended_at TEXT,
  duration_sec INTEGER NOT NULL DEFAULT 0,
  reviewed_count INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  hard_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  new_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_started ON study_sessions(started_at);
-- Single-row (local user) settings.
CREATE TABLE IF NOT EXISTS user_settings (
  id TEXT PRIMARY KEY NOT NULL,
  study_direction TEXT NOT NULL DEFAULT 'EN_TO_FA',
  auto_play_audio INTEGER NOT NULL DEFAULT 1,
  show_phonetics INTEGER NOT NULL DEFAULT 1,
  show_examples INTEGER NOT NULL DEFAULT 1,
  card_order TEXT NOT NULL DEFAULT 'SEQUENTIAL',
  daily_reminder_enabled INTEGER NOT NULL DEFAULT 1,
  daily_reminder_time TEXT NOT NULL DEFAULT '20:00',
  notify_daily_study INTEGER NOT NULL DEFAULT 1,
  notify_overdue INTEGER NOT NULL DEFAULT 1,
  notify_streak INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT
);
`

// Columns added to the `progress` table after its first release. Existing
// installs created the table without them, so ADD COLUMN any that are missing
// (CREATE TABLE IF NOT EXISTS never alters an existing table).
const PROGRESS_ADDED_COLUMNS: { name: string; ddl: string }[] = [
  { name: 'manual_status', ddl: "manual_status TEXT NOT NULL DEFAULT 'NOT_READ'" },
  { name: 'repetitions', ddl: 'repetitions INTEGER NOT NULL DEFAULT 0' },
  { name: 'interval_days', ddl: 'interval_days INTEGER NOT NULL DEFAULT 0' },
  { name: 'ease_factor', ddl: 'ease_factor REAL NOT NULL DEFAULT 2.5' },
  { name: 'review_count', ddl: 'review_count INTEGER NOT NULL DEFAULT 0' },
  { name: 'correct_count', ddl: 'correct_count INTEGER NOT NULL DEFAULT 0' },
  { name: 'wrong_count', ddl: 'wrong_count INTEGER NOT NULL DEFAULT 0' },
  { name: 'last_reviewed_at', ddl: 'last_reviewed_at TEXT' },
  { name: 'next_review_at', ddl: 'next_review_at TEXT' },
  { name: 'introduced_at', ddl: 'introduced_at TEXT' },
]

// Columns added to `words` after its first release (definition gloss).
const WORDS_ADDED_COLUMNS: { name: string; ddl: string }[] = [
  { name: 'description_per', ddl: 'description_per TEXT' },
]

// Columns added to `user_settings` after its first release (notification prefs).
// Same rationale as PROGRESS_ADDED_COLUMNS: ADD COLUMN onto old installs.
const USER_SETTINGS_ADDED_COLUMNS: { name: string; ddl: string }[] = [
  { name: 'daily_reminder_enabled', ddl: 'daily_reminder_enabled INTEGER NOT NULL DEFAULT 1' },
  { name: 'daily_reminder_time', ddl: "daily_reminder_time TEXT NOT NULL DEFAULT '20:00'" },
  { name: 'notify_daily_study', ddl: 'notify_daily_study INTEGER NOT NULL DEFAULT 1' },
  { name: 'notify_overdue', ddl: 'notify_overdue INTEGER NOT NULL DEFAULT 1' },
  { name: 'notify_streak', ddl: 'notify_streak INTEGER NOT NULL DEFAULT 1' },
]

async function addMissingColumns(
  db: SQLiteDBConnection,
  table: string,
  columns: { name: string; ddl: string }[],
): Promise<Set<string>> {
  const cols = (await db.query(`PRAGMA table_info(${table})`)).values ?? []
  const existing = new Set((cols as { name: string }[]).map((c) => c.name))
  const added = new Set<string>()
  for (const col of columns) {
    if (!existing.has(col.name)) {
      await db.execute(`ALTER TABLE ${table} ADD COLUMN ${col.ddl};`)
      added.add(col.name)
    }
  }
  return added
}

async function migrateSchema(db: SQLiteDBConnection): Promise<void> {
  const addedProgress = await addMissingColumns(db, 'progress', PROGRESS_ADDED_COLUMNS)
  // Manual marks were previously stored in `status` (pre-SM-2); carry them over.
  if (addedProgress.has('manual_status')) {
    await db.execute('UPDATE progress SET manual_status = status;')
  }
  // Now that next_review_at is guaranteed to exist, create the due-review index.
  await db.execute(
    'CREATE INDEX IF NOT EXISTS idx_progress_due ON progress(review_mode, next_review_at);',
  )

  // Persian definition gloss for pre-description_per installs.
  await addMissingColumns(db, 'words', WORDS_ADDED_COLUMNS)

  // Notification-preference columns for pre-notifications installs.
  await addMissingColumns(db, 'user_settings', USER_SETTINGS_ADDED_COLUMNS)
}

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
    await migrateSchema(db)
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
