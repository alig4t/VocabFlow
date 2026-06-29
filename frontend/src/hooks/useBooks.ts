import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  bookService,
  type CreateBookData,
  type CreateVolumeData,
  type CreateLessonData,
} from '@/services/book.service'
import type { Book, BookSimple, Volume, VolumeSimple, Lesson, LessonSimple } from '@/types'

// ─── Books ───────────────────────────────────────────────────────────────────

export function useBooks() {
  return useQuery<Book[], Error>({
    queryKey: ['books'],
    queryFn: () => bookService.getBooks(),
  })
}

export function useBooksSimple() {
  return useQuery<BookSimple[], Error>({
    queryKey: ['books', 'simple'],
    queryFn: () => bookService.getBooksSimple(),
  })
}

export function useBook(id: string) {
  return useQuery<Book, Error>({
    queryKey: ['books', id],
    queryFn: () => bookService.getBook(id),
    enabled: Boolean(id),
  })
}

export function useCreateBook() {
  const queryClient = useQueryClient()
  return useMutation<Book, Error, CreateBookData>({
    mutationFn: (data) => bookService.createBook(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['books'] }),
  })
}

export function useUpdateBook() {
  const queryClient = useQueryClient()
  return useMutation<Book, Error, { id: string; data: Partial<CreateBookData> }>({
    mutationFn: ({ id, data }) => bookService.updateBook(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['books'] }),
  })
}

export function useDeleteBook() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (id) => bookService.deleteBook(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['books'] }),
  })
}

// ─── Volumes ─────────────────────────────────────────────────────────────────

export function useVolumes(bookId: string) {
  return useQuery<Volume[], Error>({
    queryKey: ['volumes', bookId],
    queryFn: () => bookService.getVolumes(bookId),
    enabled: Boolean(bookId),
  })
}

export function useVolumesSimple(bookId: string) {
  return useQuery<VolumeSimple[], Error>({
    queryKey: ['volumes', bookId, 'simple'],
    queryFn: () => bookService.getVolumesSimple(bookId),
    enabled: Boolean(bookId),
  })
}

export function useCreateVolume() {
  const queryClient = useQueryClient()
  return useMutation<Volume, Error, { bookId: string; data: CreateVolumeData }>({
    mutationFn: ({ bookId, data }) => bookService.createVolume(bookId, data),
    onSuccess: (_v, { bookId }) => queryClient.invalidateQueries({ queryKey: ['volumes', bookId] }),
  })
}

export function useUpdateVolume() {
  const queryClient = useQueryClient()
  return useMutation<
    Volume,
    Error,
    { bookId: string; volumeId: string; data: Partial<CreateVolumeData> }
  >({
    mutationFn: ({ bookId, volumeId, data }) =>
      bookService.updateVolume(bookId, volumeId, data),
    onSuccess: (_v, { bookId }) => queryClient.invalidateQueries({ queryKey: ['volumes', bookId] }),
  })
}

export function useDeleteVolume() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, { bookId: string; volumeId: string }>({
    mutationFn: ({ bookId, volumeId }) => bookService.deleteVolume(bookId, volumeId),
    onSuccess: (_v, { bookId }) => queryClient.invalidateQueries({ queryKey: ['volumes', bookId] }),
  })
}

// ─── Lessons ─────────────────────────────────────────────────────────────────

export function useLessons(bookId: string, volumeId: string) {
  return useQuery<Lesson[], Error>({
    queryKey: ['lessons', bookId, volumeId],
    queryFn: () => bookService.getLessons(bookId, volumeId),
    enabled: Boolean(bookId) && Boolean(volumeId),
  })
}

export function useLessonsSimple(bookId: string, volumeId: string) {
  return useQuery<LessonSimple[], Error>({
    queryKey: ['lessons', bookId, volumeId, 'simple'],
    queryFn: () => bookService.getLessonsSimple(bookId, volumeId),
    enabled: Boolean(bookId) && Boolean(volumeId),
  })
}

export function useCreateLesson() {
  const queryClient = useQueryClient()
  return useMutation<Lesson, Error, { bookId: string; volumeId: string; data: CreateLessonData }>({
    mutationFn: ({ bookId, volumeId, data }) =>
      bookService.createLesson(bookId, volumeId, data),
    onSuccess: (_v, { bookId, volumeId }) =>
      queryClient.invalidateQueries({ queryKey: ['lessons', bookId, volumeId] }),
  })
}

export function useUpdateLesson() {
  const queryClient = useQueryClient()
  return useMutation<
    Lesson,
    Error,
    { bookId: string; volumeId: string; lessonId: string; data: Partial<CreateLessonData> }
  >({
    mutationFn: ({ bookId, volumeId, lessonId, data }) =>
      bookService.updateLesson(bookId, volumeId, lessonId, data),
    onSuccess: (_v, { bookId, volumeId }) =>
      queryClient.invalidateQueries({ queryKey: ['lessons', bookId, volumeId] }),
  })
}

export function useDeleteLesson() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, { bookId: string; volumeId: string; lessonId: string }>({
    mutationFn: ({ bookId, volumeId, lessonId }) =>
      bookService.deleteLesson(bookId, volumeId, lessonId),
    onSuccess: (_v, { bookId, volumeId }) =>
      queryClient.invalidateQueries({ queryKey: ['lessons', bookId, volumeId] }),
  })
}
