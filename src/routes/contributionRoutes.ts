import { Router } from 'express';
import { z } from 'zod';
import { ContributionService } from '../services/index.js';
import { NotFoundError, ValidationError, UnauthorizedError } from '../errors.js';

const recordContributionSchema = z.object({
  participantId: z.string().uuid(),
  userId: z.string().uuid()
});

export function createContributionRoutes(contributionService: ContributionService) {
  const router = Router();

  // POST /api/tandas/:id/contributions
  router.post('/tandas/:id/contributions', async (req, res) => {
    try {
      const body = recordContributionSchema.parse(req.body);
      const contribution = await contributionService.recordContribution(req.params.id, body.participantId, body.userId);
      res.status(201).json(contribution);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(422).json({ error: 'Validation failed', details: error.errors });
      } else if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof ValidationError) {
        res.status(422).json({ error: error.message });
      } else if (error instanceof UnauthorizedError) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  // GET /api/tandas/:id/rounds/:round
  router.get('/tandas/:id/rounds/:round', async (req, res) => {
    try {
      const round = parseInt(req.params.round);
      if (isNaN(round)) {
        res.status(422).json({ error: 'Invalid round number' });
        return;
      }
      const contributions = await contributionService.getRoundSummary(req.params.id, round);
      res.json(contributions);
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof ValidationError) {
        res.status(422).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  // GET /api/tandas/:id/participants/:pid/history
  router.get('/tandas/:id/participants/:pid/history', async (req, res) => {
    try {
      const contributions = await contributionService.getParticipantHistory(req.params.pid);
      res.json(contributions);
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  return router;
}