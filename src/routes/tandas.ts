import { Router, Request, Response } from 'express'
import { createTandaSchema, inviteParticipantSchema, recordContributionSchema } from '../schemas/tanda'
import { tandaService } from '../services/tanda'
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
 * POST /api/tandas
 * Create a new tanda (organizer joins automatically)
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const input = createTandaSchema.parse(req.body)
    const userId = (req as any).userId
    const result = await tandaService.createTanda(input, userId)
    res.status(201).json(result)
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: error.errors })
    }
    res.status(500).json({ error: error.message })
  }
})

/**
 * GET /api/tandas/:id
 * Get tanda details with members and contributions
 */
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const result = await tandaService.getTandaDetail(id)
    res.status(200).json(result)
  } catch (error: any) {
    if (error.message === 'Tanda not found') {
      return res.status(404).json({ error: error.message })
    }
    res.status(500).json({ error: error.message })
  }
})

/**
 * GET /api/tandas/:id/preview
 * Public preview (no auth required)
 */
router.get('/:id/preview', async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const result = await tandaService.getTandaPreview(id)
    res.status(200).json(result)
  } catch (error: any) {
    if (error.message === 'Tanda not found') {
      return res.status(404).json({ error: error.message })
    }
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /api/tandas/:id/invite
 * Organiser adds a member
 */
router.post('/:id/invite', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const input = inviteParticipantSchema.parse(req.body)
    const userId = (req as any).userId
    const result = await tandaService.inviteParticipant(id, userId, input)
    res.status(201).json(result)
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: error.errors })
    }
    if (error.message === 'Only organizer can invite participants') {
      return res.status(403).json({ error: error.message })
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message })
    }
    res.status(400).json({ error: error.message })
  }
})

/**
 * POST /api/tandas/:id/contributions
 * Record a contribution
 */
router.post('/:tandaId/contributions', requireAuth, async (req: Request, res: Response) => {
  try {
    const input = recordContributionSchema.parse(req.body)
    const userId = (req as any).userId
    const tandaId = Array.isArray(req.params.tandaId) ? req.params.tandaId[0] : req.params.tandaId

    // For now, we need the participantId - in a real app, this would be derived from userId
    const { participantId } = req.body

    if (!participantId) {
      return res.status(400).json({ error: 'Participant ID is required' })
    }

    const result = await tandaService.recordContribution(tandaId, participantId, userId, input)
    res.status(201).json(result)
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: error.errors })
    }
    if (error.message === 'Participant not found or unauthorized') {
      return res.status(403).json({ error: error.message })
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message })
    }
    if (error.message === 'Contribution already recorded for this round') {
      return res.status(409).json({ error: error.message })
    }
    res.status(400).json({ error: error.message })
  }
})

/**
 * GET /api/tandas/:id/balance
 * Get tanda balance (contributions minus payouts)
 */
router.get('/:id/balance', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const result = await tandaService.getTandaBalance(id)
    res.status(200).json(result)
  } catch (error: any) {
    if (error.message === 'Tanda not found') {
      return res.status(404).json({ error: error.message })
    }
    res.status(500).json({ error: error.message })
  }
})

export default router
