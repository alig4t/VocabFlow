import { Request, Response } from 'express'
import { ReviewMode, WordStatus } from '../../shared/types'
import { WordService } from './word.service'
import { WordFilters } from '../../shared/types'

export class WordController {
  constructor(private readonly wordService: WordService) {}

  getWords = async (req: Request, res: Response): Promise<void> => {
    const page = req.query.page ? Number(req.query.page) : 1
    const limit = req.query.limit ? Number(req.query.limit) : 20
    const chapter = req.query.chapter ? Number(req.query.chapter) : undefined
    const unit = req.query.unit ? Number(req.query.unit) : undefined
    const search = req.query.search as string | undefined
    const sort = req.query.sort as WordFilters['sort'] | undefined
    const order = req.query.order as WordFilters['order'] | undefined
    const status = req.query.status as WordStatus | undefined
    const mode = req.query.mode as ReviewMode | undefined

    const filters: WordFilters = {
      page,
      limit,
      ...(chapter !== undefined && { chapter }),
      ...(unit !== undefined && { unit }),
      ...(search && { search }),
      ...(sort && { sort }),
      ...(order && { order }),
      ...(status && { status }),
      ...(mode && { mode }),
    }

    const userId = req.user?.sub

    const { words, total } = await this.wordService.getWords(filters, userId)

    res.json({
      success: true,
      data: {
        data: words,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    })
  }

  getWord = async (req: Request, res: Response): Promise<void> => {
    const word = await this.wordService.getWord(req.params.id)
    res.json({ success: true, data: word })
  }

  createWord = async (req: Request, res: Response): Promise<void> => {
    const word = await this.wordService.createWord(req.body)
    res.status(201).json({ success: true, data: word })
  }

  updateWord = async (req: Request, res: Response): Promise<void> => {
    const word = await this.wordService.updateWord(req.params.id, req.body)
    res.json({ success: true, data: word })
  }

  deleteWord = async (req: Request, res: Response): Promise<void> => {
    await this.wordService.deleteWord(req.params.id)
    res.json({ success: true, message: 'Word deleted successfully' })
  }

  addExample = async (req: Request, res: Response): Promise<void> => {
    const example = await this.wordService.addExample(req.params.id, req.body)
    res.status(201).json({ success: true, data: example })
  }

  updateExample = async (req: Request, res: Response): Promise<void> => {
    const example = await this.wordService.updateExample(
      req.params.exampleId,
      req.body,
    )
    res.json({ success: true, data: example })
  }

  deleteExample = async (req: Request, res: Response): Promise<void> => {
    await this.wordService.deleteExample(req.params.exampleId)
    res.json({ success: true, message: 'Example deleted successfully' })
  }

  getModules = async (_req: Request, res: Response): Promise<void> => {
    const modules = await this.wordService.getModules()
    res.json({ success: true, data: modules })
  }
}
