import { query, run, uid } from './db'
import { schedule, startOfDay, endOfDay } from './srs'
import type {
  Word,
  WordFilters,
  PaginatedWords,
  ProgressStats,
  BookSimple,
  Volume,
  VolumeSimple,
  LessonSimple,
  DiscoveryBook,
  ReviewMode,
  WordStatus,
  WordExample,
  SynonymResult,
  DashboardData,
  WatchlistBook,
  HeatmapDay,
  ReviewQueueItem,
  DashboardGlobalStats,
  StudyToday,
  StudyAnswer,
  StudyAnswerResult,
  StudyPlanMeta,
  SessionSummary,
  LearningPlan,
  UserSettings,
  CardOrder,
} from '@/types'

const MODULE_ID = 'offline-vocabulary'
const now = () => new Date().toISOString()

// Book cover images shipped in public/books/, keyed by the seeded book title.
const COVER_BY_TITLE: Record<string, string> = {
  '4000 Essential English Words': '/books/Pakage-4000.png',
  'Oxford Word Skills': '/books/Oxford-Word-Skills-Book-Series.png',
  '1000 English Collocations': '/books/1000-collocation.png',
  'English Phrasal Verbs in Use': '/books/english-phrasal-verbs-in-use.png',
  "Barron's Essential Words for the GRE": '/books/Essentaial-words-for-the-GRE-1.png',
  "Barron's Essential Words for the IELTS": '/books/Essentaial-words-for-the-ielts.png',
  "Barron's Essential Words for the TOEFL": '/books/Essentaial-words-for-the-toefl.png',
  'Street Talk 1': '/books/street-talk.png',
}
const coverFor = (title: string): string | undefined => COVER_BY_TITLE[title]

// Per-volume cover art (public/books/), for multi-volume books shown in the
// plan dialog. Keyed by seeded book title → volume number. Single-volume books
// fall back to the book cover (coverFor).
const VOLUME_COVER_BY_TITLE: Record<string, Record<number, string>> = {
  '4000 Essential English Words': {
    1: '/books/4000-v1.webp',
    2: '/books/4000-v2.webp',
    3: '/books/4000-v3.webp',
    4: '/books/4000-v4.webp',
    5: '/books/4000-v5.webp',
    6: '/books/4000-v6.webp',
  },
  'Oxford Word Skills': {
    1: '/books/oxford-word-skills-basic.webp',
    2: '/books/oxford-word-skills-intermediate.webp',
    3: '/books/oxford-word-skills-advanced.webp',
  },
}
const volumeCoverFor = (bookTitle: string, volumeNumber: number): string | undefined =>
  VOLUME_COVER_BY_TITLE[bookTitle]?.[volumeNumber] ?? coverFor(bookTitle)

// ── Word row → Word object ────────────────────────────────────────────────────
interface WordRow {
  id: string
  eng: string
  per: string
  description: string | null
  pronunciation: string | null
  part_of_speech: string | null
  word_forms: string | null
  synonyms: string | null
  antonyms: string | null
  primary_example: string | null
  primary_example_trs: string | null
  pronunciation_audio: string | null
  chapter: number | null
  unit: number | null
  lesson_id: string | null
  created_at: string | null
  updated_at: string | null
  l_id?: string | null
  l_number?: number | null
  l_title?: string | null
  v_id?: string | null
  v_number?: number | null
  v_title?: string | null
  b_id?: string | null
  b_title?: string | null
}

function parseArr(s: string | null): string[] {
  if (!s) return []
  try {
    return JSON.parse(s)
  } catch {
    return []
  }
}

function mapWord(
  r: WordRow,
  examples: WordExample[],
  phrases: Word['phrases'],
  progress: Word['progress'],
): Word {
  return {
    id: r.id,
    eng: r.eng,
    per: r.per,
    description: r.description ?? undefined,
    pronunciation: r.pronunciation ?? undefined,
    partOfSpeech: r.part_of_speech ?? undefined,
    wordForms: r.word_forms ?? undefined,
    synonyms: parseArr(r.synonyms),
    antonyms: parseArr(r.antonyms),
    primaryExample: r.primary_example ?? undefined,
    primaryExampleTrs: r.primary_example_trs ?? undefined,
    pronunciationAudio: r.pronunciation_audio ?? undefined,
    chapter: r.chapter ?? undefined,
    unit: r.unit ?? undefined,
    lessonId: r.lesson_id ?? undefined,
    moduleId: MODULE_ID,
    lesson: r.l_id
      ? {
          id: r.l_id,
          lessonNumber: r.l_number ?? 0,
          title: r.l_title ?? undefined,
          volume: {
            id: r.v_id ?? '',
            volumeNumber: r.v_number ?? 0,
            title: r.v_title ?? undefined,
            book: { id: r.b_id ?? '', title: r.b_title ?? '' },
          },
        }
      : undefined,
    examples,
    phrases,
    progress,
    createdAt: r.created_at ?? '',
    updatedAt: r.updated_at ?? '',
  }
}

const WORD_SELECT = `
  SELECT w.*, l.id AS l_id, l.lesson_number AS l_number, l.title AS l_title,
         v.id AS v_id, v.volume_number AS v_number, v.title AS v_title,
         b.id AS b_id, b.title AS b_title
  FROM words w
  LEFT JOIN lessons l ON w.lesson_id = l.id
  LEFT JOIN volumes v ON l.volume_id = v.id
  LEFT JOIN books b ON v.book_id = b.id`

function buildWhere(f: WordFilters): { clause: string; params: unknown[] } {
  const parts: string[] = []
  const params: unknown[] = []
  if (f.chapter !== undefined) { parts.push('w.chapter = ?'); params.push(f.chapter) }
  if (f.unit !== undefined) { parts.push('w.unit = ?'); params.push(f.unit) }
  if (f.lessonId !== undefined) { parts.push('w.lesson_id = ?'); params.push(f.lessonId) }
  if (f.volumeId !== undefined) { parts.push('l.volume_id = ?'); params.push(f.volumeId) }
  if (f.bookId !== undefined) { parts.push('v.book_id = ?'); params.push(f.bookId) }
  if (f.bookIds !== undefined && f.bookIds.length > 0) {
    parts.push(`v.book_id IN (${f.bookIds.map(() => '?').join(',')})`)
    params.push(...f.bookIds)
  }
  if (f.search) {
    parts.push('(w.eng LIKE ? OR w.per LIKE ?)')
    params.push(`%${f.search}%`, `%${f.search}%`)
  }
  // Words/Review pages filter by the MANUAL mark (separate from the SM-2 program).
  if (f.status !== undefined && f.status !== 'ALL' && f.mode !== undefined) {
    if (f.status === 'NOT_READ') {
      parts.push(
        `NOT EXISTS (SELECT 1 FROM progress p WHERE p.word_id = w.id AND p.review_mode = ? AND p.manual_status IN ('KNOWN','NOT_KNOWN'))`,
      )
      params.push(f.mode)
    } else {
      parts.push(
        `EXISTS (SELECT 1 FROM progress p WHERE p.word_id = w.id AND p.review_mode = ? AND p.manual_status = ?)`,
      )
      params.push(f.mode, f.status)
    }
  }
  return { clause: parts.length ? `WHERE ${parts.join(' AND ')}` : '', params }
}

function orderClause(sort?: string, order?: string): string {
  const dir = order === 'desc' ? 'DESC' : 'ASC'
  const col =
    sort === 'eng' ? 'w.eng' : sort === 'per' ? 'w.per' : sort === 'unit' ? 'w.unit' : 'w.chapter'
  return `ORDER BY ${col} ${dir}, w.unit ASC, w.eng ASC`
}

async function loadExamples(wordIds: string[]): Promise<Map<string, WordExample[]>> {
  const map = new Map<string, WordExample[]>()
  if (wordIds.length === 0) return map
  const rows = await query<{ id: string; word_id: string; eng_sentence: string; per_translation: string; ord: number }>(
    `SELECT * FROM word_examples WHERE word_id IN (${wordIds.map(() => '?').join(',')}) ORDER BY ord ASC`,
    wordIds,
  )
  for (const r of rows) {
    const list = map.get(r.word_id) ?? []
    list.push({ id: r.id, wordId: r.word_id, engSentence: r.eng_sentence, perTranslation: r.per_translation, order: r.ord })
    map.set(r.word_id, list)
  }
  return map
}

async function loadPhrases(wordIds: string[]): Promise<Map<string, Word['phrases']>> {
  const map = new Map<string, Word['phrases']>()
  if (wordIds.length === 0) return map
  const phrases = await query<{ id: string; word_id: string; pattern_eng: string; pattern_per: string; ord: number }>(
    `SELECT * FROM word_phrases WHERE word_id IN (${wordIds.map(() => '?').join(',')}) ORDER BY ord ASC`,
    wordIds,
  )
  const phraseIds = phrases.map((p) => p.id)
  const exByPhrase = new Map<string, { id: string; phraseId: string; engSentence: string; perTranslation: string; order: number }[]>()
  if (phraseIds.length > 0) {
    const exs = await query<{ id: string; phrase_id: string; eng_sentence: string; per_translation: string; ord: number }>(
      `SELECT * FROM word_phrase_examples WHERE phrase_id IN (${phraseIds.map(() => '?').join(',')}) ORDER BY ord ASC`,
      phraseIds,
    )
    for (const e of exs) {
      const l = exByPhrase.get(e.phrase_id) ?? []
      l.push({ id: e.id, phraseId: e.phrase_id, engSentence: e.eng_sentence, perTranslation: e.per_translation, order: e.ord })
      exByPhrase.set(e.phrase_id, l)
    }
  }
  for (const p of phrases) {
    const list = map.get(p.word_id) ?? []
    list.push({
      id: p.id,
      wordId: p.word_id,
      patternEng: p.pattern_eng,
      patternPer: p.pattern_per,
      order: p.ord,
      examples: exByPhrase.get(p.id) ?? [],
    })
    map.set(p.word_id, list)
  }
  return map
}

async function loadProgress(wordIds: string[]): Promise<Map<string, Word['progress']>> {
  const map = new Map<string, NonNullable<Word['progress']>>()
  if (wordIds.length === 0) return map
  const rows = await query<{
    word_id: string
    review_mode: ReviewMode
    status: WordStatus
    manual_status: WordStatus
  }>(
    `SELECT word_id, review_mode, status, manual_status FROM progress WHERE word_id IN (${wordIds.map(() => '?').join(',')})`,
    wordIds,
  )
  for (const r of rows) {
    const list = map.get(r.word_id) ?? []
    list.push({
      id: '',
      userId: '',
      wordId: r.word_id,
      reviewMode: r.review_mode,
      status: r.status,
      manualStatus: r.manual_status,
    })
    map.set(r.word_id, list)
  }
  return map
}

// ── Public API (mirrors the HTTP services) ────────────────────────────────────

export async function getWords(f: WordFilters): Promise<PaginatedWords> {
  const page = f.page ?? 1
  const limit = f.limit ?? 20
  const { clause, params } = buildWhere(f)

  const countRows = await query<{ c: number }>(
    `SELECT COUNT(*) AS c FROM words w LEFT JOIN lessons l ON w.lesson_id=l.id LEFT JOIN volumes v ON l.volume_id=v.id ${clause}`,
    params,
  )
  const total = countRows[0]?.c ?? 0

  const rows = await query<WordRow>(
    `${WORD_SELECT} ${clause} ${orderClause(f.sort, f.order)} LIMIT ? OFFSET ?`,
    [...params, limit, (page - 1) * limit],
  )
  const ids = rows.map((r) => r.id)
  const [examples, phrases, progress] = await Promise.all([
    loadExamples(ids),
    loadPhrases(ids),
    loadProgress(ids),
  ])
  const data = rows.map((r) =>
    mapWord(r, examples.get(r.id) ?? [], phrases.get(r.id) ?? [], progress.get(r.id) ?? []),
  )
  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } }
}

export async function getWord(id: string): Promise<Word> {
  const rows = await query<WordRow>(`${WORD_SELECT} WHERE w.id = ?`, [id])
  const r = rows[0]
  if (!r) throw new Error('Word not found')
  const [examples, phrases, progress] = await Promise.all([
    loadExamples([id]),
    loadPhrases([id]),
    loadProgress([id]),
  ])
  return mapWord(r, examples.get(id) ?? [], phrases.get(id) ?? [], progress.get(id) ?? [])
}

/** Manual free-review mark — writes `manual_status` only (SM-2 fields untouched). */
export async function updateWordStatus(
  wordId: string,
  reviewMode: ReviewMode,
  status: WordStatus,
): Promise<void> {
  await run(
    `INSERT INTO progress (word_id, review_mode, manual_status, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(word_id, review_mode) DO UPDATE SET manual_status = excluded.manual_status, updated_at = excluded.updated_at`,
    [wordId, reviewMode, status, now()],
  )
}

/** Reset MANUAL marks only (keep SM-2 rows/scheduling intact). */
export async function resetProgress(reviewMode?: ReviewMode): Promise<void> {
  if (reviewMode)
    await run(`UPDATE progress SET manual_status = 'NOT_READ' WHERE review_mode = ?`, [reviewMode])
  else await run(`UPDATE progress SET manual_status = 'NOT_READ'`, [])
}

export async function getStats(): Promise<ProgressStats> {
  const totalRow = await query<{ c: number }>('SELECT COUNT(*) AS c FROM words', [])
  const total = totalRow[0]?.c ?? 0
  const counts = await query<{ review_mode: ReviewMode; manual_status: WordStatus; c: number }>(
    'SELECT review_mode, manual_status, COUNT(*) AS c FROM progress GROUP BY review_mode, manual_status',
    [],
  )
  const mk = (mode: ReviewMode) => {
    const known = counts.find((x) => x.review_mode === mode && x.manual_status === 'KNOWN')?.c ?? 0
    const notKnown =
      counts.find((x) => x.review_mode === mode && x.manual_status === 'NOT_KNOWN')?.c ?? 0
    return { KNOWN: known, NOT_KNOWN: notKnown, NOT_READ: total - known - notKnown, total }
  }
  return { EN_TO_FA: mk('EN_TO_FA'), FA_TO_EN: mk('FA_TO_EN') }
}

// ── Books / volumes / lessons ────────────────────────────────────────────────
export async function getBooksSimple(): Promise<BookSimple[]> {
  return query<BookSimple>('SELECT id, title FROM books ORDER BY title ASC', [])
}
export async function getVolumesSimple(bookId: string): Promise<VolumeSimple[]> {
  const rows = await query<{ id: string; volume_number: number; title: string | null }>(
    'SELECT id, volume_number, title FROM volumes WHERE book_id = ? ORDER BY volume_number ASC',
    [bookId],
  )
  return rows.map((r) => ({ id: r.id, volumeNumber: r.volume_number, title: r.title ?? undefined }))
}
export async function getVolumes(bookId: string): Promise<Volume[]> {
  const rows = await query<{
    id: string
    book_id: string
    volume_number: number
    title: string | null
    book_title: string
  }>(
    `SELECT v.id, v.book_id, v.volume_number, v.title, b.title AS book_title
     FROM volumes v JOIN books b ON b.id = v.book_id
     WHERE v.book_id = ? ORDER BY v.volume_number ASC`,
    [bookId],
  )
  // The offline volumes table stores no cover column; resolve cover art from the
  // bundled public/books/ assets by book title + volume number.
  return rows.map((r) => ({
    id: r.id,
    bookId: r.book_id,
    volumeNumber: r.volume_number,
    title: r.title ?? undefined,
    coverImage: volumeCoverFor(r.book_title, r.volume_number),
    createdAt: '',
  }))
}
export async function getLessonsSimple(volumeId: string): Promise<LessonSimple[]> {
  const rows = await query<{ id: string; lesson_number: number; title: string | null }>(
    'SELECT id, lesson_number, title FROM lessons WHERE volume_id = ? ORDER BY lesson_number ASC',
    [volumeId],
  )
  return rows.map((r) => ({ id: r.id, lessonNumber: r.lesson_number, title: r.title ?? undefined }))
}

// ── Watchlist ────────────────────────────────────────────────────────────────
export async function getWatchlistBooks(): Promise<BookSimple[]> {
  // Books with at least one active learning plan (source of truth = plans).
  return query<BookSimple>(
    `SELECT DISTINCT b.id, b.title FROM books b
     JOIN volumes v ON v.book_id = b.id
     JOIN learning_plans lp ON lp.volume_id = v.id AND lp.is_active = 1
     ORDER BY b.title ASC`,
    [],
  )
}
export async function getDiscovery(): Promise<DiscoveryBook[]> {
  const rows = await query<{
    id: string; title: string; description: string | null; cover_image: string | null; total_words: number; in_watchlist: number
  }>(
    `SELECT b.id, b.title, b.description, b.cover_image,
       (SELECT COUNT(*) FROM words wo JOIN lessons l ON wo.lesson_id=l.id JOIN volumes v ON l.volume_id=v.id WHERE v.book_id=b.id) AS total_words,
       (SELECT COUNT(*) FROM volumes v JOIN learning_plans lp ON lp.volume_id=v.id AND lp.is_active=1 WHERE v.book_id=b.id) AS in_watchlist
     FROM books b ORDER BY b.title ASC`,
    [],
  )
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description ?? undefined,
    coverImage: coverFor(r.title) ?? r.cover_image ?? undefined,
    totalWords: r.total_words,
    inWatchlist: r.in_watchlist > 0,
  }))
}
export async function addToWatchlist(bookId: string): Promise<{ bookId: string }> {
  await run('INSERT OR IGNORE INTO watchlist (book_id, created_at) VALUES (?, ?)', [bookId, now()])
  return { bookId }
}
export async function removeFromWatchlist(bookId: string): Promise<{ bookId: string }> {
  await run('DELETE FROM watchlist WHERE book_id = ?', [bookId])
  return { bookId }
}

// ── Word editing ─────────────────────────────────────────────────────────────
export async function updateWord(id: string, data: Record<string, unknown>): Promise<Word> {
  const colMap: Record<string, string> = {
    eng: 'eng',
    per: 'per',
    description: 'description',
    primaryExample: 'primary_example',
    primaryExampleTrs: 'primary_example_trs',
    pronunciationAudio: 'pronunciation_audio',
    pronunciation: 'pronunciation',
    partOfSpeech: 'part_of_speech',
    chapter: 'chapter',
    unit: 'unit',
    lessonId: 'lesson_id',
  }
  const sets: string[] = []
  const vals: unknown[] = []
  for (const [k, col] of Object.entries(colMap)) {
    if (k in data) { sets.push(`${col} = ?`); vals.push(data[k] ?? null) }
  }
  sets.push('updated_at = ?'); vals.push(now())
  vals.push(id)
  if (sets.length > 1) await run(`UPDATE words SET ${sets.join(', ')} WHERE id = ?`, vals)
  return getWord(id)
}

export async function createWord(data: Record<string, unknown>): Promise<Word> {
  const id = uid()
  const ts = now()
  await run(
    `INSERT INTO words (id, eng, per, description, primary_example, primary_example_trs, pronunciation_audio, chapter, unit, lesson_id, synonyms, antonyms, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', '[]', ?, ?)`,
    [
      id,
      data.eng ?? '',
      data.per ?? '',
      data.description ?? null,
      data.primaryExample ?? null,
      data.primaryExampleTrs ?? null,
      data.pronunciationAudio ?? null,
      data.chapter ?? null,
      data.unit ?? null,
      data.lessonId ?? null,
      ts,
      ts,
    ],
  )
  return getWord(id)
}

export async function deleteWord(id: string): Promise<void> {
  await run('DELETE FROM word_phrase_examples WHERE phrase_id IN (SELECT id FROM word_phrases WHERE word_id = ?)', [id])
  await run('DELETE FROM word_phrases WHERE word_id = ?', [id])
  await run('DELETE FROM word_examples WHERE word_id = ?', [id])
  await run('DELETE FROM progress WHERE word_id = ?', [id])
  await run('DELETE FROM words WHERE id = ?', [id])
}

export async function addExample(
  wordId: string,
  data: { engSentence: string; perTranslation: string; order?: number },
): Promise<WordExample> {
  const id = uid()
  await run(
    'INSERT INTO word_examples (id, word_id, eng_sentence, per_translation, ord) VALUES (?, ?, ?, ?, ?)',
    [id, wordId, data.engSentence, data.perTranslation, data.order ?? 0],
  )
  return { id, wordId, engSentence: data.engSentence, perTranslation: data.perTranslation, order: data.order ?? 0 }
}
export async function updateExample(
  _wordId: string,
  exampleId: string,
  data: { engSentence?: string; perTranslation?: string },
): Promise<WordExample> {
  const sets: string[] = []
  const vals: unknown[] = []
  if (data.engSentence !== undefined) { sets.push('eng_sentence = ?'); vals.push(data.engSentence) }
  if (data.perTranslation !== undefined) { sets.push('per_translation = ?'); vals.push(data.perTranslation) }
  if (sets.length) { vals.push(exampleId); await run(`UPDATE word_examples SET ${sets.join(', ')} WHERE id = ?`, vals) }
  const rows = await query<{ id: string; word_id: string; eng_sentence: string; per_translation: string; ord: number }>(
    'SELECT * FROM word_examples WHERE id = ?', [exampleId],
  )
  const r = rows[0]
  return { id: r.id, wordId: r.word_id, engSentence: r.eng_sentence, perTranslation: r.per_translation, order: r.ord }
}
export async function deleteExample(_wordId: string, exampleId: string): Promise<void> {
  await run('DELETE FROM word_examples WHERE id = ?', [exampleId])
}

// ── Modules / synonyms ───────────────────────────────────────────────────────
export async function getModules() {
  return [{ id: MODULE_ID, name: 'Vocabulary', slug: 'vocabulary', description: undefined, isActive: true, order: 0 }]
}
export async function getSynonyms(wordId: string): Promise<SynonymResult[]> {
  const rows = await query<{ synonyms: string | null }>('SELECT synonyms FROM words WHERE id = ?', [wordId])
  return parseArr(rows[0]?.synonyms ?? null).map((w) => ({ word: w, similarity: 1, source: 'local' }))
}

// ── Dashboard (real, computed from local progress) ────────────────────────────
const dayOf = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : null)

export async function getDashboard(): Promise<DashboardData> {
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const dayStartIso = startOfDay(now).toISOString()
  const dayEndIso = endOfDay(now).toISOString()

  const settings = await getSettings()
  const mode = settings.studyDirection

  const plans = await activePlanRows()

  // Per-volume watchlist rows.
  const watchlist: WatchlistBook[] = []
  for (const p of plans) {
    const inVolume = 'l.volume_id = ?'
    const [totalRow, knownRow, notKnownRow, introRow, reviewedRow, dueRow, lastRow] = await Promise.all([
      query<{ c: number }>(
        `SELECT COUNT(*) AS c FROM words w JOIN lessons l ON w.lesson_id=l.id WHERE ${inVolume}`,
        [p.volume_id],
      ),
      query<{ c: number }>(
        `SELECT COUNT(*) AS c FROM progress pr JOIN words w ON pr.word_id=w.id JOIN lessons l ON w.lesson_id=l.id
         WHERE pr.review_mode=? AND pr.status='KNOWN' AND ${inVolume}`,
        [mode, p.volume_id],
      ),
      query<{ c: number }>(
        `SELECT COUNT(*) AS c FROM progress pr JOIN words w ON pr.word_id=w.id JOIN lessons l ON w.lesson_id=l.id
         WHERE pr.review_mode=? AND pr.status='NOT_KNOWN' AND ${inVolume}`,
        [mode, p.volume_id],
      ),
      query<{ c: number }>(
        `SELECT COUNT(*) AS c FROM progress pr JOIN words w ON pr.word_id=w.id JOIN lessons l ON w.lesson_id=l.id
         WHERE pr.review_mode=? AND pr.introduced_at IS NOT NULL AND ${inVolume}`,
        [mode, p.volume_id],
      ),
      query<{ c: number }>(
        `SELECT COUNT(*) AS c FROM progress pr JOIN words w ON pr.word_id=w.id JOIN lessons l ON w.lesson_id=l.id
         WHERE pr.review_mode=? AND pr.last_reviewed_at>=? AND pr.last_reviewed_at<=? AND ${inVolume}`,
        [mode, dayStartIso, dayEndIso, p.volume_id],
      ),
      query<{ c: number }>(
        `SELECT COUNT(*) AS c FROM progress pr JOIN words w ON pr.word_id=w.id JOIN lessons l ON w.lesson_id=l.id
         WHERE pr.review_mode=? AND pr.introduced_at IS NOT NULL AND pr.next_review_at IS NOT NULL AND pr.next_review_at<=? AND ${inVolume}`,
        [mode, dayEndIso, p.volume_id],
      ),
      query<{ t: string | null }>(
        `SELECT MAX(pr.last_reviewed_at) AS t FROM progress pr JOIN words w ON pr.word_id=w.id JOIN lessons l ON w.lesson_id=l.id
         WHERE pr.review_mode=? AND ${inVolume}`,
        [mode, p.volume_id],
      ),
    ])
    const total = totalRow[0]?.c ?? 0
    const known = knownRow[0]?.c ?? 0
    const notKnown = notKnownRow[0]?.c ?? 0
    const introduced = introRow[0]?.c ?? 0
    const notRead = Math.max(0, total - introduced)
    const remainingNew = notRead
    watchlist.push({
      id: p.id,
      bookId: p.book_id,
      title: `${p.book_title} — ${p.volume_title ?? `جلد ${p.volume_number}`}`,
      coverImage: coverFor(p.book_title),
      totalWords: total,
      knownWords: known,
      unknownWords: notKnown,
      notReadWords: notRead,
      reviewedToday: reviewedRow[0]?.c ?? 0,
      lastStudiedAt: lastRow[0]?.t ?? null,
      dueCount: dueRow[0]?.c ?? 0,
      estimatedDays: p.daily_new_words > 0 ? Math.ceil(remainingNew / p.daily_new_words) : 0,
    })
  }

  // Global stats — from sessions (streak/accuracy/avg) + progress (learned).
  const learnedRow = await query<{ c: number }>(
    `SELECT COUNT(*) AS c FROM progress WHERE review_mode=? AND status='KNOWN'`,
    [mode],
  )
  const sessions = await query<{
    started_at: string | null
    duration_sec: number
    reviewed_count: number
    correct_count: number
    wrong_count: number
  }>(
    'SELECT started_at, duration_sec, reviewed_count, correct_count, wrong_count FROM study_sessions',
    [],
  )

  const reviewsToday = sessions
    .filter((s) => dayOf(s.started_at) === today)
    .reduce((sum, s) => sum + s.reviewed_count, 0)
  const totalCorrect = sessions.reduce((s, x) => s + x.correct_count, 0)
  const totalWrong = sessions.reduce((s, x) => s + x.wrong_count, 0)
  const accuracyRate =
    totalCorrect + totalWrong > 0 ? Math.round((totalCorrect / (totalCorrect + totalWrong)) * 100) : 0
  const avgStudyMinutes =
    sessions.length > 0
      ? Math.round(sessions.reduce((s, x) => s + x.duration_sec, 0) / sessions.length / 60)
      : 0

  // Streak: consecutive days (ending today, or yesterday) with a session.
  const sessionDays = new Set(sessions.map((s) => dayOf(s.started_at)).filter(Boolean) as string[])
  let currentStreak = 0
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  if (!sessionDays.has(cursor.toISOString().slice(0, 10))) cursor.setDate(cursor.getDate() - 1)
  while (sessionDays.has(cursor.toISOString().slice(0, 10))) {
    currentStreak++
    cursor.setDate(cursor.getDate() - 1)
  }

  const bookIds = new Set(plans.map((p) => p.book_id))
  const stats: DashboardGlobalStats = {
    watchlistCount: bookIds.size,
    totalWordsLearned: learnedRow[0]?.c ?? 0,
    reviewsToday,
    currentStreak,
    avgStudyMinutes,
    accuracyRate,
  }

  const queue: ReviewQueueItem[] = watchlist
    .filter((b) => b.dueCount > 0)
    .map((b) => ({ bookId: b.bookId, title: b.title, dueCount: b.dueCount }))

  // Activity heatmap: last 126 days, reviewed words per day from sessions.
  const counts = new Map<string, number>()
  for (const s of sessions) {
    const d = dayOf(s.started_at)
    if (d) counts.set(d, (counts.get(d) ?? 0) + s.reviewed_count)
  }
  const heatmap: HeatmapDay[] = []
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  for (let i = 125; i >= 0; i--) {
    const d = new Date(base)
    d.setDate(base.getDate() - i)
    const iso = d.toISOString().slice(0, 10)
    heatmap.push({ date: iso, count: counts.get(iso) ?? 0 })
  }

  return { stats, watchlist, heatmap, queue }
}

// ── Daily learning system (mirrors backend study/plans/settings modules) ───────

interface PlanRow {
  id: string
  volume_id: string
  daily_new_words: number
  daily_goal: number
  book_id: string
  book_title: string
  volume_number: number
  volume_title: string | null
}

/** Active learning plans with their volume + book, oldest first. */
async function activePlanRows(): Promise<PlanRow[]> {
  return query<PlanRow>(
    `SELECT lp.id, lp.volume_id, lp.daily_new_words, lp.daily_goal,
            b.id AS book_id, b.title AS book_title, v.volume_number, v.title AS volume_title
     FROM learning_plans lp
     JOIN volumes v ON lp.volume_id = v.id
     JOIN books b ON v.book_id = b.id
     WHERE lp.is_active = 1
     ORDER BY lp.created_at ASC`,
    [],
  )
}

/** Load full Word objects for a list of ids, preserving the given order. */
async function wordsByIds(ids: string[]): Promise<Word[]> {
  if (ids.length === 0) return []
  const rows = await query<WordRow>(
    `${WORD_SELECT} WHERE w.id IN (${ids.map(() => '?').join(',')})`,
    ids,
  )
  const [examples, phrases, progress] = await Promise.all([
    loadExamples(ids),
    loadPhrases(ids),
    loadProgress(ids),
  ])
  const byId = new Map(rows.map((r) => [r.id, r]))
  const out: Word[] = []
  for (const id of ids) {
    const r = byId.get(id)
    if (r) out.push(mapWord(r, examples.get(id) ?? [], phrases.get(id) ?? [], progress.get(id) ?? []))
  }
  return out
}

export async function getStudyToday(): Promise<StudyToday> {
  const now = new Date()
  const dayEndIso = endOfDay(now).toISOString()
  const dayStartIso = startOfDay(now).toISOString()

  const settings = await getSettings()
  const mode = settings.studyDirection
  const plans = await activePlanRows()
  const volumeIds = plans.map((p) => p.volume_id)

  // Due reviews.
  let due: Word[] = []
  if (volumeIds.length > 0) {
    const dueRows = await query<{ word_id: string }>(
      `SELECT p.word_id FROM progress p
       JOIN words w ON p.word_id=w.id JOIN lessons l ON w.lesson_id=l.id
       WHERE p.review_mode=? AND p.introduced_at IS NOT NULL
         AND p.next_review_at IS NOT NULL AND p.next_review_at<=?
         AND l.volume_id IN (${volumeIds.map(() => '?').join(',')})
       ORDER BY p.next_review_at ASC`,
      [mode, dayEndIso, ...volumeIds],
    )
    due = await wordsByIds(dueRows.map((r) => r.word_id))
  }

  // New words per plan.
  const newWords: Word[] = []
  const planMeta: StudyPlanMeta[] = []
  for (const p of plans) {
    const introducedTodayRow = await query<{ c: number }>(
      `SELECT COUNT(*) AS c FROM progress pr JOIN words w ON pr.word_id=w.id JOIN lessons l ON w.lesson_id=l.id
       WHERE pr.review_mode=? AND pr.introduced_at>=? AND l.volume_id=?`,
      [mode, dayStartIso, p.volume_id],
    )
    const introducedToday = introducedTodayRow[0]?.c ?? 0
    const capacity = Math.max(0, p.daily_new_words - introducedToday)

    const preview = await query<{ id: string; lesson_id: string | null; l_number: number | null }>(
      `SELECT w.id, w.lesson_id, l.lesson_number AS l_number
       FROM words w JOIN lessons l ON w.lesson_id=l.id
       WHERE l.volume_id=?
         AND NOT EXISTS (SELECT 1 FROM progress pr WHERE pr.word_id=w.id AND pr.review_mode=? AND pr.introduced_at IS NOT NULL)
       ORDER BY l.lesson_number ASC, w.chapter ASC, w.created_at ASC, w.id ASC
       LIMIT ?`,
      [p.volume_id, mode, Math.max(capacity, 1)],
    )
    const todays = capacity > 0 ? preview.slice(0, capacity) : []
    const todaysWords = await wordsByIds(todays.map((r) => r.id))
    newWords.push(...todaysWords)

    const next = preview[0]
    const currentLesson = next?.l_number ?? null
    let continueLesson = false
    if (next?.lesson_id) {
      const c = await query<{ c: number }>(
        `SELECT COUNT(*) AS c FROM progress pr JOIN words w ON pr.word_id=w.id
         WHERE pr.review_mode=? AND pr.introduced_at IS NOT NULL AND w.lesson_id=?`,
        [mode, next.lesson_id],
      )
      continueLesson = (c[0]?.c ?? 0) > 0
    }

    planMeta.push({
      planId: p.id,
      volumeId: p.volume_id,
      bookTitle: p.book_title,
      volumeTitle: p.volume_title ?? `جلد ${p.volume_number}`,
      dailyNewWords: p.daily_new_words,
      dailyGoal: p.daily_goal,
      currentLesson,
      newToday: todaysWords.length,
      continueLesson,
    })
  }

  return {
    due,
    new: newWords,
    meta: {
      dueCount: due.length,
      newCount: newWords.length,
      dailyGoal: plans.reduce((s, p) => s + p.daily_goal, 0),
      reviewedToday: 0,
      hasPlans: plans.length > 0,
      direction: mode,
      plans: planMeta,
    },
  }
}

export async function answerStudy(wordId: string, answer: StudyAnswer): Promise<StudyAnswerResult> {
  const settings = await getSettings()
  const mode = settings.studyDirection
  const nowDate = new Date()
  const nowIso = nowDate.toISOString()

  const existing = (
    await query<{
      repetitions: number
      interval_days: number
      ease_factor: number
      review_count: number
      correct_count: number
      wrong_count: number
      introduced_at: string | null
    }>(
      'SELECT repetitions, interval_days, ease_factor, review_count, correct_count, wrong_count, introduced_at FROM progress WHERE word_id=? AND review_mode=?',
      [wordId, mode],
    )
  )[0]

  const res = schedule(
    existing
      ? {
          repetitions: existing.repetitions,
          intervalDays: existing.interval_days,
          easeFactor: existing.ease_factor,
        }
      : null,
    answer,
    nowDate,
  )
  if (!res) return { wordId, skipped: true }

  const introducedAt = existing?.introduced_at ?? nowIso
  const nextIso = res.nextReviewAt.toISOString()

  if (existing) {
    await run(
      `UPDATE progress SET status=?, repetitions=?, interval_days=?, ease_factor=?,
         review_count=review_count+1, correct_count=correct_count+?, wrong_count=wrong_count+?,
         last_reviewed_at=?, next_review_at=?, introduced_at=?, updated_at=?
       WHERE word_id=? AND review_mode=?`,
      [
        res.status, res.repetitions, res.intervalDays, res.easeFactor,
        res.correct ? 1 : 0, res.correct ? 0 : 1,
        nowIso, nextIso, introducedAt, nowIso, wordId, mode,
      ],
    )
  } else {
    await run(
      `INSERT INTO progress (word_id, review_mode, status, updated_at, repetitions, interval_days,
         ease_factor, review_count, correct_count, wrong_count, last_reviewed_at, next_review_at, introduced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)`,
      [
        wordId, mode, res.status, nowIso, res.repetitions, res.intervalDays, res.easeFactor,
        res.correct ? 1 : 0, res.correct ? 0 : 1, nowIso, nextIso, introducedAt,
      ],
    )
  }

  return {
    wordId,
    skipped: false,
    status: res.status,
    nextReviewAt: nextIso,
    correct: res.correct,
  }
}

export async function recordStudySession(summary: SessionSummary): Promise<{ id: string }> {
  const id = uid()
  await run(
    `INSERT INTO study_sessions (id, started_at, ended_at, duration_sec, reviewed_count,
       correct_count, wrong_count, hard_count, skipped_count, new_count, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, summary.startedAt, summary.endedAt, summary.durationSec, summary.reviewedCount,
      summary.correctCount, summary.wrongCount, summary.hardCount, summary.skippedCount,
      summary.newCount, now(),
    ],
  )
  return { id }
}

// ── Learning plans ─────────────────────────────────────────────────────────────

export async function getPlans(): Promise<LearningPlan[]> {
  const rows = await activePlanRows()
  const out: LearningPlan[] = []
  for (const p of rows) {
    const totalRow = await query<{ c: number }>(
      'SELECT COUNT(*) AS c FROM words w JOIN lessons l ON w.lesson_id=l.id WHERE l.volume_id=?',
      [p.volume_id],
    )
    out.push({
      id: p.id,
      volumeId: p.volume_id,
      bookId: p.book_id,
      bookTitle: p.book_title,
      volumeTitle: p.volume_title ?? `جلد ${p.volume_number}`,
      volumeNumber: p.volume_number,
      dailyNewWords: p.daily_new_words,
      dailyGoal: p.daily_goal,
      isActive: true,
      totalWords: totalRow[0]?.c ?? 0,
    })
  }
  return out
}

export async function createPlan(input: {
  volumeId: string
  dailyNewWords: number
  dailyGoal?: number
}): Promise<{ id: string; volumeId: string }> {
  const dailyGoal = input.dailyGoal ?? input.dailyNewWords * 3
  const existing = (
    await query<{ id: string }>('SELECT id FROM learning_plans WHERE volume_id=?', [input.volumeId])
  )[0]
  if (existing) {
    await run(
      'UPDATE learning_plans SET daily_new_words=?, daily_goal=?, is_active=1 WHERE id=?',
      [input.dailyNewWords, dailyGoal, existing.id],
    )
    return { id: existing.id, volumeId: input.volumeId }
  }
  const id = uid()
  await run(
    'INSERT INTO learning_plans (id, volume_id, daily_new_words, daily_goal, is_active, created_at) VALUES (?, ?, ?, ?, 1, ?)',
    [id, input.volumeId, input.dailyNewWords, dailyGoal, now()],
  )
  return { id, volumeId: input.volumeId }
}

export async function updatePlan(
  id: string,
  input: { dailyNewWords?: number; dailyGoal?: number; isActive?: boolean },
): Promise<{ id: string }> {
  const sets: string[] = []
  const vals: unknown[] = []
  if (input.dailyNewWords !== undefined) { sets.push('daily_new_words=?'); vals.push(input.dailyNewWords) }
  if (input.dailyGoal !== undefined) { sets.push('daily_goal=?'); vals.push(input.dailyGoal) }
  if (input.isActive !== undefined) { sets.push('is_active=?'); vals.push(input.isActive ? 1 : 0) }
  if (sets.length) { vals.push(id); await run(`UPDATE learning_plans SET ${sets.join(', ')} WHERE id=?`, vals) }
  return { id }
}

export async function deletePlan(id: string): Promise<{ id: string }> {
  const row = (
    await query<{ volume_id: string }>('SELECT volume_id FROM learning_plans WHERE id=?', [id])
  )[0]
  if (row) {
    // Clear SM-2 program data for the volume's words; keep manual_status intact.
    await run(
      `UPDATE progress SET status='NOT_READ', repetitions=0, interval_days=0, ease_factor=2.5,
         review_count=0, correct_count=0, wrong_count=0, last_reviewed_at=NULL, next_review_at=NULL, introduced_at=NULL
       WHERE word_id IN (SELECT w.id FROM words w JOIN lessons l ON w.lesson_id=l.id WHERE l.volume_id=?)`,
      [row.volume_id],
    )
  }
  await run('DELETE FROM learning_plans WHERE id=?', [id])
  return { id }
}

// ── Settings ─────────────────────────────────────────────────────────────────

const SETTINGS_ID = 'local'

export async function getSettings(): Promise<UserSettings> {
  const row = (
    await query<{
      study_direction: ReviewMode
      auto_play_audio: number
      show_phonetics: number
      show_examples: number
      card_order: CardOrder
    }>(
      'SELECT study_direction, auto_play_audio, show_phonetics, show_examples, card_order FROM user_settings WHERE id=?',
      [SETTINGS_ID],
    )
  )[0]
  if (!row) {
    await run('INSERT OR IGNORE INTO user_settings (id) VALUES (?)', [SETTINGS_ID])
    return {
      studyDirection: 'EN_TO_FA',
      autoPlayAudio: true,
      showPhonetics: true,
      showExamples: true,
      cardOrder: 'SEQUENTIAL',
    }
  }
  return {
    studyDirection: row.study_direction,
    autoPlayAudio: row.auto_play_audio === 1,
    showPhonetics: row.show_phonetics === 1,
    showExamples: row.show_examples === 1,
    cardOrder: row.card_order,
  }
}

export async function updateSettings(input: Partial<UserSettings>): Promise<UserSettings> {
  await getSettings() // ensure the row exists
  const map: Record<string, string> = {
    studyDirection: 'study_direction',
    autoPlayAudio: 'auto_play_audio',
    showPhonetics: 'show_phonetics',
    showExamples: 'show_examples',
    cardOrder: 'card_order',
  }
  const sets: string[] = []
  const vals: unknown[] = []
  for (const [k, col] of Object.entries(map)) {
    if (k in input) {
      const v = (input as Record<string, unknown>)[k]
      sets.push(`${col}=?`)
      vals.push(typeof v === 'boolean' ? (v ? 1 : 0) : v)
    }
  }
  if (sets.length) { vals.push(SETTINGS_ID); await run(`UPDATE user_settings SET ${sets.join(', ')} WHERE id=?`, vals) }
  return getSettings()
}
