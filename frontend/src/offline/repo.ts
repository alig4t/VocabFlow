import { query, run, uid } from './db'
import type {
  Word,
  WordFilters,
  PaginatedWords,
  ProgressStats,
  BookSimple,
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
  if (f.status !== undefined && f.status !== 'ALL' && f.mode !== undefined) {
    if (f.status === 'NOT_READ') {
      parts.push(
        `NOT EXISTS (SELECT 1 FROM progress p WHERE p.word_id = w.id AND p.review_mode = ? AND p.status IN ('KNOWN','NOT_KNOWN'))`,
      )
      params.push(f.mode)
    } else {
      parts.push(
        `EXISTS (SELECT 1 FROM progress p WHERE p.word_id = w.id AND p.review_mode = ? AND p.status = ?)`,
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
  const rows = await query<{ word_id: string; review_mode: ReviewMode; status: WordStatus }>(
    `SELECT word_id, review_mode, status FROM progress WHERE word_id IN (${wordIds.map(() => '?').join(',')})`,
    wordIds,
  )
  for (const r of rows) {
    const list = map.get(r.word_id) ?? []
    list.push({ id: '', userId: '', wordId: r.word_id, reviewMode: r.review_mode, status: r.status })
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

export async function updateWordStatus(
  wordId: string,
  reviewMode: ReviewMode,
  status: WordStatus,
): Promise<void> {
  await run(
    `INSERT INTO progress (word_id, review_mode, status, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(word_id, review_mode) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at`,
    [wordId, reviewMode, status, now()],
  )
}

export async function resetProgress(reviewMode?: ReviewMode): Promise<void> {
  if (reviewMode) await run('DELETE FROM progress WHERE review_mode = ?', [reviewMode])
  else await run('DELETE FROM progress', [])
}

export async function getStats(): Promise<ProgressStats> {
  const totalRow = await query<{ c: number }>('SELECT COUNT(*) AS c FROM words', [])
  const total = totalRow[0]?.c ?? 0
  const counts = await query<{ review_mode: ReviewMode; status: WordStatus; c: number }>(
    'SELECT review_mode, status, COUNT(*) AS c FROM progress GROUP BY review_mode, status',
    [],
  )
  const mk = (mode: ReviewMode) => {
    const known = counts.find((x) => x.review_mode === mode && x.status === 'KNOWN')?.c ?? 0
    const notKnown = counts.find((x) => x.review_mode === mode && x.status === 'NOT_KNOWN')?.c ?? 0
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
export async function getLessonsSimple(volumeId: string): Promise<LessonSimple[]> {
  const rows = await query<{ id: string; lesson_number: number; title: string | null }>(
    'SELECT id, lesson_number, title FROM lessons WHERE volume_id = ? ORDER BY lesson_number ASC',
    [volumeId],
  )
  return rows.map((r) => ({ id: r.id, lessonNumber: r.lesson_number, title: r.title ?? undefined }))
}

// ── Watchlist ────────────────────────────────────────────────────────────────
export async function getWatchlistBooks(): Promise<BookSimple[]> {
  return query<BookSimple>(
    'SELECT b.id, b.title FROM watchlist w JOIN books b ON w.book_id = b.id ORDER BY b.title ASC',
    [],
  )
}
export async function getDiscovery(): Promise<DiscoveryBook[]> {
  const rows = await query<{
    id: string; title: string; description: string | null; cover_image: string | null; total_words: number; in_watchlist: number
  }>(
    `SELECT b.id, b.title, b.description, b.cover_image,
       (SELECT COUNT(*) FROM words wo JOIN lessons l ON wo.lesson_id=l.id JOIN volumes v ON l.volume_id=v.id WHERE v.book_id=b.id) AS total_words,
       (SELECT COUNT(*) FROM watchlist wl WHERE wl.book_id=b.id) AS in_watchlist
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
  const today = new Date().toISOString().slice(0, 10)

  const wl = await query<{ id: string; title: string }>(
    'SELECT b.id, b.title FROM watchlist w JOIN books b ON w.book_id = b.id ORDER BY b.title ASC',
    [],
  )

  const watchlist: WatchlistBook[] = []
  for (const b of wl) {
    const totalRow = await query<{ c: number }>(
      'SELECT COUNT(*) AS c FROM words wo JOIN lessons l ON wo.lesson_id=l.id JOIN volumes v ON l.volume_id=v.id WHERE v.book_id = ?',
      [b.id],
    )
    const total = totalRow[0]?.c ?? 0
    const prog = await query<{ word_id: string; status: WordStatus; updated_at: string | null }>(
      `SELECT p.word_id, p.status, p.updated_at FROM progress p
       JOIN words wo ON p.word_id=wo.id JOIN lessons l ON wo.lesson_id=l.id JOIN volumes v ON l.volume_id=v.id
       WHERE v.book_id = ?`,
      [b.id],
    )
    const byWord = new Map<string, Set<WordStatus>>()
    let reviewedToday = 0
    let lastStudied: string | null = null
    for (const r of prog) {
      const set = byWord.get(r.word_id) ?? new Set<WordStatus>()
      set.add(r.status)
      byWord.set(r.word_id, set)
      if (dayOf(r.updated_at) === today) reviewedToday++
      if (r.updated_at && (!lastStudied || r.updated_at > lastStudied)) lastStudied = r.updated_at
    }
    let known = 0
    let notKnown = 0
    for (const set of byWord.values()) {
      if (set.has('KNOWN')) known++
      else if (set.has('NOT_KNOWN')) notKnown++
    }
    const notRead = Math.max(0, total - known - notKnown)
    const dueCount = notRead + notKnown
    watchlist.push({
      id: b.id,
      bookId: b.id,
      title: b.title,
      coverImage: coverFor(b.title),
      totalWords: total,
      knownWords: known,
      unknownWords: notKnown,
      notReadWords: notRead,
      reviewedToday,
      lastStudiedAt: dayOf(lastStudied),
      dueCount,
      estimatedDays: dueCount > 0 ? Math.ceil(dueCount / 20) : 0,
    })
  }

  const allProg = await query<{ word_id: string; status: WordStatus; updated_at: string | null }>(
    'SELECT word_id, status, updated_at FROM progress',
    [],
  )
  const knownSet = new Set(allProg.filter((r) => r.status === 'KNOWN').map((r) => r.word_id))
  const notKnownSet = new Set(
    allProg.filter((r) => r.status === 'NOT_KNOWN' && !knownSet.has(r.word_id)).map((r) => r.word_id),
  )
  const denom = knownSet.size + notKnownSet.size
  const reviewsToday = allProg.filter((r) => dayOf(r.updated_at) === today).length

  // Study streak: consecutive days (ending today) with any progress update.
  const activeDates = new Set(allProg.map((r) => dayOf(r.updated_at)).filter(Boolean) as string[])
  let currentStreak = 0
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  while (activeDates.has(cursor.toISOString().slice(0, 10))) {
    currentStreak++
    cursor.setDate(cursor.getDate() - 1)
  }

  const stats: DashboardGlobalStats = {
    watchlistCount: watchlist.length,
    totalWordsLearned: knownSet.size,
    reviewsToday,
    currentStreak,
    avgStudyMinutes: 0,
    accuracyRate: denom > 0 ? Math.round((knownSet.size / denom) * 100) : 0,
  }

  const queue: ReviewQueueItem[] = watchlist
    .filter((b) => b.dueCount > 0)
    .map((b) => ({ bookId: b.bookId, title: b.title, dueCount: b.dueCount }))

  // Activity heatmap: last 126 days, count of progress updates per day.
  const counts = new Map<string, number>()
  for (const r of allProg) {
    const d = dayOf(r.updated_at)
    if (d) counts.set(d, (counts.get(d) ?? 0) + 1)
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
