import api from '@/lib/axios'
import { API_ENDPOINTS } from '@/config/api'
import { isNative } from '@/lib/platform'
import type { BookSimple, DashboardData, DiscoveryBook } from '@/types'

const off = () => import('@/offline/repo')

/**
 * Dashboard / Watchlist data layer.
 *
 * On web everything is backed by the real API: the dashboard summary (stats,
 * activity heatmap, review queue, per-volume progress) comes from
 * `/api/dashboard`, and discovery/watchlist selectors from `/api/watchlist`.
 * On native the same data is computed locally from the offline SQLite repo.
 */

export const dashboardService = {
  // Native: real data computed from local SQLite progress.
  // Web: real data from the `/api/dashboard` aggregation endpoint.
  getDashboard(): Promise<DashboardData> {
    if (isNative()) return off().then((o) => o.getDashboard())
    return api.get<DashboardData>(API_ENDPOINTS.dashboard.get).then((r) => r.data)
  },

  // ── Real watchlist endpoints ──────────────────────────────────────────────

  /** All books with a per-user `inWatchlist` flag (library/discovery view). */
  getDiscoveryBooks(): Promise<DiscoveryBook[]> {
    if (isNative()) return off().then((o) => o.getDiscovery())
    return api.get<DiscoveryBook[]>(API_ENDPOINTS.watchlist.discovery).then((r) => r.data)
  },

  /** Books in the current user's watchlist, as {id, title} for selectors. */
  getWatchlistBooks(): Promise<BookSimple[]> {
    if (isNative()) return off().then((o) => o.getWatchlistBooks())
    return api.get<BookSimple[]>(API_ENDPOINTS.watchlist.list).then((r) => r.data)
  },

  addToWatchlist(bookId: string): Promise<{ bookId: string }> {
    if (isNative()) return off().then((o) => o.addToWatchlist(bookId))
    return api.post<{ bookId: string }>(API_ENDPOINTS.watchlist.add, { bookId }).then((r) => r.data)
  },

  removeFromWatchlist(bookId: string): Promise<{ bookId: string }> {
    if (isNative()) return off().then((o) => o.removeFromWatchlist(bookId))
    return api.delete<{ bookId: string }>(API_ENDPOINTS.watchlist.remove(bookId)).then((r) => r.data)
  },
}
