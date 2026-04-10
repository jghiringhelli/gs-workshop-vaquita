import { Router } from 'express';
import { createContribution, getContributionsForRound } from '../repositories/contribution.repository.js';
import { advanceTandaRound, getTandaById, getAllTandas } from '../repositories/tanda.repository.js';

const router = Router();

// GET /tandas
router.get('/', async (req, res) => {
  try {
    const tandas = await getAllTandas();
    res.status(200).json(tandas);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// GET /tandas/:id
router.get('/:id', async (req, res) => {
  const tandaId = parseInt(req.params.id);
  try {
    const tanda = await getTandaById(tandaId);
    if (!tanda) return res.status(404).json({ error: 'Tanda not found' });
    res.status(200).json(tanda);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /tandas/:id/contributions
router.post('/:id/contributions', async (req, res) => {
  const tandaId = parseInt(req.params.id);
  const { participantId, round, amount } = req.body;
  try {
    const contribution = await createContribution(tandaId, participantId, round, amount);
    res.status(201).json(contribution);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /tandas/:id/advance
router.post('/:id/advance', async (req, res) => {
  const tandaId = parseInt(req.params.id);
  try {
    const tanda = await advanceTandaRound(tandaId);
    res.status(200).json(tanda);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
