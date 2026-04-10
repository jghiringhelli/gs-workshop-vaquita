import { Router, Request, Response } from 'express';
import { ParticipantService } from '../services/participant.service';
import { TandaOperationService } from '../services/tanda.operation.service';
import { JoinTandaSchema } from '../models/participant';
import { RecordContributionSchema } from '../models/contribution';

export function createParticipantRoutes(
  participantService: ParticipantService,
  tandaOperationService?: TandaOperationService
): Router {
  const router = Router({ mergeParams: true });

  // POST /api/tandas/:id/join - Join a tanda
  router.post('/join', (req: Request, res: Response) => {
    try {
      const tandaId = typeof req.params.id === 'string' ? req.params.id : '';
      const validated = JoinTandaSchema.parse(req.body);

      const participant = participantService.joinTanda(tandaId, validated);
      res.status(201).json(participant);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid input', details: error.errors });
      }
      if (error.message.includes('already a participant')) {
        return res.status(409).json({ error: error.message });
      }
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('not in forming status') || error.message.includes('Maximum participants')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/tandas/:id/participants - List participants
  router.get('/participants', (req: Request, res: Response) => {
    try {
      const tandaId = typeof req.params.id === 'string' ? req.params.id : '';
      const participants = participantService.getTandaParticipants(tandaId);
      res.status(200).json(participants);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/tandas/:id/start - Start tanda (only if tandaOperationService provided)
  if (tandaOperationService) {
    router.post('/start', (req: Request, res: Response) => {
      try {
        const tandaId = typeof req.params.id === 'string' ? req.params.id : '';
        const { organizerId } = req.body;

        if (!organizerId) {
          return res.status(400).json({ error: 'Missing organizerId in request body' });
        }

        const tanda = tandaOperationService.startTanda(tandaId, organizerId);
        res.status(200).json(tanda);
      } catch (error: any) {
        if (error.message.includes('not found')) {
          return res.status(404).json({ error: error.message });
        }
        if (error.message.includes('organizer') || error.message.includes('3 participants')) {
          return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // POST /api/tandas/:id/cancel - Cancel tanda
    router.post('/cancel', (req: Request, res: Response) => {
      try {
        const tandaId = typeof req.params.id === 'string' ? req.params.id : '';
        const { organizerId } = req.body;

        if (!organizerId) {
          return res.status(400).json({ error: 'Missing organizerId in request body' });
        }

        const tanda = tandaOperationService.cancelTanda(tandaId, organizerId);
        res.status(200).json(tanda);
      } catch (error: any) {
        if (error.message.includes('not found')) {
          return res.status(404).json({ error: error.message });
        }
        if (error.message.includes('organizer') || error.message.includes('already cancelled')) {
          return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // POST /api/tandas/:id/contributions - Record contribution
    router.post('/contributions', (req: Request, res: Response) => {
      try {
        const tandaId = typeof req.params.id === 'string' ? req.params.id : '';
        const validated = RecordContributionSchema.parse(req.body);

        const contribution = tandaOperationService.recordContribution(tandaId, validated);
        res.status(201).json(contribution);
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return res.status(400).json({ error: 'Invalid input', details: error.errors });
        }
        if (error.message.includes('not found')) {
          return res.status(404).json({ error: error.message });
        }
        if (error.message.includes('non-active')) {
          return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // GET /api/tandas/:id/rounds/:round - Get round summary
    router.get('/rounds/:round', (req: Request, res: Response) => {
      try {
        const tandaId = typeof req.params.id === 'string' ? req.params.id : '';
        const roundStr = typeof req.params.round === 'string' ? req.params.round : '';
        const round = parseInt(roundStr, 10);

        if (isNaN(round)) {
          return res.status(400).json({ error: 'Invalid round number' });
        }

        const summary = tandaOperationService.getRoundSummary(tandaId, round);
        res.status(200).json(summary);
      } catch (error: any) {
        if (error.message.includes('not found')) {
          return res.status(404).json({ error: error.message });
        }
        if (error.message.includes('Invalid round')) {
          return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // POST /api/tandas/:id/advance - Advance to next round
    router.post('/advance', (req: Request, res: Response) => {
      try {
        const tandaId = typeof req.params.id === 'string' ? req.params.id : '';
        const { organizerId } = req.body;

        if (!organizerId) {
          return res.status(400).json({ error: 'Missing organizerId in request body' });
        }

        const tanda = tandaOperationService.advanceRound(tandaId, organizerId);
        res.status(200).json(tanda);
      } catch (error: any) {
        if (error.message.includes('not found')) {
          return res.status(404).json({ error: error.message });
        }
        if (error.message.includes('organizer') || error.message.includes('not active') || error.message.includes('completed')) {
          return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // GET /api/tandas/:id/participants/:pid/history - Get participant contribution history
    router.get('/participants/:pid/history', (req: Request, res: Response) => {
      try {
        const participantId = typeof req.params.pid === 'string' ? req.params.pid : '';

        const history = tandaOperationService.getParticipantHistory(participantId);
        res.status(200).json(history);
      } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  }

  return router;
}
