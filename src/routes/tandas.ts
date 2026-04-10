import { Router, Request, Response } from 'express';
import { ServiceFactory } from '../services';
import { CreateTandaInput, createTandaSchema, RecordContributionInput, recordContributionSchema } from '../schemas';
import { validateRequest } from './middleware';
import { z } from 'zod';

export function createTandaRoutes(services: ServiceFactory): Router {
  const router = Router();
  const tandaService = services.getTandas();
  const participantService = services.getParticipants();
  const contributionService = services.getContributions();

  const joinSchema = z.object({ userId: z.string().min(1) });
  const organizerSchema = z.object({ organizerId: z.string().min(1) });

  // POST /api/tandas - Create tanda
  router.post('/', validateRequest(createTandaSchema), (req: Request, res: Response) => {
    const input = (req as any).validatedBody as CreateTandaInput;
    const tanda = tandaService.create(input);
    res.status(201).json(tanda);
  });

  // GET /api/tandas - List tandas (optional userId query)
  router.get('/', (req: Request, res: Response) => {
    const userId = req.query.userId as string | undefined;
    const tandas = tandaService.list(userId);
    res.json(tandas);
  });

  // GET /api/tandas/:id - Get tanda details
  router.get('/:id', (req: Request, res: Response) => {
    const tanda = tandaService.getById(String(req.params.id));
    res.json(tanda);
  });

  // POST /api/tandas/:id/join - Join tanda
  router.post('/:id/join', validateRequest(joinSchema), (req: Request, res: Response) => {
    const input = (req as any).validatedBody;
    tandaService.join(String(req.params.id), input.userId);
    res.status(204).send();
  });

  // POST /api/tandas/:id/start - Start tanda
  router.post('/:id/start', validateRequest(organizerSchema), (req: Request, res: Response) => {
    const input = (req as any).validatedBody;
    const tanda = tandaService.start(String(req.params.id), input.organizerId);
    res.json(tanda);
  });

  // POST /api/tandas/:id/cancel - Cancel tanda
  router.post('/:id/cancel', validateRequest(organizerSchema), (req: Request, res: Response) => {
    const input = (req as any).validatedBody;
    const tanda = tandaService.cancel(String(req.params.id), input.organizerId);
    res.json(tanda);
  });

  // POST /api/tandas/:id/advance - Advance to next round
  router.post('/:id/advance', validateRequest(organizerSchema), (req: Request, res: Response) => {
    const input = (req as any).validatedBody;
    const tanda = tandaService.advance(String(req.params.id), input.organizerId);
    res.json(tanda);
  });

  // GET /api/tandas/:id/participants - List participants
  router.get('/:id/participants', (req: Request, res: Response) => {
    const participants = participantService.getByTanda(String(req.params.id));
    res.json(participants);
  });

  // GET /api/tandas/:id/participants/:pid/history - Participant contribution history
  router.get('/:id/participants/:pid/history', (req: Request, res: Response) => {
    const history = participantService.getHistory(String(req.params.pid));
    res.json(history);
  });

  // POST /api/tandas/:id/contributions - Record contribution
  router.post('/:id/contributions', validateRequest(recordContributionSchema), (req: Request, res: Response) => {
    const input = (req as any).validatedBody as RecordContributionInput;
    const isLate = (req.query.late as string) === 'true';
    const contribution = contributionService.recordContribution(
      String(req.params.id),
      input.participantId,
      input.amount,
      isLate
    );
    res.status(201).json(contribution);
  });

  // GET /api/tandas/:id/rounds/:round - Round summary
  router.get('/:id/rounds/:round', (req: Request, res: Response) => {
    const round = parseInt(String(req.params.round), 10);
    const summary = contributionService.getRoundSummary(String(req.params.id), round);
    res.json(summary);
  });

  return router;
}

