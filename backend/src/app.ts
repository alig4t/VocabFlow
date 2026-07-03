import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import 'express-async-errors'

import { config } from './config'
import { authRouter } from './modules/auth/auth.router'
import { userRouter } from './modules/users/user.router'
import { wordRouter } from './modules/vocabulary/word.router'
import { progressRouter } from './modules/progress/progress.router'
import { synonymRouter } from './modules/synonyms/synonym.router'
import { bookRouter } from './modules/books/book.router'
import { errorMiddleware } from './shared/middleware/error.middleware'

const app = express()

app.use(helmet())
app.use(cors({ origin: config.cors.origin, credentials: true }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

if (config.nodeEnv === 'development') {
  app.use(morgan('dev'))
}

app.use('/api/auth', authRouter)
app.use('/api/users', userRouter)
app.use('/api/words', wordRouter)
app.use('/api/progress', progressRouter)
app.use('/api/synonyms', synonymRouter)
app.use('/api/books', bookRouter)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date() })
})

app.use((_req, res) => {
  res.status(404).json({ status: 'error', message: 'Route not found' })
})

app.use(errorMiddleware)

export { app }
