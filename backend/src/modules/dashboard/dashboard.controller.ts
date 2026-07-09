import { Request, Response } from 'express'
import { DashboardService } from './dashboard.service'

export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  getDashboard = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.getDashboard(req.user!.sub)
    res.json({ success: true, data })
  }
}
