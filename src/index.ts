import express, { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { prisma } from './lib/prisma'
import usersRouter from './routes/users'

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(express.json())

// Routes
app.use('/api/users', usersRouter)

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation error',
      details: err.errors,
    })
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      error: 'Resource not found',
    })
  }

  if (err.code === 'P2002') {
    return res.status(409).json({
      error: 'Unique constraint violation',
    })
  }

  console.error('Unhandled error:', err)
  return res.status(500).json({
    error: 'Internal server error',
  })
})

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' })
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...')
  await prisma.$disconnect()
  server.close(() => {
    console.log('HTTP server closed')
    process.exit(0)
  })
})

// Start server
const server = app.listen(PORT, () => {
  console.log(`🫰 Tanda API listening on http://localhost:${PORT}`)
})

export default app

