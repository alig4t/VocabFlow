import { Request, Response } from 'express'
import { StatsService } from './stats.service'

export class StatsController {
  constructor(private readonly service: StatsService) {}

  getStats = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.getStats(req.user!.sub)
    res.json({ success: true, data })
  }
}
