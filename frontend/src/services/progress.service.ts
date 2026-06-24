import api from '@/lib/axios'
import { API_ENDPOINTS } from '@/config/api'
import type { ReviewMode, WordStatus, ProgressStats } from '@/types'

export const progressService = {
  updateWordStatus(
    wordId: string,
    reviewMode: ReviewMode,
    status: WordStatus,
  ): Promise<void> {
    return api
      .put(API_ENDPOINTS.progress.update(wordId), { reviewMode, status })
      .then((res) => res.data)
  },

  getStats(): Promise<ProgressStats> {
    return api.get<ProgressStats>(API_ENDPOINTS.progress.stats).then((res) => res.data)
  },

  resetProgress(reviewMode?: ReviewMode): Promise<void> {
    const params: Record<string, string> = {}
    if (reviewMode !== undefined) {
      params.reviewMode = reviewMode
    }
    return api
      .delete(API_ENDPOINTS.progress.reset, { params })
      .then((res) => res.data)
  },
}
