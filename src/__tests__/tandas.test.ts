import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import { runMigrations } from '../db/schema';
import { createApp } from '../app';

let app: ReturnType<typeof createApp>;

beforeAll(() => {
  const db = new Database(':memory:');
  runMigrations(db);
  app = createApp(db);
});

async function createUser(email: string, name: string) {
  const res = await request(app).post('/api/users').send({ email, name });
  return res.body as { id: number; email: string; name: string };
}

async function setupActiveTanda(prefix: string) {
  const org = await createUser(`${prefix}org@example.com`, `${prefix}Org`);
  const m1 = await createUser(`${prefix}m1@example.com`, `${prefix}M1`);
  const m2 = await createUser(`${prefix}m2@example.com`, `${prefix}M2`);
  const tRes = await request(app).post('/api/tandas').send({
    name: `${prefix} Tanda`, organizerId: org.id, contributionAmount: 500,
  });
  const tanda = tRes.body as { id: number };
  await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m1.id });
  await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m2.id });
  await request(app).post(`/api/tandas/${tanda.id}/start`).send({ organizerId: org.id });
  return { org, tanda, m1, m2 };
}

describe('POST /api/tandas', () => {
  it('creates a tanda and returns 201', async () => {
    const user = await createUser('torg@example.com', 'TOrg');
    const res = await request(app).post('/api/tandas')
      .send({ name: 'Tanda Enero', organizerId: user.id, contributionAmount: 1000 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Tanda Enero', status: 'forming' });
    expect(res.body.id).toBeDefined();
  });

  it('returns 404 for unknown organizerId', async () => {
    const res = await request(app).post('/api/tandas')
      .send({ name: 'X', organizerId: 999999, contributionAmount: 100 });
    expect(res.status).toBe(404);
  });

  it('returns 400 for missing required fields', async () => {
    const res = await request(app).post('/api/tandas').send({ name: 'X' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/tandas', () => {
  it('lists all tandas when no userId given', async () => {
    const res = await request(app).get('/api/tandas');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('filters by userId', async () => {
    const user = await createUser('filt@example.com', 'Filt');
    await request(app).post('/api/tandas').send({ name: 'Filt Tanda', organizerId: user.id, contributionAmount: 200 });
    const res = await request(app).get(`/api/tandas?userId=${user.id}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });
});

describe('GET /api/tandas/:id', () => {
  it('returns tanda detail', async () => {
    const user = await createUser('detail@example.com', 'Detail');
    const cr = await request(app).post('/api/tandas').send({ name: 'Det', organizerId: user.id, contributionAmount: 100 });
    const res = await request(app).get(`/api/tandas/${cr.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(cr.body.id);
  });

  it('returns 404 for unknown tanda', async () => {
    const res = await request(app).get('/api/tandas/999999');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/tandas/:id/join', () => {
  it('allows a user to join a forming tanda', async () => {
    const org = await createUser('jorg@example.com', 'JOrg');
    const mem = await createUser('jmem@example.com', 'JMem');
    const t = await request(app).post('/api/tandas').send({ name: 'Join T', organizerId: org.id, contributionAmount: 300 });
    const res = await request(app).post(`/api/tandas/${t.body.id}/join`).send({ userId: mem.id });
    expect(res.status).toBe(201);
    expect(res.body.user_id).toBe(mem.id);
  });

  it('returns 409 if user already joined', async () => {
    const org = await createUser('djorg@example.com', 'DJOrg');
    const mem = await createUser('djmem@example.com', 'DJMem');
    const t = await request(app).post('/api/tandas').send({ name: 'DJ T', organizerId: org.id, contributionAmount: 300 });
    await request(app).post(`/api/tandas/${t.body.id}/join`).send({ userId: mem.id });
    const res = await request(app).post(`/api/tandas/${t.body.id}/join`).send({ userId: mem.id });
    expect(res.status).toBe(409);
  });

  it('returns 400 if tanda is not forming', async () => {
    const { org, tanda } = await setupActiveTanda('notforming');
    const extra = await createUser('extranotf@example.com', 'ExtraNotF');
    const res = await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: extra.id });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/tandas/:id/start', () => {
  it('starts a tanda with 3+ participants', async () => {
    const org = await createUser('sorg@example.com', 'SOrg');
    const m1 = await createUser('sm1@example.com', 'SM1');
    const m2 = await createUser('sm2@example.com', 'SM2');
    const t = await request(app).post('/api/tandas').send({ name: 'Start T', organizerId: org.id, contributionAmount: 400 });
    await request(app).post(`/api/tandas/${t.body.id}/join`).send({ userId: m1.id });
    await request(app).post(`/api/tandas/${t.body.id}/join`).send({ userId: m2.id });
    const res = await request(app).post(`/api/tandas/${t.body.id}/start`).send({ organizerId: org.id });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('active');
    expect(res.body.current_round).toBe(1);
    expect(res.body.total_rounds).toBe(3);
  });

  it('returns 403 if non-organizer tries to start', async () => {
    const org = await createUser('fborg@example.com', 'FBOrg');
    const m1 = await createUser('fbm1@example.com', 'FBM1');
    const m2 = await createUser('fbm2@example.com', 'FBM2');
    const other = await createUser('fbother@example.com', 'FBOther');
    const t = await request(app).post('/api/tandas').send({ name: 'FB T', organizerId: org.id, contributionAmount: 100 });
    await request(app).post(`/api/tandas/${t.body.id}/join`).send({ userId: m1.id });
    await request(app).post(`/api/tandas/${t.body.id}/join`).send({ userId: m2.id });
    const res = await request(app).post(`/api/tandas/${t.body.id}/start`).send({ organizerId: other.id });
    expect(res.status).toBe(403);
  });

  it('returns 400 if fewer than 3 participants', async () => {
    const org = await createUser('smallorg@example.com', 'SmallOrg');
    const t = await request(app).post('/api/tandas').send({ name: 'Small T', organizerId: org.id, contributionAmount: 100 });
    const res = await request(app).post(`/api/tandas/${t.body.id}/start`).send({ organizerId: org.id });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/tandas/:id/cancel', () => {
  it('cancels a forming tanda', async () => {
    const org = await createUser('corg@example.com', 'COrg');
    const t = await request(app).post('/api/tandas').send({ name: 'Cancel T', organizerId: org.id, contributionAmount: 100 });
    const res = await request(app).post(`/api/tandas/${t.body.id}/cancel`).send({ organizerId: org.id });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
  });

  it('returns 403 if non-organizer tries to cancel', async () => {
    const org = await createUser('cfborg@example.com', 'CFBOrg');
    const other = await createUser('cfbother@example.com', 'CFBOther');
    const t = await request(app).post('/api/tandas').send({ name: 'CFB T', organizerId: org.id, contributionAmount: 100 });
    const res = await request(app).post(`/api/tandas/${t.body.id}/cancel`).send({ organizerId: other.id });
    expect(res.status).toBe(403);
  });
});

describe('GET /api/tandas/:id/participants', () => {
  it('lists participants', async () => {
    const { tanda } = await setupActiveTanda('listp');
    const res = await request(app).get(`/api/tandas/${tanda.id}/participants`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(3);
  });

  it('returns 404 for unknown tanda', async () => {
    const res = await request(app).get('/api/tandas/999999/participants');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/tandas/:id/contributions', () => {
  it('records a contribution and returns 201', async () => {
    const { tanda } = await setupActiveTanda('contrib');
    const parts = await request(app).get(`/api/tandas/${tanda.id}/participants`);
    const pid = parts.body[0].id;
    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: pid });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('paid');
  });

  it('returns 400 when tanda is not active', async () => {
    const org = await createUser('inactorg2@example.com', 'InactOrg2');
    const t = await request(app).post('/api/tandas').send({ name: 'Inact T', organizerId: org.id, contributionAmount: 100 });
    const res = await request(app).post(`/api/tandas/${t.body.id}/contributions`).send({ participantId: 1 });
    expect(res.status).toBe(400);
  });

  it('returns 409 for duplicate contribution in same round', async () => {
    const { tanda } = await setupActiveTanda('dupcon');
    const parts = await request(app).get(`/api/tandas/${tanda.id}/participants`);
    const pid = parts.body[0].id;
    await request(app).post(`/api/tandas/${tanda.id}/contributions`).send({ participantId: pid });
    const res = await request(app).post(`/api/tandas/${tanda.id}/contributions`).send({ participantId: pid });
    expect(res.status).toBe(409);
  });
});

describe('GET /api/tandas/:id/rounds/:round', () => {
  it('returns round summary', async () => {
    const { tanda } = await setupActiveTanda('round');
    const res = await request(app).get(`/api/tandas/${tanda.id}/rounds/1`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('round', 1);
    expect(res.body).toHaveProperty('contributions');
    expect(res.body).toHaveProperty('receiver');
    expect(res.body).toHaveProperty('totalCollected');
  });

  it('returns 400 for out-of-range round', async () => {
    const { tanda } = await setupActiveTanda('badround');
    const res = await request(app).get(`/api/tandas/${tanda.id}/rounds/999`);
    expect(res.status).toBe(400);
  });
});

describe('POST /api/tandas/:id/advance', () => {
  it('advances to the next round', async () => {
    const { org, tanda } = await setupActiveTanda('advance');
    const res = await request(app).post(`/api/tandas/${tanda.id}/advance`).send({ organizerId: org.id });
    expect(res.status).toBe(200);
    expect(res.body.current_round).toBe(2);
  });

  it('returns 403 if non-organizer tries to advance', async () => {
    const { tanda } = await setupActiveTanda('advfb');
    const other = await createUser('advfbother@example.com', 'AdvFBOther');
    const res = await request(app).post(`/api/tandas/${tanda.id}/advance`).send({ organizerId: other.id });
    expect(res.status).toBe(403);
  });
});

describe('GET /api/tandas/:id/participants/:pid/history', () => {
  it('returns contribution history', async () => {
    const { tanda } = await setupActiveTanda('hist');
    const parts = await request(app).get(`/api/tandas/${tanda.id}/participants`);
    const pid = parts.body[0].id;
    await request(app).post(`/api/tandas/${tanda.id}/contributions`).send({ participantId: pid });
    const res = await request(app).get(`/api/tandas/${tanda.id}/participants/${pid}/history`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns 404 for unknown participant', async () => {
    const { tanda } = await setupActiveTanda('histnf');
    const res = await request(app).get(`/api/tandas/${tanda.id}/participants/999999/history`);
    expect(res.status).toBe(404);
  });
});
