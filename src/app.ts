import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import db from './db';

export const app = express();
app.use(express.json());

// Config
const MAX_PARTICIPANTS = Number(process.env.MAX_PARTICIPANTS ?? 20);
const MIN_PARTICIPANTS = 3;
const LATE_PENALTY_PCT = Number(process.env.LATE_PENALTY_PCT ?? 5);

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET env var is required');
  return secret;
}

// Auth middleware
export interface AuthRequest extends Request {
  userId?: string;
}

function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }
  try {
    const payload = jwt.verify(header.slice(7), getJwtSecret()) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ── Users ────────────────────────────────────────────────────────────────────

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

app.post('/api/users', (req: Request, res: Response): void => {
  const parsed = CreateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { email, name } = parsed.data;

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const id = uuidv4();
  db.prepare('INSERT INTO users (id, email, name) VALUES (?, ?, ?)').run(id, email, name);

  const user = db.prepare('SELECT id, email, name, created_at FROM users WHERE id = ?').get(id) as {
    id: string; email: string; name: string; created_at: string;
  };

  const token = jwt.sign({ userId: id }, getJwtSecret(), { expiresIn: '7d' });
  res.status(201).json({ user, token });
});

app.get('/api/users', (_req: Request, res: Response): void => {
  const users = db.prepare('SELECT id, email, name, created_at FROM users ORDER BY created_at DESC').all();
  res.json({ users });
});

app.get('/api/users/:id', (req: Request, res: Response): void => {
  const user = db.prepare('SELECT id, email, name, created_at FROM users WHERE id = ?').get(req.params.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ user });
});

// ── Tandas ────────────────────────────────────────────────────────────────────

const CreateTandaSchema = z.object({
  name: z.string().min(1),
  contributionAmount: z.number().positive(),
});

app.post('/api/tandas', requireAuth, (req: AuthRequest, res: Response): void => {
  const parsed = CreateTandaSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { name, contributionAmount } = parsed.data;
  const organizerId = req.userId!;

  const tandaId = uuidv4();
  db.prepare(
    'INSERT INTO tandas (id, name, organizer_id, contribution_amount) VALUES (?, ?, ?, ?)'
  ).run(tandaId, name, organizerId, contributionAmount);

  // Organizer auto-joins as first participant
  const participantId = uuidv4();
  db.prepare(
    'INSERT INTO participants (id, user_id, tanda_id, role) VALUES (?, ?, ?, ?)'
  ).run(participantId, organizerId, tandaId, 'organizer');

  const tanda = db.prepare('SELECT * FROM tandas WHERE id = ?').get(tandaId);
  res.status(201).json({ tanda });
});

app.get('/api/tandas', (req: Request, res: Response): void => {
  const { userId } = req.query;
  if (!userId || typeof userId !== 'string') {
    res.status(400).json({ error: 'userId query parameter is required' });
    return;
  }
  const tandas = db.prepare(`
    SELECT t.* FROM tandas t
    INNER JOIN participants p ON p.tanda_id = t.id
    WHERE p.user_id = ?
    ORDER BY t.created_at DESC
  `).all(userId);
  res.json({ tandas });
});

app.get('/api/tandas/:id', (req: Request, res: Response): void => {
  const tanda = db.prepare('SELECT * FROM tandas WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!tanda) {
    res.status(404).json({ error: 'Tanda not found' });
    return;
  }
  const participants = db.prepare(`
    SELECT p.id, p.role, p.rotation_position, u.id as user_id, u.name, u.email
    FROM participants p
    INNER JOIN users u ON u.id = p.user_id
    WHERE p.tanda_id = ?
    ORDER BY p.rotation_position ASC NULLS LAST
  `).all(req.params.id);
  res.json({ tanda, participants });
});

// ── Join ──────────────────────────────────────────────────────────────────────

const JoinSchema = z.object({
  userId: z.string().uuid(),
});

app.post('/api/tandas/:id/join', (req: Request, res: Response): void => {
  const parsed = JoinSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { userId } = parsed.data;
  const tandaId = req.params.id;

  const tanda = db.prepare('SELECT * FROM tandas WHERE id = ?').get(tandaId) as { status: string } | undefined;
  if (!tanda) {
    res.status(404).json({ error: 'Tanda not found' });
    return;
  }
  if (tanda.status !== 'forming') {
    res.status(409).json({ error: 'Tanda is not in forming status' });
    return;
  }

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const existing = db.prepare('SELECT id FROM participants WHERE user_id = ? AND tanda_id = ?').get(userId, tandaId);
  if (existing) {
    res.status(409).json({ error: 'User is already a participant' });
    return;
  }

  const count = (db.prepare('SELECT COUNT(*) as cnt FROM participants WHERE tanda_id = ?').get(tandaId) as { cnt: number }).cnt;
  if (count >= MAX_PARTICIPANTS) {
    res.status(409).json({ error: `Tanda is full (max ${MAX_PARTICIPANTS} participants)` });
    return;
  }

  const participantId = uuidv4();
  db.prepare('INSERT INTO participants (id, user_id, tanda_id, role) VALUES (?, ?, ?, ?)').run(participantId, userId, tandaId, 'member');

  const participant = db.prepare('SELECT * FROM participants WHERE id = ?').get(participantId);
  res.status(201).json({ participant });
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.post('/api/tandas/:id/start', requireAuth, (req: AuthRequest, res: Response): void => {
  const tandaId = req.params.id;
  const tanda = db.prepare('SELECT * FROM tandas WHERE id = ?').get(tandaId) as {
    id: string; organizer_id: string; status: string; total_rounds: number;
  } | undefined;

  if (!tanda) {
    res.status(404).json({ error: 'Tanda not found' });
    return;
  }
  if (tanda.organizer_id !== req.userId) {
    res.status(403).json({ error: 'Only the organizer can start the tanda' });
    return;
  }
  if (tanda.status !== 'forming') {
    res.status(409).json({ error: 'Tanda is not in forming status' });
    return;
  }

  const participants = db.prepare('SELECT id FROM participants WHERE tanda_id = ?').all(tandaId) as { id: string }[];
  if (participants.length < MIN_PARTICIPANTS) {
    res.status(409).json({ error: `Need at least ${MIN_PARTICIPANTS} participants to start` });
    return;
  }

  // Randomize rotation order
  const shuffled = [...participants].sort(() => Math.random() - 0.5);
  const updatePos = db.prepare('UPDATE participants SET rotation_position = ? WHERE id = ?');
  const setPositions = db.transaction(() => {
    shuffled.forEach((p, idx) => updatePos.run(idx + 1, p.id));
  });
  setPositions();

  db.prepare(
    'UPDATE tandas SET status = ?, current_round = 1, total_rounds = ? WHERE id = ?'
  ).run('active', participants.length, tandaId);

  const updated = db.prepare('SELECT * FROM tandas WHERE id = ?').get(tandaId);
  res.json({ tanda: updated });
});

// ── Cancel ────────────────────────────────────────────────────────────────────

app.post('/api/tandas/:id/cancel', requireAuth, (req: AuthRequest, res: Response): void => {
  const tandaId = req.params.id;
  const tanda = db.prepare('SELECT * FROM tandas WHERE id = ?').get(tandaId) as {
    organizer_id: string; status: string;
  } | undefined;

  if (!tanda) {
    res.status(404).json({ error: 'Tanda not found' });
    return;
  }
  if (tanda.organizer_id !== req.userId) {
    res.status(403).json({ error: 'Only the organizer can cancel the tanda' });
    return;
  }
  if (tanda.status === 'completed' || tanda.status === 'cancelled') {
    res.status(409).json({ error: 'Tanda cannot be cancelled in its current status' });
    return;
  }

  db.prepare("UPDATE tandas SET status = 'cancelled' WHERE id = ?").run(tandaId);
  const updated = db.prepare('SELECT * FROM tandas WHERE id = ?').get(tandaId);
  res.json({ tanda: updated });
});

// ── Participants list ─────────────────────────────────────────────────────────

app.get('/api/tandas/:id/participants', (req: Request, res: Response): void => {
  const tanda = db.prepare('SELECT id FROM tandas WHERE id = ?').get(req.params.id);
  if (!tanda) {
    res.status(404).json({ error: 'Tanda not found' });
    return;
  }
  const participants = db.prepare(`
    SELECT p.id, p.role, p.rotation_position, u.id as user_id, u.name, u.email
    FROM participants p
    INNER JOIN users u ON u.id = p.user_id
    WHERE p.tanda_id = ?
    ORDER BY p.rotation_position ASC NULLS LAST
  `).all(req.params.id);
  res.json({ participants });
});

// ── Contributions ─────────────────────────────────────────────────────────────

const ContributionSchema = z.object({
  participantId: z.string().uuid(),
  amount: z.number().positive(),
});

app.post('/api/tandas/:id/contributions', requireAuth, (req: AuthRequest, res: Response): void => {
  const parsed = ContributionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { participantId, amount } = parsed.data;
  const tandaId = req.params.id;

  const tanda = db.prepare('SELECT * FROM tandas WHERE id = ?').get(tandaId) as {
    status: string; current_round: number; contribution_amount: number;
  } | undefined;
  if (!tanda) {
    res.status(404).json({ error: 'Tanda not found' });
    return;
  }
  if (tanda.status !== 'active') {
    res.status(409).json({ error: 'Tanda is not active' });
    return;
  }

  const participant = db.prepare('SELECT id FROM participants WHERE id = ? AND tanda_id = ?').get(participantId, tandaId);
  if (!participant) {
    res.status(404).json({ error: 'Participant not found in this tanda' });
    return;
  }

  const alreadyPaid = db.prepare(
    'SELECT id FROM contributions WHERE participant_id = ? AND tanda_id = ? AND round = ?'
  ).get(participantId, tandaId, tanda.current_round);
  if (alreadyPaid) {
    res.status(409).json({ error: 'Contribution already recorded for this round' });
    return;
  }

  const expectedAmount = tanda.contribution_amount;
  const lateThreshold = expectedAmount * (1 + LATE_PENALTY_PCT / 100);
  const status = amount >= lateThreshold ? 'paid' : amount >= expectedAmount ? 'paid' : 'paid';
  // For simplicity: just record as paid; late detection would need timestamps
  const contributionId = uuidv4();
  db.prepare(
    'INSERT INTO contributions (id, tanda_id, participant_id, round, amount, status) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(contributionId, tandaId, participantId, tanda.current_round, amount, status);

  const contribution = db.prepare('SELECT * FROM contributions WHERE id = ?').get(contributionId);
  res.status(201).json({ contribution });
});

// ── Round summary ─────────────────────────────────────────────────────────────

app.get('/api/tandas/:id/rounds/:round', (req: Request, res: Response): void => {
  const tandaId = req.params.id;
  const round = Number(req.params.round);

  const tanda = db.prepare('SELECT * FROM tandas WHERE id = ?').get(tandaId);
  if (!tanda) {
    res.status(404).json({ error: 'Tanda not found' });
    return;
  }

  const contributions = db.prepare(`
    SELECT c.*, u.name as user_name
    FROM contributions c
    INNER JOIN participants p ON p.id = c.participant_id
    INNER JOIN users u ON u.id = p.user_id
    WHERE c.tanda_id = ? AND c.round = ?
  `).all(tandaId, round);

  res.json({ round, contributions });
});

// ── Advance round ─────────────────────────────────────────────────────────────

app.post('/api/tandas/:id/advance', requireAuth, (req: AuthRequest, res: Response): void => {
  const tandaId = req.params.id;
  const tanda = db.prepare('SELECT * FROM tandas WHERE id = ?').get(tandaId) as {
    organizer_id: string; status: string; current_round: number; total_rounds: number;
  } | undefined;

  if (!tanda) {
    res.status(404).json({ error: 'Tanda not found' });
    return;
  }
  if (tanda.organizer_id !== req.userId) {
    res.status(403).json({ error: 'Only the organizer can advance the round' });
    return;
  }
  if (tanda.status !== 'active') {
    res.status(409).json({ error: 'Tanda is not active' });
    return;
  }

  const nextRound = tanda.current_round + 1;
  if (nextRound > tanda.total_rounds) {
    db.prepare("UPDATE tandas SET status = 'completed' WHERE id = ?").run(tandaId);
  } else {
    db.prepare('UPDATE tandas SET current_round = ? WHERE id = ?').run(nextRound, tandaId);
  }

  const updated = db.prepare('SELECT * FROM tandas WHERE id = ?').get(tandaId);
  res.json({ tanda: updated });
});

// ── Participant history ───────────────────────────────────────────────────────

app.get('/api/tandas/:id/participants/:pid/history', (req: Request, res: Response): void => {
  const { id: tandaId, pid: participantId } = req.params;

  const participant = db.prepare('SELECT id FROM participants WHERE id = ? AND tanda_id = ?').get(participantId, tandaId);
  if (!participant) {
    res.status(404).json({ error: 'Participant not found' });
    return;
  }

  const history = db.prepare(
    'SELECT * FROM contributions WHERE participant_id = ? ORDER BY round ASC'
  ).all(participantId);

  res.json({ history });
});
