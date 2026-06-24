import { app } from './app'
import { config } from './config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function start() {
  await prisma.$connect()
  console.log('Database connected')

  const server = app.listen(config.port, () => {
    console.log(`Server running on port ${config.port} [${config.nodeEnv}]`)
  })

  async function shutdown(signal: string) {
    console.log(`Received ${signal}. Shutting down gracefully...`)
    server.close(async () => {
      await prisma.$disconnect()
      console.log('Database disconnected. Server closed.')
      process.exit(0)
    })
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

start().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
