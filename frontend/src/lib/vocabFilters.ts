import type { ReviewMode, WordStatus } from '@/types'

/** Filter state shared by the vocabulary list and review pages. */
export interface WordFiltersState {
  mode: ReviewMode
  status: WordStatus | 'ALL'
  sort: 'chapter' | 'eng' | 'per'
  chapter: number | undefined
  search: string
  bookId: string | undefined
  volumeId: string | undefined
  lessonId: string | undefined
}

export const DEFAULT_VOCAB_FILTERS: WordFiltersState = {
  mode: 'EN_TO_FA',
  status: 'ALL',
  sort: 'chapter',
  chapter: undefined,
  search: '',
  bookId: undefined,
  volumeId: undefined,
  lessonId: undefined,
}

/** localStorage key holding the last vocabulary query string (e.g. "?mode=…"). */
export const VOCAB_PARAMS_STORAGE_KEY = 'vocab_last_params'

const MODES: ReviewMode[] = ['EN_TO_FA', 'FA_TO_EN']
const STATUSES: (WordStatus | 'ALL')[] = ['ALL', 'KNOWN', 'NOT_KNOWN', 'NOT_READ']
const SORTS: WordFiltersState['sort'][] = ['chapter', 'eng', 'per']

/** Read filters + page from a URLSearchParams, falling back to defaults. */
export function parseVocabParams(sp: URLSearchParams): {
  filters: WordFiltersState
  page: number
} {
  const mode = sp.get('mode')
  const status = sp.get('status')
  const sort = sp.get('sort')
  const chapterRaw = sp.get('chapter')
  const pageRaw = sp.get('page')
  const chapter = chapterRaw && Number.isFinite(Number(chapterRaw)) ? Number(chapterRaw) : undefined
  const page = pageRaw && Number(pageRaw) > 0 ? Math.floor(Number(pageRaw)) : 1

  return {
    filters: {
      mode: MODES.includes(mode as ReviewMode) ? (mode as ReviewMode) : DEFAULT_VOCAB_FILTERS.mode,
      status: STATUSES.includes(status as WordStatus | 'ALL')
        ? (status as WordStatus | 'ALL')
        : DEFAULT_VOCAB_FILTERS.status,
      sort: SORTS.includes(sort as WordFiltersState['sort'])
        ? (sort as WordFiltersState['sort'])
        : DEFAULT_VOCAB_FILTERS.sort,
      chapter,
      search: sp.get('search') ?? '',
      bookId: sp.get('bookId') || undefined,
      volumeId: sp.get('volumeId') || undefined,
      lessonId: sp.get('lessonId') || undefined,
    },
    page,
  }
}

/** Serialize filters + page to a URLSearchParams, omitting defaults for clean URLs. */
export function serializeVocabParams(filters: WordFiltersState, page: number): URLSearchParams {
  const sp = new URLSearchParams()
  // mode is always meaningful — keep it explicit in the URL.
  sp.set('mode', filters.mode)
  if (filters.status !== 'ALL') sp.set('status', filters.status)
  if (filters.sort !== 'chapter') sp.set('sort', filters.sort)
  if (filters.chapter !== undefined) sp.set('chapter', String(filters.chapter))
  if (filters.search.trim()) sp.set('search', filters.search.trim())
  if (filters.bookId) sp.set('bookId', filters.bookId)
  if (filters.volumeId) sp.set('volumeId', filters.volumeId)
  if (filters.lessonId) sp.set('lessonId', filters.lessonId)
  if (page > 1) sp.set('page', String(page))
  return sp
}

/** Map UI filter state to the API filter payload (status 'ALL' → undefined). */
export function toApiFilters(filters: WordFiltersState, page: number, limit: number) {
  return {
    page,
    limit,
    mode: filters.mode,
    status: filters.status === 'ALL' ? undefined : (filters.status as WordStatus),
    sort: filters.sort,
    order: 'asc' as const,
    chapter: filters.chapter,
    search: filters.search.trim() || undefined,
    bookId: filters.bookId,
    volumeId: filters.volumeId,
    lessonId: filters.lessonId,
  }
}
