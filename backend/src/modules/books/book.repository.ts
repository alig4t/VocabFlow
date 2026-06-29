import { PrismaClient } from '@prisma/client'
import type {
  CreateBookDto,
  UpdateBookDto,
  CreateVolumeDto,
  UpdateVolumeDto,
  CreateLessonDto,
  UpdateLessonDto,
} from './dto/book.dto'

const prisma = new PrismaClient()

export class BookRepository {
  // ─── Books ───────────────────────────────────────────────────────────────

  async findAllBooks() {
    return prisma.book.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        _count: { select: { volumes: true } },
      },
    })
  }

  async findBookById(id: string) {
    return prisma.book.findUnique({
      where: { id },
      include: {
        volumes: {
          orderBy: { volumeNumber: 'asc' },
          include: {
            _count: { select: { lessons: true } },
          },
        },
        _count: { select: { volumes: true } },
      },
    })
  }

  async createBook(data: CreateBookDto) {
    return prisma.book.create({ data })
  }

  async updateBook(id: string, data: UpdateBookDto) {
    return prisma.book.update({ where: { id }, data })
  }

  async deleteBook(id: string) {
    return prisma.book.delete({ where: { id } })
  }

  // ─── Volumes ──────────────────────────────────────────────────────────────

  async findVolumesByBook(bookId: string) {
    return prisma.volume.findMany({
      where: { bookId },
      orderBy: { volumeNumber: 'asc' },
      include: {
        _count: { select: { lessons: true } },
      },
    })
  }

  async findVolumeById(id: string) {
    return prisma.volume.findUnique({
      where: { id },
      include: {
        lessons: {
          orderBy: { lessonNumber: 'asc' },
          include: { _count: { select: { words: true } } },
        },
      },
    })
  }

  async createVolume(bookId: string, data: CreateVolumeDto) {
    return prisma.volume.create({ data: { ...data, bookId } })
  }

  async updateVolume(id: string, data: UpdateVolumeDto) {
    return prisma.volume.update({ where: { id }, data })
  }

  async deleteVolume(id: string) {
    return prisma.volume.delete({ where: { id } })
  }

  // ─── Lessons ──────────────────────────────────────────────────────────────

  async findLessonsByVolume(volumeId: string) {
    return prisma.lesson.findMany({
      where: { volumeId },
      orderBy: { lessonNumber: 'asc' },
      include: {
        _count: { select: { words: true } },
      },
    })
  }

  async findLessonById(id: string) {
    return prisma.lesson.findUnique({ where: { id } })
  }

  async createLesson(volumeId: string, data: CreateLessonDto) {
    return prisma.lesson.create({ data: { ...data, volumeId } })
  }

  async updateLesson(id: string, data: UpdateLessonDto) {
    return prisma.lesson.update({ where: { id }, data })
  }

  async deleteLesson(id: string) {
    return prisma.lesson.delete({ where: { id } })
  }

  // ─── For word form dropdowns ───────────────────────────────────────────────

  async findAllBooksSimple() {
    return prisma.book.findMany({
      orderBy: { title: 'asc' },
      select: { id: true, title: true },
    })
  }

  async findVolumesSimple(bookId: string) {
    return prisma.volume.findMany({
      where: { bookId },
      orderBy: { volumeNumber: 'asc' },
      select: { id: true, volumeNumber: true, title: true },
    })
  }

  async findLessonsSimple(volumeId: string) {
    return prisma.lesson.findMany({
      where: { volumeId },
      orderBy: { lessonNumber: 'asc' },
      select: { id: true, lessonNumber: true, title: true },
    })
  }
}
