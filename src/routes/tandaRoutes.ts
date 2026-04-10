import { Router } from 'express';
import { z } from 'zod';
import { TandaService } from '../services/index.js';
import { ConflictError, NotFoundError, ValidationError, UnauthorizedError } from '../errors.js';

const createTandaSchema = z.object({
  name: z.string().min(1),
  organizerId: z.string().uuid(),
  contributionAmount: z.number().positive()
});

const joinTandaSchema = z.object({
  userId: z.string().uuid()
});

const actionSchema = z.object({
  organizerId: z.string().uuid()
});

export function createTandaRoutes(tandaService: TandaService) {
  const router = Router();

  // POST /api/tandas
  router.post('/', async (req, res) => {
    try {
      const body = createTandaSchema.parse(req.body);
      const tanda = await tandaService.createTanda(body);
      res.status(201).json(tanda);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(422).json({ error: 'Validation failed', details: error.errors });
      } else if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  // GET /api/tandas
  router.get('/', async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        res.status(400).json({ error: 'userId query parameter required' });
        return;
      }
      const tandas = await tandaService.listTandasByUser(userId);
      res.json(tandas);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/tandas/:id
  router.get('/:id', async (req, res) => {
    try {
      const tanda = await tandaService.getTandaById(req.params.id);
      res.json(tanda);
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  // POST /api/tandas/:id/join
  router.post('/:id/join', async (req, res) => {
    try {
      const body = joinTandaSchema.parse(req.body);
      const participant = await tandaService.joinTanda(req.params.id, body.userId);
      res.status(201).json(participant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(422).json({ error: 'Validation failed', details: error.errors });
      } else if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof ValidationError) {
        res.status(422).json({ error: error.message });
      } else if (error instanceof ConflictError) {
        res.status(409).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  // POST /api/tandas/:id/start
  router.post('/:id/start', async (req, res) => {
    try {
      const body = actionSchema.parse(req.body);
      const tanda = await tandaService.startTanda(req.params.id, body.organizerId);
      res.json(tanda);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(422).json({ error: 'Validation failed', details: error.errors });
      } else if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof UnauthorizedError) {
        res.status(403).json({ error: error.message });
      } else if (error instanceof ValidationError) {
        res.status(422).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  // POST /api/tandas/:id/cancel
  router.post('/:id/cancel', async (req, res) => {
    try {
      const body = actionSchema.parse(req.body);
      const tanda = await tandaService.cancelTanda(req.params.id, body.organizerId);
      res.json(tanda);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(422).json({ error: 'Validation failed', details: error.errors });
      } else if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof UnauthorizedError) {
        res.status(403).json({ error: error.message });
      } else if (error instanceof ValidationError) {
        res.status(422).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  // GET /api/tandas/:id/participants
  router.get('/:id/participants', async (req, res) => {
    try {
      const participants = await tandaService.listParticipants(req.params.id);
      res.json(participants);
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  // POST /api/tandas/:id/advance
  router.post('/:id/advance', async (req, res) => {
    try {
      const body = actionSchema.parse(req.body);
      const tanda = await tandaService.advanceRound(req.params.id, body.organizerId);
      res.json(tanda);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(422).json({ error: 'Validation failed', details: error.errors });
      } else if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof UnauthorizedError) {
        res.status(403).json({ error: error.message });
      } else if (error instanceof ValidationError) {
        res.status(422).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  return router;
}