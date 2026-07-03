import { NotFoundError } from '../../shared/errors'
import { WatchlistRepository } from './watchlist.repository'

export interface DiscoveryBook {
  id: string
  title: string
  description?: string
  coverImage?: string
  totalWords: number
  inWatchlist: boolean
}

export class WatchlistService {
  constructor(private readonly repo: WatchlistRepository) {}

  /** Watchlisted books as {id, title} — used by the review-page book selector. */
  async getWatchlistBooks(userId: string) {
    return this.repo.findWatchlistBooks(userId)
  }

  /** All books with a per-user `inWatchlist` flag and word counts (library view). */
  async getDiscovery(userId: string): Promise<DiscoveryBook[]> {
    const [books, watchedIds] = await Promise.all([
      this.repo.findAllBooks(),
      this.repo.findBookIdsByUser(userId),
    ])
    const watched = new Set(watchedIds)

    const counts = await Promise.all(books.map((b) => this.repo.countWordsForBook(b.id)))

    return books.map((b, i) => ({
      id: b.id,
      title: b.title,
      description: b.description ?? undefined,
      coverImage: b.coverImage ?? undefined,
      totalWords: counts[i],
      inWatchlist: watched.has(b.id),
    }))
  }

  async add(userId: string, bookId: string): Promise<{ bookId: string }> {
    const exists = await this.repo.bookExists(bookId)
    if (!exists) throw new NotFoundError('Book')
    await this.repo.add(userId, bookId)
    return { bookId }
  }

  async remove(userId: string, bookId: string): Promise<{ bookId: string }> {
    await this.repo.remove(userId, bookId)
    return { bookId }
  }
}
