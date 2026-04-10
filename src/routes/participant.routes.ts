import { Router, Request, Response } from 'express';
import { ParticipantService } from '../services/participant.service';
import { JoinTandaSchema } from '../models/participant';

export function createParticipantRoutes(participantService: ParticipantService): Router {
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

  return router;
}
