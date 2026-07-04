import { getDb, getMeta, setMeta, uid } from './db'
import type { SQLiteDBConnection } from '@capacitor-community/sqlite'

// ── Book / volume title maps (mirrors backend import-all.ts) ──────────────────
const BOOK_TITLE_MAP: Record<string, string> = {
  '4000-essential-english-words': '4000 Essential English Words',
  'oxford-word-skills-basic': 'Oxford Word Skills',
  '1000-english-collocations': '1000 English Collocations',
  'english-phrasal-verbs-in-use': 'English Phrasal Verbs in Use',
  'barron-essential-words-for-the-gre': "Barron's Essential Words for the GRE",
  'barron-s-essential-words-for-the-ielts': "Barron's Essential Words for the IELTS",
  'barron-s-essential-words-for-the-toefl': "Barron's Essential Words for the TOEFL",
  'street-talk-1': 'Street Talk 1',
}
const VOLUME_TITLE_MAP: Record<string, Record<number, string>> = {
  'oxford-word-skills-basic': { 1: 'Basic', 2: 'Intermediate', 3: 'Advanced' },
}

interface ScrapedExample { eng: string; per: string }
interface ScrapedPhrase { patternEng: string; patternPer?: string; examples: ScrapedExample[] }
interface ScrapedMeaning {
  per: string
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
      const synonyms = [...new Set(w.meanings.flatMap((m) => m.synonyms ?? []))]
      const antonyms = [...new Set(w.meanings.flatMap((m) => m.antonyms ?? []))]
      const allExamples = w.meanings.flatMap((m) => m.examples ?? [])
      const allPhrases = w.meanings.flatMap((m) => m.phrases ?? [])
      const wordForms = w.wordForms ? `${w.wordForms.label}: ${w.wordForms.forms}` : null
      const firstEx = allExamples[0]
      const wordId = uid()
      const now = NOW()

      rows.words.push([
        wordId,
        w.eng.trim(),
        per || w.eng,
        null,
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
export async function seedIfNeeded(onProgress?: (p: number, label: string) => void): Promise<void> {
  if ((await getMeta('seeded')) === '1') return

  const base = import.meta.env.BASE_URL || '/'
  const manifestRes = await fetch(`${base}seed/manifest.json`)
  const files: string[] = await manifestRes.json()

  const rows: Rows = {
    books: [], volumes: [], lessons: [], words: [], examples: [], phrases: [], phraseExamples: [],
  }
  const bookIdByTitle = new Map<string, string>()

  for (let i = 0; i < files.length; i++) {
    onProgress?.(i / (files.length + 1), `در حال خواندن ${files[i]}`)
    const res = await fetch(`${base}seed/${files[i]}`)
    const data = (await res.json()) as BookFile
    collectFile(files[i], data, bookIdByTitle, rows)
  }

  onProgress?.(files.length / (files.length + 1), 'در حال ذخیره در پایگاه‌داده…')

  const db = await getDb()
  await db.beginTransaction()
  try {
    await bulkInsert(db, 'books', ['id', 'title', 'description', 'cover_image'], rows.books)
    await bulkInsert(db, 'volumes', ['id', 'book_id', 'volume_number', 'title'], rows.volumes)
    await bulkInsert(db, 'lessons', ['id', 'volume_id', 'lesson_number', 'title'], rows.lessons)
    await bulkInsert(
      db,
      'words',
      ['id', 'eng', 'per', 'description', 'pronunciation', 'part_of_speech', 'word_forms',
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

  await setMeta('seeded', '1')
  onProgress?.(1, 'آماده شد')
}
