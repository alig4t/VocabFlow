import api from '@/lib/axios'
import { API_ENDPOINTS } from '@/config/api'
import { isNative } from '@/lib/platform'
import type { SynonymResult } from '@/types'

const off = () => import('@/offline/repo')

export const synonymService = {
  getSynonyms(wordId: string): Promise<SynonymResult[]> {
    if (isNative()) return off().then((o) => o.getSynonyms(wordId))
    return api
      .get<SynonymResult[]>(API_ENDPOINTS.synonyms.get(wordId))
      .then((res) => res.data)
  },
}
