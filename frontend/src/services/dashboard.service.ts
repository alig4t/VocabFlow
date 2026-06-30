import type {
  DashboardData,
  DiscoveryBook,
  HeatmapDay,
  WatchlistBook,
} from '@/types'

/**
 * Dashboard data layer for the personalized Watchlist feature (feature.txt).
 *
 * The backend endpoints below do not exist yet, so each method resolves
 * deterministic MOCK data with the exact shape the real API should return.
 * When the backend lands, swap each `return Promise.resolve(mock…)` for the
 * commented `api.get(...)` call — no component changes required.
 *
 *   GET  /user/dashboard          → getDashboard()
 *   GET  /books                   → getDiscoveryBooks()
 *   POST /watchlist/add           → addToWatchlist(bookId)
 *   DELETE /watchlist/:bookId     → removeFromWatchlist(bookId)
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

const mockDiscovery: DiscoveryBook[] = [
  {
    id: 'bk_oxford',
    title: '۴۰۰۰ لغت ضروری انگلیسی',
    description: 'مجموعه شش‌جلدی واژگان پرکاربرد برای تسلط بر زبان انگلیسی.',
    totalWords: 4000,
    inWatchlist: true,
  },
  {
    id: 'bk_ielts',
    title: 'واژگان آیلتس ضروری',
    description: 'لغات کلیدی برای آمادگی آزمون آیلتس آکادمیک و جنرال.',
    totalWords: 1200,
    inWatchlist: true,
  },
  {
    id: 'bk_idioms',
    title: 'اصطلاحات رایج انگلیسی',
    description: 'اصطلاحات و عبارات روزمره برای مکالمه طبیعی‌تر.',
    totalWords: 600,
    inWatchlist: true,
  },
  {
    id: 'bk_toefl',
    title: 'واژگان تافل',
    description: 'واژگان دانشگاهی و علمی موردنیاز آزمون تافل.',
    totalWords: 1500,
    inWatchlist: false,
  },
  {
    id: 'bk_business',
    title: 'انگلیسی تجاری',
    description: 'اصطلاحات حرفه‌ای محیط کار، جلسات و مکاتبات اداری.',
    totalWords: 800,
    inWatchlist: false,
  },
  {
    id: 'bk_phrasal',
    title: 'افعال عبارتی (Phrasal Verbs)',
    description: 'پرکاربردترین افعال دوکلمه‌ای انگلیسی با مثال.',
    totalWords: 500,
    inWatchlist: false,
  },
]

// Simulate network latency so loading/skeleton states are visible in dev.
function delay<T>(value: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

export const dashboardService = {
  getDashboard(): Promise<DashboardData> {
    // return api.get(API_ENDPOINTS.user.dashboard).then((res) => res.data)
    return delay(mockDashboard)
  },

  getDiscoveryBooks(): Promise<DiscoveryBook[]> {
    // return api.get(API_ENDPOINTS.books.list).then((res) => res.data)
    return delay(mockDiscovery)
  },

  addToWatchlist(bookId: string): Promise<{ bookId: string }> {
    // return api.post(API_ENDPOINTS.watchlist.add, { bookId }).then((res) => res.data)
    return delay({ bookId }, 250)
  },

  removeFromWatchlist(bookId: string): Promise<{ bookId: string }> {
    // return api.delete(API_ENDPOINTS.watchlist.remove(bookId)).then((res) => res.data)
    return delay({ bookId }, 250)
  },
}
