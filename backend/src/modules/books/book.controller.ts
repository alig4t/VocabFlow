import { Request, Response } from 'express'
import { BookService } from './book.service'

export class BookController {
  constructor(private readonly bookService: BookService) {}

  // ─── Books ───────────────────────────────────────────────────────────────

  getBooks = async (_req: Request, res: Response): Promise<void> => {
    const books = await this.bookService.getBooks()
    res.json({ success: true, data: books })
  }

  getBooksSimple = async (_req: Request, res: Response): Promise<void> => {
    const books = await this.bookService.getBooksSimple()
    res.json({ success: true, data: books })
  }

  getBook = async (req: Request, res: Response): Promise<void> => {
    const book = await this.bookService.getBook(req.params.id)
    res.json({ success: true, data: book })
  }

  createBook = async (req: Request, res: Response): Promise<void> => {
    const book = await this.bookService.createBook(req.body)
    res.status(201).json({ success: true, data: book })
  }

  updateBook = async (req: Request, res: Response): Promise<void> => {
    const book = await this.bookService.updateBook(req.params.id, req.body)
    res.json({ success: true, data: book })
  }

  deleteBook = async (req: Request, res: Response): Promise<void> => {
    await this.bookService.deleteBook(req.params.id)
    res.json({ success: true, message: 'Book deleted' })
  }

  // ─── Volumes ──────────────────────────────────────────────────────────────

  getVolumes = async (req: Request, res: Response): Promise<void> => {
    const volumes = await this.bookService.getVolumes(req.params.bookId)
    res.json({ success: true, data: volumes })
  }

  getVolumesSimple = async (req: Request, res: Response): Promise<void> => {
    const volumes = await this.bookService.getVolumesSimple(req.params.bookId)
    res.json({ success: true, data: volumes })
  }

  getVolume = async (req: Request, res: Response): Promise<void> => {
    const volume = await this.bookService.getVolume(req.params.volumeId)
    res.json({ success: true, data: volume })
  }

  createVolume = async (req: Request, res: Response): Promise<void> => {
    const volume = await this.bookService.createVolume(req.params.bookId, req.body)
    res.status(201).json({ success: true, data: volume })
  }

  updateVolume = async (req: Request, res: Response): Promise<void> => {
    const volume = await this.bookService.updateVolume(req.params.volumeId, req.body)
    res.json({ success: true, data: volume })
  }

  deleteVolume = async (req: Request, res: Response): Promise<void> => {
    await this.bookService.deleteVolume(req.params.volumeId)
    res.json({ success: true, message: 'Volume deleted' })
  }

  // ─── Lessons ──────────────────────────────────────────────────────────────

  getLessons = async (req: Request, res: Response): Promise<void> => {
    const lessons = await this.bookService.getLessons(req.params.volumeId)
    res.json({ success: true, data: lessons })
  }

  getLessonsSimple = async (req: Request, res: Response): Promise<void> => {
    const lessons = await this.bookService.getLessonsSimple(req.params.volumeId)
    res.json({ success: true, data: lessons })
  }

  createLesson = async (req: Request, res: Response): Promise<void> => {
    const lesson = await this.bookService.createLesson(req.params.volumeId, req.body)
    res.status(201).json({ success: true, data: lesson })
  }

  updateLesson = async (req: Request, res: Response): Promise<void> => {
    const lesson = await this.bookService.updateLesson(req.params.lessonId, req.body)
    res.json({ success: true, data: lesson })
  }

  deleteLesson = async (req: Request, res: Response): Promise<void> => {
    await this.bookService.deleteLesson(req.params.lessonId)
    res.json({ success: true, message: 'Lesson deleted' })
  }
}
