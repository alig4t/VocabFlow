import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export class WatchlistRepository {
  /**
   * Book ids the user is actively learning — i.e. books that have at least one
   * active LearningPlan. The learning list is now driven by volume-level plans
   * (the legacy book-level watchlist table is retained but no longer the source
   * of truth for "in my list").
   */
  async findBookIdsByUser(userId: string): Promise<string[]> {
    const plans = await prisma.learningPlan.findMany({
      where: { userId, isActive: true },
      select: { volume: { select: { bookId: true } } },
    })
    return [...new Set(plans.map((p) => p.volume.bookId))]
  }

  /** Books with an active plan, as simple {id, title} pairs, ordered by title. */
  async findWatchlistBooks(userId: string) {
    const books = await prisma.book.findMany({
      where: { volumes: { some: { plans: { some: { userId, isActive: true } } } } },
      select: { id: true, title: true },
      orderBy: { title: 'asc' },
    })
    return books
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
