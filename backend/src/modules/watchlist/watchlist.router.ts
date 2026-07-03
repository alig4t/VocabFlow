import { Router } from 'express'
import { authenticate } from '../../shared/middleware/auth.middleware'
import { WatchlistRepository } from './watchlist.repository'
import { WatchlistService } from './watchlist.service'
import { WatchlistController } from './watchlist.controller'

const watchlistRepository = new WatchlistRepository()
const watchlistService = new WatchlistService(watchlistRepository)
const watchlistController = new WatchlistController(watchlistService)

export const watchlistRouter = Router()

// All watchlist routes are per-user and require authentication.
watchlistRouter.use(authenticate)

watchlistRouter.get('/', watchlistController.getWatchlist)
watchlistRouter.get('/discovery', watchlistController.getDiscovery)
watchlistRouter.post('/', watchlistController.add)
watchlistRouter.delete('/:bookId', watchlistController.remove)
