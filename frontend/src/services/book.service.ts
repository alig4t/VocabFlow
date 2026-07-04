import api from '@/lib/axios'
import { API_ENDPOINTS } from '@/config/api'
import { isNative } from '@/lib/platform'
import type { Book, BookSimple, Volume, VolumeSimple, Lesson, LessonSimple } from '@/types'

const off = () => import('@/offline/repo')

export interface CreateBookData {
  title: string
  description?: string
  coverImage?: string
}

export interface CreateVolumeData {
  volumeNumber: number
  title?: string
}

export interface CreateLessonData {
  lessonNumber: number
  title?: string
}

export const bookService = {
  // ─── Books ───────────────────────────────────────────────────────────────

  getBooks(): Promise<Book[]> {
    return api.get<Book[]>(API_ENDPOINTS.books.list).then((r) => r.data)
  },

  getBooksSimple(): Promise<BookSimple[]> {
    if (isNative()) return off().then((o) => o.getBooksSimple())
    return api.get<BookSimple[]>(API_ENDPOINTS.books.simple).then((r) => r.data)
  },

  getBook(id: string): Promise<Book> {
    return api.get<Book>(API_ENDPOINTS.books.detail(id)).then((r) => r.data)
  },

  createBook(data: CreateBookData): Promise<Book> {
    return api.post<Book>(API_ENDPOINTS.books.list, data).then((r) => r.data)
  },

  updateBook(id: string, data: Partial<CreateBookData>): Promise<Book> {
    return api.put<Book>(API_ENDPOINTS.books.detail(id), data).then((r) => r.data)
  },

  deleteBook(id: string): Promise<void> {
    return api.delete(API_ENDPOINTS.books.detail(id)).then((r) => r.data)
  },

  // ─── Volumes ──────────────────────────────────────────────────────────────

  getVolumes(bookId: string): Promise<Volume[]> {
    return api.get<Volume[]>(API_ENDPOINTS.books.volumes(bookId)).then((r) => r.data)
  },

  getVolumesSimple(bookId: string): Promise<VolumeSimple[]> {
    if (isNative()) return off().then((o) => o.getVolumesSimple(bookId))
    return api.get<VolumeSimple[]>(API_ENDPOINTS.books.volumesSimple(bookId)).then((r) => r.data)
  },

  createVolume(bookId: string, data: CreateVolumeData): Promise<Volume> {
    return api.post<Volume>(API_ENDPOINTS.books.volumes(bookId), data).then((r) => r.data)
  },

  updateVolume(bookId: string, volumeId: string, data: Partial<CreateVolumeData>): Promise<Volume> {
    return api
      .put<Volume>(API_ENDPOINTS.books.volume(bookId, volumeId), data)
      .then((r) => r.data)
  },

  deleteVolume(bookId: string, volumeId: string): Promise<void> {
    return api.delete(API_ENDPOINTS.books.volume(bookId, volumeId)).then((r) => r.data)
  },

  // ─── Lessons ──────────────────────────────────────────────────────────────

  getLessons(bookId: string, volumeId: string): Promise<Lesson[]> {
    return api.get<Lesson[]>(API_ENDPOINTS.books.lessons(bookId, volumeId)).then((r) => r.data)
  },

  getLessonsSimple(bookId: string, volumeId: string): Promise<LessonSimple[]> {
    if (isNative()) return off().then((o) => o.getLessonsSimple(volumeId))
    return api
      .get<LessonSimple[]>(API_ENDPOINTS.books.lessonsSimple(bookId, volumeId))
      .then((r) => r.data)
  },

  createLesson(bookId: string, volumeId: string, data: CreateLessonData): Promise<Lesson> {
    return api
      .post<Lesson>(API_ENDPOINTS.books.lessons(bookId, volumeId), data)
      .then((r) => r.data)
  },

  updateLesson(
    bookId: string,
    volumeId: string,
    lessonId: string,
    data: Partial<CreateLessonData>,
  ): Promise<Lesson> {
    return api
      .put<Lesson>(API_ENDPOINTS.books.lesson(bookId, volumeId, lessonId), data)
      .then((r) => r.data)
  },

  deleteLesson(bookId: string, volumeId: string, lessonId: string): Promise<void> {
    return api
      .delete(API_ENDPOINTS.books.lesson(bookId, volumeId, lessonId))
      .then((r) => r.data)
  },
}
