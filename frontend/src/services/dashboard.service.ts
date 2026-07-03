import api from '@/lib/axios'
import { API_ENDPOINTS } from '@/config/api'
import type {
  BookSimple,
  DashboardData,
  DiscoveryBook,
  HeatmapDay,
  WatchlistBook,
} from '@/types'

/**
 * Dashboard / Watchlist data layer.
 *
 * The watchlist (discovery list, add/remove, and the user's watchlisted books)
 * is now backed by the real `/api/watchlist` endpoints. The dashboard summary
 * (stats, activity heatmap, review queue) is still served from deterministic
 * MOCK data — those metrics require per-day activity tracking that the backend
 * does not model yet.
 */

// ── Deterministic helpers (stable across renders, no Math.random) ──────────────

function pseudo(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

/** Last `n` days of activity, oldest → newest, with a believable rhythm. */
function buildHeatmap(n: number): HeatmapDay[] {
  const days: HeatmapDay[] = []
  for (let i = n - 1; i >= 0; i--) {
    const r = pseudo(i + 1)
    // Quieter on ~30% of days, heavier in recent weeks.
    const base = r < 0.3 ? 0 : Math.round(r * 18)
    const recencyBoost = i < 21 ? Math.round(pseudo(i + 99) * 6) : 0
    days.push({ date: isoDaysAgo(i), count: Math.max(0, base + recencyBoost) })
  }
  return days
}

// ── Mock dataset ───────────────────────────────────────────────────────────────

const mockWatchlist: WatchlistBook[] = [
  {
    id: 'wl_1',
    bookId: 'bk_oxford',
    title: '۴۰۰۰ لغت ضروری انگلیسی',
    totalWords: 4000,
    knownWords: 2080,
    unknownWords: 640,
    notReadWords: 1280,
    reviewedToday: 24,
    lastStudiedAt: isoDaysAgo(0),
    dueCount: 20,
    estimatedDays: 38,
  },
  {
    id: 'wl_2',
    bookId: 'bk_ielts',
    title: 'واژگان آیلتس ضروری',
    totalWords: 1200,
    knownWords: 360,
    unknownWords: 180,
    notReadWords: 660,
    reviewedToday: 12,
    lastStudiedAt: isoDaysAgo(1),
    dueCount: 15,
    estimatedDays: 52,
  },
  {
    id: 'wl_3',
    bookId: 'bk_idioms',
    title: 'اصطلاحات رایج انگلیسی',
    totalWords: 600,
    knownWords: 510,
    unknownWords: 48,
    notReadWords: 42,
    reviewedToday: 8,
    lastStudiedAt: isoDaysAgo(3),
    dueCount: 10,
    estimatedDays: 9,
  },
]

const mockDashboard: DashboardData = {
  stats: {
    watchlistCount: mockWatchlist.length,
    totalWordsLearned: mockWatchlist.reduce((s, b) => s + b.knownWords, 0),
    reviewsToday: mockWatchlist.reduce((s, b) => s + b.reviewedToday, 0),
    currentStreak: 7,
    avgStudyMinutes: 23,
    accuracyRate: 86,
  },
  watchlist: mockWatchlist,
  heatmap: buildHeatmap(126),
  queue: mockWatchlist
    .filter((b) => b.dueCount > 0)
    .map((b) => ({ bookId: b.bookId, title: b.title, dueCount: b.dueCount })),
}

// Simulate network latency so loading/skeleton states are visible in dev.
function delay<T>(value: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

export const dashboardService = {
  // Still mock — dashboard metrics need per-day activity tracking (out of scope).
  getDashboard(): Promise<DashboardData> {
    return delay(mockDashboard)
  },

  // ── Real watchlist endpoints ──────────────────────────────────────────────

  /** All books with a per-user `inWatchlist` flag (library/discovery view). */
  getDiscoveryBooks(): Promise<DiscoveryBook[]> {
    return api.get<DiscoveryBook[]>(API_ENDPOINTS.watchlist.discovery).then((r) => r.data)
  },

  /** Books in the current user's watchlist, as {id, title} for selectors. */
  getWatchlistBooks(): Promise<BookSimple[]> {
    return api.get<BookSimple[]>(API_ENDPOINTS.watchlist.list).then((r) => r.data)
  },

  addToWatchlist(bookId: string): Promise<{ bookId: string }> {
    return api.post<{ bookId: string }>(API_ENDPOINTS.watchlist.add, { bookId }).then((r) => r.data)
  },

  removeFromWatchlist(bookId: string): Promise<{ bookId: string }> {
    return api.delete<{ bookId: string }>(API_ENDPOINTS.watchlist.remove(bookId)).then((r) => r.data)
  },
}
