import { Router } from 'express'
import { authenticate } from '../../shared/middleware/auth.middleware'
import { requireAdmin } from '../../shared/middleware/admin.middleware'
import { getMe, updateProfile, changePassword, listUsers } from './user.controller'

export const userRouter = Router()

// Admin: list all users
userRouter.get('/', authenticate, requireAdmin, listUsers)

userRouter.get('/me', authenticate, getMe)
userRouter.put('/me', authenticate, updateProfile)
userRouter.put('/me/password', authenticate, changePassword)
