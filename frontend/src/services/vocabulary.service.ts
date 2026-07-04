import api from '@/lib/axios'
import { API_ENDPOINTS } from '@/config/api'
import { isNative } from '@/lib/platform'
import type { Word, WordFilters, WordExample, LearningModule, PaginatedWords } from '@/types'

// Offline (native) data layer — lazy-loaded so the SQLite code stays out of the web bundle.
const off = () => import('@/offline/repo')

export interface CreateWordData {
  eng: string
  per: string
  description?: string
  primaryExample?: string
  primaryExampleTrs?: string
  pronunciationAudio?: string
  chapter?: number
  unit?: number
  lessonId?: string
  moduleId: string
}

export type UpdateWordData = Partial<CreateWordData>

export interface CreateExampleData {
  engSentence: string
  perTranslation: string
  order?: number
}

export type UpdateExampleData = Partial<CreateExampleData>

export const vocabularyService = {
  getWords(filters: WordFilters): Promise<PaginatedWords> {
    if (isNative()) return off().then((o) => o.getWords(filters))
    const params: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined) continue
      // Arrays (e.g. bookIds) go over the wire comma-separated.
      params[key] = Array.isArray(value) ? value.join(',') : value
    }
    return api
      .get<PaginatedWords>(API_ENDPOINTS.words.list, { params })
      .then((res) => res.data)
  },

  getWord(id: string): Promise<Word> {
    if (isNative()) return off().then((o) => o.getWord(id))
    return api.get<Word>(API_ENDPOINTS.words.detail(id)).then((res) => res.data)
  },

  getModules(): Promise<LearningModule[]> {
    if (isNative()) return off().then((o) => o.getModules() as Promise<LearningModule[]>)
    return api.get<LearningModule[]>(API_ENDPOINTS.words.modules).then((res) => res.data)
  },

  createWord(data: CreateWordData): Promise<Word> {
    if (isNative()) return off().then((o) => o.createWord(data as unknown as Record<string, unknown>))
    return api.post<Word>(API_ENDPOINTS.words.list, data).then((res) => res.data)
  },

  updateWord(id: string, data: UpdateWordData): Promise<Word> {
    if (isNative()) return off().then((o) => o.updateWord(id, data as unknown as Record<string, unknown>))
    return api.put<Word>(API_ENDPOINTS.words.detail(id), data).then((res) => res.data)
  },

  deleteWord(id: string): Promise<void> {
    if (isNative()) return off().then((o) => o.deleteWord(id))
    return api.delete(API_ENDPOINTS.words.detail(id)).then((res) => res.data)
  },

  addExample(wordId: string, data: CreateExampleData): Promise<WordExample> {
    if (isNative()) return off().then((o) => o.addExample(wordId, data))
    return api
      .post<WordExample>(API_ENDPOINTS.words.examples(wordId), data)
      .then((res) => res.data)
  },

  updateExample(
    wordId: string,
    exampleId: string,
    data: UpdateExampleData,
  ): Promise<WordExample> {
    if (isNative()) return off().then((o) => o.updateExample(wordId, exampleId, data))
    return api
      .put<WordExample>(API_ENDPOINTS.words.example(wordId, exampleId), data)
      .then((res) => res.data)
  },

  deleteExample(wordId: string, exampleId: string): Promise<void> {
    if (isNative()) return off().then((o) => o.deleteExample(wordId, exampleId))
    return api
      .delete(API_ENDPOINTS.words.example(wordId, exampleId))
      .then((res) => res.data)
  },
}
