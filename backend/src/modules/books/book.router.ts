import { Router } from 'express'
import { authenticate } from '../../shared/middleware/auth.middleware'
import { requireAdmin } from '../../shared/middleware/admin.middleware'
import { validate } from '../../shared/middleware/validate.middleware'
import {
  createBookSchema,
  updateBookSchema,
  createVolumeSchema,
  updateVolumeSchema,
  createLessonSchema,
  updateLessonSchema,
} from './dto/book.dto'
import { BookRepository } from './book.repository'
import { BookService } from './book.service'
import { BookController } from './book.controller'

const bookRepository = new BookRepository()
const bookService = new BookService(bookRepository)
const bookController = new BookController(bookService)

export const bookRouter = Router()

// ─── Books ────────────────────────────────────────────────────────────────────
bookRouter.get('/', bookController.getBooks)
bookRouter.get('/simple', bookController.getBooksSimple)
bookRouter.get('/:id', bookController.getBook)
bookRouter.post('/', authenticate, requireAdmin, validate(createBookSchema), bookController.createBook)
bookRouter.put('/:id', authenticate, requireAdmin, validate(updateBookSchema), bookController.updateBook)
bookRouter.delete('/:id', authenticate, requireAdmin, bookController.deleteBook)

// ─── Volumes ──────────────────────────────────────────────────────────────────
bookRouter.get('/:bookId/volumes', bookController.getVolumes)
bookRouter.get('/:bookId/volumes/simple', bookController.getVolumesSimple)
bookRouter.get('/:bookId/volumes/:volumeId', bookController.getVolume)
bookRouter.post('/:bookId/volumes', authenticate, requireAdmin, validate(createVolumeSchema), bookController.createVolume)
bookRouter.put('/:bookId/volumes/:volumeId', authenticate, requireAdmin, validate(updateVolumeSchema), bookController.updateVolume)
bookRouter.delete('/:bookId/volumes/:volumeId', authenticate, requireAdmin, bookController.deleteVolume)

// ─── Lessons ──────────────────────────────────────────────────────────────────
bookRouter.get('/:bookId/volumes/:volumeId/lessons', bookController.getLessons)
bookRouter.get('/:bookId/volumes/:volumeId/lessons/simple', bookController.getLessonsSimple)
bookRouter.post('/:bookId/volumes/:volumeId/lessons', authenticate, requireAdmin, validate(createLessonSchema), bookController.createLesson)
bookRouter.put('/:bookId/volumes/:volumeId/lessons/:lessonId', authenticate, requireAdmin, validate(updateLessonSchema), bookController.updateLesson)
bookRouter.delete('/:bookId/volumes/:volumeId/lessons/:lessonId', authenticate, requireAdmin, bookController.deleteLesson)
