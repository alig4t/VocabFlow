import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export class WatchlistRepository {
  /** Book ids the user has in their watchlist. */
  async findBookIdsByUser(userId: string): Promise<string[]> {
    const items = await prisma.watchlistItem.findMany({
      where: { userId },
      select: { bookId: true },
    })
    return items.map((i) => i.bookId)
  }

  /** Watchlisted books as simple {id, title} pairs, ordered by title. */
  async findWatchlistBooks(userId: string) {
    const items = await prisma.watchlistItem.findMany({
      where: { userId },
      include: { book: { select: { id: true, title: true } } },
      orderBy: { book: { title: 'asc' } },
    })
    return items.map((i) => i.book)
  }

  /** All books ordered by title (for the discovery/library view). */
  async findAllBooks() {
    return prisma.book.findMany({
      orderBy: { title: 'asc' },
      select: { id: true, title: true, description: true, coverImage: true },
    })
  }

  /** Number of words linked to a book via its lessons. */
  async countWordsForBook(bookId: string): Promise<number> {
    return prisma.word.count({ where: { lesson: { volume: { bookId } } } })
  }

  async bookExists(bookId: string): Promise<boolean> {
    const book = await prisma.book.findUnique({ where: { id: bookId }, select: { id: true } })
    return book !== null
  }

  /** Idempotent add — no-op if the pair already exists. */
  async add(userId: string, bookId: string) {
    return prisma.watchlistItem.upsert({
      where: { userId_bookId: { userId, bookId } },
      create: { userId, bookId },
      update: {},
    })
  }

  /** Idempotent remove — no error if the pair does not exist. */
  async remove(userId: string, bookId: string) {
    return prisma.watchlistItem.deleteMany({ where: { userId, bookId } })
  }
}
