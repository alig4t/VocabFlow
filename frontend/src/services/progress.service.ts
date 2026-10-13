import api from "@/lib/axios";
import { API_ENDPOINTS } from "@/config/api";
import { isNative } from "@/lib/platform";
import { subscriptionService } from "./subscription.service";
import type {
  ReviewMode,
  WordStatus,
  ProgressStats,
  WordScopeFilters,
} from "@/types";

const off = () => import("@/offline/repo");

export const progressService = {
  updateWordStatus(
    wordId: string,
    reviewMode: ReviewMode,
    status: WordStatus,
  ): Promise<void> {
    if (isNative())
      return subscriptionService
        .assertAccess()
        .then(() => off())
        .then((o) => o.updateWordStatus(wordId, reviewMode, status));
    return api
      .put(API_ENDPOINTS.progress.update(wordId), { reviewMode, status })
      .then((res) => res.data);
  },

  getStats(filters: WordScopeFilters = {}): Promise<ProgressStats> {
    if (isNative()) return off().then((o) => o.getStats(filters));
    // The API keeps its array response; both platforms expose a map to hooks.
    return api
      .get<Array<ProgressStats[ReviewMode] & { reviewMode: ReviewMode }>>(
        API_ENDPOINTS.progress.stats,
        { params: filters },
      )
      .then(
        (res) =>
          Object.fromEntries(
            res.data.map(({ reviewMode, ...counts }) => [reviewMode, counts]),
          ) as unknown as ProgressStats,
      );
  },

  resetProgress(reviewMode?: ReviewMode): Promise<void> {
    if (isNative())
      return subscriptionService
        .assertAccess()
        .then(() => off())
        .then((o) => o.resetProgress(reviewMode));
    const params: Record<string, string> = {};
    if (reviewMode !== undefined) {
      params.reviewMode = reviewMode;
    }
    return api
      .delete(API_ENDPOINTS.progress.reset, { params })
      .then((res) => res.data);
  },
};
