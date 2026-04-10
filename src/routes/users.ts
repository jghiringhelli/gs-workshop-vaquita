import { Router, Request, Response } from 'express'
import { registerSchema, loginSchema } from '../schemas/user'
import { userService } from '../services/user'

const router = Router()

/**
 * POST /api/users/register
 * Register a new user
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const input = registerSchema.parse(req.body)
    const result = await userService.register(input)
    res.status(201).json(result)
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      })
    }

    if (error.message === 'User with this email already exists') {
      return res.status(409).json({
        error: error.message,
      })
    }

    res.status(500).json({
      error: 'Internal server error',
    })
  }
})

/**
 * POST /api/users/login
 * Login user and return JWT token
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const input = loginSchema.parse(req.body)
    const result = await userService.login(input)
    res.status(200).json(result)
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      })
    }

    if (error.message === 'Invalid email or password') {
      return res.status(401).json({
        error: error.message,
      })
    }

    res.status(500).json({
      error: 'Internal server error',
    })
  }
})

export default router
