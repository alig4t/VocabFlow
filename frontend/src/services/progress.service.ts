import api from '@/lib/axios'
import { API_ENDPOINTS } from '@/config/api'
import { isNative } from '@/lib/platform'
import type { ReviewMode, WordStatus, ProgressStats } from '@/types'

const off = () => import('@/offline/repo')

export const progressService = {
  updateWordStatus(
    wordId: string,
    reviewMode: ReviewMode,
    status: WordStatus,
  ): Promise<void> {
    if (isNative()) return off().then((o) => o.updateWordStatus(wordId, reviewMode, status))
    return api
      .put(API_ENDPOINTS.progress.update(wordId), { reviewMode, status })
      .then((res) => res.data)
  },

  getStats(): Promise<ProgressStats> {
    if (isNative()) return off().then((o) => o.getStats())
    return api.get(API_ENDPOINTS.progress.stats).then((res) => res.data)
  },

  resetProgress(reviewMode?: ReviewMode): Promise<void> {
    if (isNative()) return off().then((o) => o.resetProgress(reviewMode))
    const params: Record<string, string> = {}
    if (reviewMode !== undefined) {
      params.reviewMode = reviewMode
    }
    return api
      .delete(API_ENDPOINTS.progress.reset, { params })
      .then((res) => res.data)
  },
}
