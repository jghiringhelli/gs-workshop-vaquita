import { Router, Request, Response } from 'express';
import { TandaService } from '../services/tanda.service';
import { CreateTandaSchema } from '../models/tanda';

export function createTandaRoutes(tandaService: TandaService): Router {
  const router = Router();

  // POST /api/tandas - Create a new tanda
  router.post('/', (req: Request, res: Response) => {
    try {
      const validated = CreateTandaSchema.parse(req.body);
      const tanda = tandaService.createTanda(validated);
      res.status(201).json(tanda);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid input', details: error.errors });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/tandas?organizerId=... - List tandas for an organizer
  router.get('/', (req: Request, res: Response) => {
    try {
      const organizerId = req.query.organizerId as string;
      if (!organizerId) {
        return res.status(400).json({ error: 'Missing organizerId query param' });
      }
      const tandas = tandaService.getTandasByOrganizer(organizerId);
      res.status(200).json(tandas);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/tandas/:id - Get tanda details
  router.get('/:id', (req: Request, res: Response) => {
    try {
      const id = typeof req.params.id === 'string' ? req.params.id : '';
      const tanda = tandaService.getTandaById(id);
      if (!tanda) {
        return res.status(404).json({ error: 'Tanda not found' });
      }
      res.status(200).json(tanda);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
