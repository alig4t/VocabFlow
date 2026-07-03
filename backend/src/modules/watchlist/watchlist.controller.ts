import { Request, Response } from 'express'
import { WatchlistService } from './watchlist.service'
import { ValidationError } from '../../shared/errors'

export class WatchlistController {
  constructor(private readonly watchlistService: WatchlistService) {}

  getWatchlist = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.sub
    const books = await this.watchlistService.getWatchlistBooks(userId)
    res.json({ success: true, data: books })
  }

  getDiscovery = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.sub
    const books = await this.watchlistService.getDiscovery(userId)
    res.json({ success: true, data: books })
  }

  add = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.sub
    const bookId = req.body?.bookId
    if (!bookId || typeof bookId !== 'string') {
      throw new ValidationError('bookId is required')
    }
    const result = await this.watchlistService.add(userId, bookId)
    res.status(201).json({ success: true, data: result })
  }

  remove = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.sub
    const result = await this.watchlistService.remove(userId, req.params.bookId)
    res.json({ success: true, data: result })
  }
}
