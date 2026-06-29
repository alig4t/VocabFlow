import { NotFoundError } from '../../shared/errors'
import { BookRepository } from './book.repository'
import type {
  CreateBookDto,
  UpdateBookDto,
  CreateVolumeDto,
  UpdateVolumeDto,
  CreateLessonDto,
  UpdateLessonDto,
} from './dto/book.dto'

export class BookService {
  constructor(private readonly repo: BookRepository) {}

  // ─── Books ───────────────────────────────────────────────────────────────

  async getBooks() {
    return this.repo.findAllBooks()
  }

  async getBook(id: string) {
    const book = await this.repo.findBookById(id)
    if (!book) throw new NotFoundError('Book')
    return book
  }

  async createBook(dto: CreateBookDto) {
    return this.repo.createBook(dto)
  }

  async updateBook(id: string, dto: UpdateBookDto) {
    const existing = await this.repo.findBookById(id)
    if (!existing) throw new NotFoundError('Book')
    return this.repo.updateBook(id, dto)
  }

  async deleteBook(id: string) {
    const existing = await this.repo.findBookById(id)
    if (!existing) throw new NotFoundError('Book')
    return this.repo.deleteBook(id)
  }

  // ─── Volumes ──────────────────────────────────────────────────────────────

  async getVolumes(bookId: string) {
    return this.repo.findVolumesByBook(bookId)
  }

  async getVolume(id: string) {
    const volume = await this.repo.findVolumeById(id)
    if (!volume) throw new NotFoundError('Volume')
    return volume
  }

  async createVolume(bookId: string, dto: CreateVolumeDto) {
    return this.repo.createVolume(bookId, dto)
  }

  async updateVolume(id: string, dto: UpdateVolumeDto) {
    const existing = await this.repo.findVolumeById(id)
    if (!existing) throw new NotFoundError('Volume')
    return this.repo.updateVolume(id, dto)
  }

  async deleteVolume(id: string) {
    const existing = await this.repo.findVolumeById(id)
    if (!existing) throw new NotFoundError('Volume')
    return this.repo.deleteVolume(id)
  }

  // ─── Lessons ──────────────────────────────────────────────────────────────

  async getLessons(volumeId: string) {
    return this.repo.findLessonsByVolume(volumeId)
  }

  async createLesson(volumeId: string, dto: CreateLessonDto) {
    return this.repo.createLesson(volumeId, dto)
  }

  async updateLesson(id: string, dto: UpdateLessonDto) {
    const existing = await this.repo.findLessonById(id)
    if (!existing) throw new NotFoundError('Lesson')
    return this.repo.updateLesson(id, dto)
  }

  async deleteLesson(id: string) {
    const existing = await this.repo.findLessonById(id)
    if (!existing) throw new NotFoundError('Lesson')
    return this.repo.deleteLesson(id)
  }

  // ─── Dropdowns ────────────────────────────────────────────────────────────

  async getBooksSimple() {
    return this.repo.findAllBooksSimple()
  }

  async getVolumesSimple(bookId: string) {
    return this.repo.findVolumesSimple(bookId)
  }

  async getLessonsSimple(volumeId: string) {
    return this.repo.findLessonsSimple(volumeId)
  }
}
