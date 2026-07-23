import { getDb, getMeta, setMeta, uid } from './db'
import { decryptSeedJson } from './seed-crypto'
import type { SQLiteDBConnection } from '@capacitor-community/sqlite'

// ── Book / volume title maps (mirrors backend import-all.ts) ──────────────────
const BOOK_TITLE_MAP: Record<string, string> = {
  '4000-essential-english-words': '4000 Essential English Words',
  'oxford-word-skills-basic': 'Oxford Word Skills',
  '1000-english-collocations-in-10-Minutes-a-Day': '1000 English Collocations in 10 Minutes a Day',
  'english-phrasal-verbs-in-use': 'English Phrasal Verbs in Use',
  'barron-essential-words-for-the-gre': "Barron's Essential Words for the GRE",
  'barron-s-essential-words-for-the-ielts': "Barron's Essential Words for the IELTS",
  'barron-s-essential-words-for-the-toefl': "Barron's Essential Words for the TOEFL",
  'street-talk-1': 'Street Talk 1',
  '504-absolutely-essential-words': '504 Absolutely Essential Words',
  'barron-1100-words-you-need-to-know': "Barron's 1100 Words You Need to Know",
  // NOTE: the collocations "advanced" slug carries a trailing dash in the JSON.
  'english-collocations-in-use-intermediate': 'English Collocations in Use',
  'english-collocations-in-use-advanced-': 'English Collocations in Use',
  'english-idioms-in-use-intermediate': 'English Idioms in Use',
  'english-idioms-in-use-advanced': 'English Idioms in Use',
  'idoms-and-phrasal-verbs-intermediate': 'Idioms and Phrasal Verbs',
  'idoms-and-phrasal-verbs-advanced': 'Idioms and Phrasal Verbs',
  'vocabulary-in-use-basic': 'Vocabulary in Use',
  'vocabulary-in-use-pre-intermediate-and-intermediate': 'Vocabulary in Use',
  'vocabulary-in-use-academic': 'Vocabulary in Use',
}
const VOLUME_TITLE_MAP: Record<string, Record<number, string>> = {
  'oxford-word-skills-basic': { 1: 'Basic', 2: 'Intermediate', 3: 'Advanced' },
  'english-collocations-in-use-intermediate': { 1: 'Intermediate' },
  'english-collocations-in-use-advanced-': { 2: 'Advanced' },
  'english-idioms-in-use-intermediate': { 1: 'Intermediate' },
  'english-idioms-in-use-advanced': { 2: 'Advanced' },
  'idoms-and-phrasal-verbs-intermediate': { 1: 'Intermediate' },
  'idoms-and-phrasal-verbs-advanced': { 2: 'Advanced' },
  'vocabulary-in-use-basic': { 1: 'Basic' },
  'vocabulary-in-use-pre-intermediate-and-intermediate': { 2: 'Pre-intermediate & Intermediate' },
  'vocabulary-in-use-academic': { 4: 'Academic' },
}

interface ScrapedExample { eng: string; per: string }
interface ScrapedPhrase { patternEng: string; patternPer?: string; examples: ScrapedExample[] }
interface ScrapedDescription { eng?: string; per?: string }
interface ScrapedMeaning {
  per: string
  description?: ScrapedDescription
  examples: ScrapedExample[]
  phrases?: ScrapedPhrase[]
  synonyms?: string[]
  antonyms?: string[]
}
interface ScrapedWord {
  eng: string
  pronunciation?: string
  partOfSpeech?: string
  meanings: ScrapedMeaning[]
  wordForms?: { label: string; forms: string }
}
interface OldFormat { volume: number; units: { unit: number; words: ScrapedWord[] }[] }
interface NewFormat {
  bookSlug: string
  volumeNumber: number
  lessons: { lessonNumber: number; title?: string; words: ScrapedWord[] }[]
}
type BookFile = OldFormat | NewFormat

function isOldFormat(d: BookFile): d is OldFormat {
  return 'units' in d
}
function slugFromFilename(filename: string): string {
  return filename.replace(/\.json$/, '').replace(/-v?\d+$/, '')
}
function titleFromSlug(slug: string): string {
  return BOOK_TITLE_MAP[slug] ?? slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Join per-meaning definition glosses into one column value (null when empty). */
function joinDescriptions(parts: Array<string | undefined>): string | null {
  const kept = parts.map((p) => p?.trim()).filter((p): p is string => !!p)
  return kept.length > 0 ? [...new Set(kept)].join(' / ') : null
}

const NOW = () => new Date().toISOString()

/** Chunked multi-row INSERT within an open transaction. */
async function bulkInsert(
  db: SQLiteDBConnection,
  table: string,
  cols: string[],
  rows: unknown[][],
): Promise<void> {
  if (rows.length === 0) return
  const CHUNK = 200
  const placeholder = `(${cols.map(() => '?').join(',')})`
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK)
    const sql = `INSERT INTO ${table} (${cols.join(',')}) VALUES ${slice.map(() => placeholder).join(',')}`
    const values = slice.flat()
    await db.run(sql, values as never[], false)
  }
}

interface Rows {
  books: unknown[][]
  volumes: unknown[][]
  lessons: unknown[][]
  words: unknown[][]
  examples: unknown[][]
  phrases: unknown[][]
  phraseExamples: unknown[][]
}

function collectFile(filename: string, data: BookFile, bookIdByTitle: Map<string, string>, rows: Rows) {
  let bookSlug: string
  let volumeNumber: number
  let lessons: { lessonNumber: number; title?: string; words: ScrapedWord[] }[]

  if (isOldFormat(data)) {
    bookSlug = slugFromFilename(filename)
    volumeNumber = data.volume
    lessons = data.units.map((u) => ({ lessonNumber: u.unit, title: `Unit ${u.unit}`, words: u.words }))
  } else {
    bookSlug = data.bookSlug
    volumeNumber = data.volumeNumber
    lessons = data.lessons
  }

  const bookTitle = titleFromSlug(bookSlug)
  let bookId = bookIdByTitle.get(bookTitle)
  if (!bookId) {
    bookId = uid()
    bookIdByTitle.set(bookTitle, bookId)
    rows.books.push([bookId, bookTitle, null, null])
  }

  const volumeId = uid()
  const volumeTitle = VOLUME_TITLE_MAP[bookSlug]?.[volumeNumber] ?? `Volume ${volumeNumber}`
  rows.volumes.push([volumeId, bookId, volumeNumber, volumeTitle])

  for (const les of lessons) {
    const lessonId = uid()
    rows.lessons.push([lessonId, volumeId, les.lessonNumber, les.title ?? null])

    for (const w of les.words) {
      const per = w.meanings.map((m) => m.per).filter(Boolean).join(' / ')
      const description = joinDescriptions(w.meanings.map((m) => m.description?.eng))
      const descriptionPer = joinDescriptions(w.meanings.map((m) => m.description?.per))
      const synonyms = [...new Set(w.meanings.flatMap((m) => m.synonyms ?? []))]
      const antonyms = [...new Set(w.meanings.flatMap((m) => m.antonyms ?? []))]
      const allExamples = w.meanings.flatMap((m) => m.examples ?? [])
      const allPhrases = w.meanings.flatMap((m) => m.phrases ?? [])
      const wordForms = w.wordForms ? `${w.wordForms.label}: ${w.wordForms.forms}` : null
      // Some entries have empty examples[] on every meaning but DO carry a phrase
      // pattern (patternEng/patternPer) — often itself with no examples either.
      // Fall back to the first phrase's pattern ONLY when there is truly no
      // example anywhere (mirrors backend/prisma/import-all.ts), so the word
      // doesn't render with zero examples in the app.
      const hasAnyExample = allExamples.length > 0 || allPhrases.some((p) => (p.examples?.length ?? 0) > 0)
      const fallbackPhrase = !hasAnyExample ? allPhrases[0] : undefined
      const firstEx = allExamples[0] ??
        (fallbackPhrase ? { eng: fallbackPhrase.patternEng, per: fallbackPhrase.patternPer ?? '' } : undefined)
      const wordId = uid()
      const now = NOW()

      rows.words.push([
        wordId,
        w.eng.trim(),
        per || w.eng,
        description,
        descriptionPer,
        w.pronunciation || null,
        w.partOfSpeech || null,
        wordForms,
        JSON.stringify(synonyms),
        JSON.stringify(antonyms),
        firstEx?.eng ?? null,
        firstEx?.per ?? null,
        null,
        volumeNumber,
        les.lessonNumber,
        lessonId,
        now,
        now,
      ])

      allExamples.slice(1).forEach((ex, i) => {
        rows.examples.push([uid(), wordId, ex.eng, ex.per ?? '', i])
      })

      allPhrases.forEach((p, pi) => {
        const phraseId = uid()
        rows.phrases.push([phraseId, wordId, p.patternEng, p.patternPer ?? '', pi])
        ;(p.examples ?? []).forEach((ex, ei) => {
          rows.phraseExamples.push([uid(), phraseId, ex.eng, ex.per ?? '', ei])
        })
      })
    }
  }
}

/**
 * One-time seed of the bundled book JSON into SQLite. Idempotent via meta flag.
 * `onProgress` reports 0..1 for a loading screen.
 */
// Bump this whenever the bundled book data changes so existing installs wipe
// their local data and re-seed with the corrected content.
const SEED_VERSION = '5'
const WIPE_TABLES = [
  'word_phrase_examples', 'word_phrases', 'word_examples', 'words',
  'lessons', 'volumes', 'books', 'progress', 'watchlist',
]

export async function seedIfNeeded(onProgress?: (p: number, label: string) => void): Promise<void> {
  if ((await getMeta('seed_version')) === SEED_VERSION) return

  const base = import.meta.env.BASE_URL || '/'
  const manifestRes = await fetch(`${base}seed-enc/manifest.json`)
  const files: string[] = await manifestRes.json()

  const rows: Rows = {
    books: [], volumes: [], lessons: [], words: [], examples: [], phrases: [], phraseExamples: [],
  }
  const bookIdByTitle = new Map<string, string>()

  for (let i = 0; i < files.length; i++) {
    onProgress?.(i / (files.length + 1), `در حال خواندن ${files[i]}`)
    const res = await fetch(`${base}seed-enc/${files[i]}.enc`)
    const data = (await decryptSeedJson(await res.arrayBuffer())) as BookFile
    collectFile(files[i], data, bookIdByTitle, rows)
  }

  onProgress?.(files.length / (files.length + 1), 'در حال ذخیره در پایگاه‌داده…')

  const db = await getDb()
  await db.beginTransaction()
  try {
    // Clean slate — remove any previous seed (word/book ids change per seed).
    for (const t of WIPE_TABLES) {
      await db.run(`DELETE FROM ${t}`, [], false)
    }
    await bulkInsert(db, 'books', ['id', 'title', 'description', 'cover_image'], rows.books)
    await bulkInsert(db, 'volumes', ['id', 'book_id', 'volume_number', 'title'], rows.volumes)
    await bulkInsert(db, 'lessons', ['id', 'volume_id', 'lesson_number', 'title'], rows.lessons)
    await bulkInsert(
      db,
      'words',
      ['id', 'eng', 'per', 'description', 'description_per', 'pronunciation', 'part_of_speech', 'word_forms',
        'synonyms', 'antonyms', 'primary_example', 'primary_example_trs', 'pronunciation_audio',
        'chapter', 'unit', 'lesson_id', 'created_at', 'updated_at'],
      rows.words,
    )
    await bulkInsert(db, 'word_examples', ['id', 'word_id', 'eng_sentence', 'per_translation', 'ord'], rows.examples)
    await bulkInsert(db, 'word_phrases', ['id', 'word_id', 'pattern_eng', 'pattern_per', 'ord'], rows.phrases)
    await bulkInsert(db, 'word_phrase_examples', ['id', 'phrase_id', 'eng_sentence', 'per_translation', 'ord'], rows.phraseExamples)
    await db.commitTransaction()
  } catch (e) {
    await db.rollbackTransaction()
    throw e
  }

  await setMeta('seed_version', SEED_VERSION)
  onProgress?.(1, 'آماده شد')
}
