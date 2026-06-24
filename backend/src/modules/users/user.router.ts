import { Router } from 'express'
import { authenticate } from '../../shared/middleware/auth.middleware'
import { getMe, updateProfile, changePassword } from './user.controller'

export const userRouter = Router()

userRouter.get('/me', authenticate, getMe)
userRouter.put('/me', authenticate, updateProfile)
userRouter.put('/me/password', authenticate, changePassword)
