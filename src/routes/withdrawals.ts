import { Router, Request, Response } from 'express'
import { createWithdrawalSchema, voteOnWithdrawalSchema } from '../schemas/withdrawal'
import { withdrawalService } from '../services/withdrawal'
import { verifyToken } from '../lib/auth'

const router = Router()

// Middleware to extract and verify JWT token
const requireAuth = (req: Request, res: Response, next: Function) => {
  const authHeader = req.headers.authorization
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({ error: 'Missing authentication token' })
  }

  const decoded = verifyToken(token)
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  ;(req as any).userId = decoded.userId
  next()
}

/**
 * POST /api/tandas/:tandaId/withdrawals
 * Request a withdrawal (organizer only)
 */
router.post('/:tandaId/withdrawals', requireAuth, async (req: Request, res: Response) => {
  try {
    const input = createWithdrawalSchema.parse(req.body)
    const userId = (req as any).userId
    const tandaId = Array.isArray(req.params.tandaId) ? req.params.tandaId[0] : req.params.tandaId

    const result = await withdrawalService.requestWithdrawal(tandaId, userId, input)
    res.status(201).json(result)
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: error.errors })
    }
    if (error.message === 'Only organizer can request withdrawals') {
      return res.status(403).json({ error: error.message })
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message })
    }
    res.status(400).json({ error: error.message })
  }
})

/**
 * GET /api/tandas/:tandaId/withdrawals
 * List all withdrawals with vote counts
 */
router.get('/:tandaId/withdrawals', requireAuth, async (req: Request, res: Response) => {
  try {
    const tandaId = Array.isArray(req.params.tandaId) ? req.params.tandaId[0] : req.params.tandaId
    const result = await withdrawalService.getWithdrawals(tandaId)
    res.status(200).json(result)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /api/withdrawals/:id/vote
 * Member votes on a withdrawal
 */
router.post('/vote/:withdrawalId', requireAuth, async (req: Request, res: Response) => {
  try {
    const input = voteOnWithdrawalSchema.parse(req.body)
    const userId = (req as any).userId
    const withdrawalId = Array.isArray(req.params.withdrawalId) ? req.params.withdrawalId[0] : req.params.withdrawalId

    // For now, participantId must be provided in the body
    const { participantId } = req.body
    if (!participantId) {
      return res.status(400).json({ error: 'Participant ID is required' })
    }

    const result = await withdrawalService.voteOnWithdrawal(withdrawalId, participantId, userId, input)
    res.status(201).json(result)
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: error.errors })
    }
    if (error.message.includes('Receipt URL is required')) {
      return res.status(400).json({ error: error.message })
    }
    if (error.message === 'Organizer cannot vote on their own withdrawal') {
      return res.status(403).json({ error: error.message })
    }
    if (error.message.includes('not found') || error.message.includes('unauthorized')) {
      return res.status(404).json({ error: error.message })
    }
    res.status(400).json({ error: error.message })
  }
})

/**
 * GET /api/tandas/:tandaId/ledger
 * Combined ledger of contributions and withdrawals
 */
router.get('/:tandaId/ledger', requireAuth, async (req: Request, res: Response) => {
  try {
    const tandaId = Array.isArray(req.params.tandaId) ? req.params.tandaId[0] : req.params.tandaId
    const result = await withdrawalService.getLedger(tandaId)
    res.status(200).json(result)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /api/tandas/:tandaId/dissolve
 * Organizer dissolves the tanda (cancel it)
 */
router.post('/:tandaId/dissolve', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId
    const tandaId = Array.isArray(req.params.tandaId) ? req.params.tandaId[0] : req.params.tandaId

    const result = await withdrawalService.dissolveTanda(tandaId, userId)
    res.status(200).json(result)
  } catch (error: any) {
    if (error.message === 'Only organizer can dissolve a tanda') {
      return res.status(403).json({ error: error.message })
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message })
    }
    res.status(400).json({ error: error.message })
  }
})

export default router
