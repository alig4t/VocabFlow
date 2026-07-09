import { Router } from 'express'
import { authenticate } from '../../shared/middleware/auth.middleware'
import { SettingsRepository } from './settings.repository'
import { SettingsService } from './settings.service'
import { SettingsController } from './settings.controller'

const settingsRepository = new SettingsRepository()
const settingsService = new SettingsService(settingsRepository)
const settingsController = new SettingsController(settingsService)

export const settingsRouter = Router()

settingsRouter.use(authenticate)

settingsRouter.get('/', settingsController.get)
settingsRouter.put('/', settingsController.update)
