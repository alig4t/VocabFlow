import api from '@/lib/axios'
import { API_ENDPOINTS } from '@/config/api'
import type { SynonymResult } from '@/types'

export const synonymService = {
  getSynonyms(wordId: string): Promise<SynonymResult[]> {
    return api
      .get<SynonymResult[]>(API_ENDPOINTS.synonyms.get(wordId))
      .then((res) => res.data.data)
  },
}
