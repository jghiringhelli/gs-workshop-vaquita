import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { createDb, setDb } from '../db';

const app = createApp();

beforeAll(() => {
  setDb(createDb(':memory:'));
});

// ── Helpers ──────────────────────────────────────────────────────────────────

async function makeUser(email: string, name: string) {
  const res = await request(app).post('/api/users').send({ email, name });
  return res.body as { id: string };
}

async function makeTanda(organizerId: string, name = 'Test Tanda', amount = 1000) {
  const res = await request(app)
    .post('/api/tandas')
    .send({ name, organizerId, contributionAmount: amount });
  return res.body as { id: string; organizerId: string };
}

async function joinTanda(tandaId: string, userId: string) {
  return request(app).post(`/api/tandas/${tandaId}/join`).send({ userId });
}

async function startTanda(tandaId: string, requesterId: string) {
  return request(app).post(`/api/tandas/${tandaId}/start`).send({ requesterId });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/tandas', () => {
  it('creates a tanda and auto-joins organizer', async () => {
    const user = await makeUser('org1@test.com', 'Org1');
    const res = await request(app)
      .post('/api/tandas')
      .send({ name: 'Mi Tanda', organizerId: user.id, contributionAmount: 500 });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Mi Tanda', status: 'forming' });
  });

  it('returns 400 for missing fields', async () => {
    const res = await request(app).post('/api/tandas').send({ name: 'Bad' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/tandas', () => {
  it('lists tandas for a user', async () => {
    const user = await makeUser('list@test.com', 'List');
    await makeTanda(user.id);

    const res = await request(app).get(`/api/tandas?userId=${user.id}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('returns 400 when userId is missing', async () => {
    const res = await request(app).get('/api/tandas');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/tandas/:id', () => {
  it('returns the tanda', async () => {
    const user = await makeUser('get@test.com', 'Get');
    const tanda = await makeTanda(user.id);
    const res = await request(app).get(`/api/tandas/${tanda.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(tanda.id);
  });

  it('returns 404 for unknown tanda', async () => {
    const res = await request(app).get('/api/tandas/no-such-id');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/tandas/:id/join', () => {
  it('joins a forming tanda', async () => {
    const org = await makeUser('joinorg@test.com', 'JoinOrg');
    const member = await makeUser('joinmem@test.com', 'JoinMem');
    const tanda = await makeTanda(org.id);

    const res = await joinTanda(tanda.id, member.id);
    expect(res.status).toBe(201);
    expect(res.body.userId).toBe(member.id);
  });

  it('returns 409 when joining twice', async () => {
    const org = await makeUser('dblorg@test.com', 'DblOrg');
    const member = await makeUser('dblmem@test.com', 'DblMem');
    const tanda = await makeTanda(org.id);

    await joinTanda(tanda.id, member.id);
    const res = await joinTanda(tanda.id, member.id);
    expect(res.status).toBe(409);
  });
});

describe('POST /api/tandas/:id/start', () => {
  it('starts a tanda with ≥3 participants', async () => {
    const org = await makeUser('sorg@test.com', 'SOorg');
    const u1 = await makeUser('sm1@test.com', 'SM1');
    const u2 = await makeUser('sm2@test.com', 'SM2');
    const tanda = await makeTanda(org.id);
    await joinTanda(tanda.id, u1.id);
    await joinTanda(tanda.id, u2.id);

    const res = await startTanda(tanda.id, org.id);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('active');
    expect(res.body.totalRounds).toBe(3);
  });

  it('returns 400 with fewer than 3 participants', async () => {
    const org = await makeUser('small@test.com', 'Small');
    const u1 = await makeUser('sm@test.com', 'SM');
    const tanda = await makeTanda(org.id);
    await joinTanda(tanda.id, u1.id);

    const res = await startTanda(tanda.id, org.id);
    expect(res.status).toBe(400);
  });

  it('returns 403 when non-organizer tries to start', async () => {
    const org = await makeUser('fborg@test.com', 'FbOrg');
    const u1 = await makeUser('fbm1@test.com', 'FbM1');
    const u2 = await makeUser('fbm2@test.com', 'FbM2');
    const tanda = await makeTanda(org.id);
    await joinTanda(tanda.id, u1.id);
    await joinTanda(tanda.id, u2.id);

    const res = await startTanda(tanda.id, u1.id);
    expect(res.status).toBe(403);
  });
});

describe('POST /api/tandas/:id/cancel', () => {
  it('cancels a tanda', async () => {
    const org = await makeUser('cancelorg@test.com', 'COrg');
    const tanda = await makeTanda(org.id);
    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/cancel`)
      .send({ requesterId: org.id });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
  });

  it('returns 403 for non-organizer', async () => {
    const org = await makeUser('corg2@test.com', 'COrg2');
    const other = await makeUser('cother@test.com', 'COther');
    const tanda = await makeTanda(org.id);

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/cancel`)
      .send({ requesterId: other.id });
    expect(res.status).toBe(403);
  });
});

describe('POST /api/tandas/:id/advance + contributions + rounds', () => {
  it('records contributions and advances round', async () => {
    const org = await makeUser('advorg@test.com', 'AdvOrg');
    const u1 = await makeUser('advm1@test.com', 'AdvM1');
    const u2 = await makeUser('advm2@test.com', 'AdvM2');
    const tanda = await makeTanda(org.id, 'AdvTanda', 300);
    await joinTanda(tanda.id, u1.id);
    await joinTanda(tanda.id, u2.id);
    await startTanda(tanda.id, org.id);

    // Get participants to find their IDs
    const participants = (await request(app).get(`/api/tandas/${tanda.id}/participants`)).body;
    const orgPart = participants.find((p: any) => p.userId === org.id);

    // Record a contribution
    const contribRes = await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: orgPart.id, amount: 300 });
    expect(contribRes.status).toBe(201);
    expect(contribRes.body.status).toBe('paid');

    // Advance round
    const advRes = await request(app)
      .post(`/api/tandas/${tanda.id}/advance`)
      .send({ requesterId: org.id });
    expect(advRes.status).toBe(200);
    expect(advRes.body.currentRound).toBe(2);
  });

  it('returns 409 for duplicate contribution in same round', async () => {
    const org = await makeUser('duporg@test.com', 'DupOrg');
    const u1 = await makeUser('dupm1@test.com', 'DupM1');
    const u2 = await makeUser('dupm2@test.com', 'DupM2');
    const tanda = await makeTanda(org.id, 'DupTanda', 200);
    await joinTanda(tanda.id, u1.id);
    await joinTanda(tanda.id, u2.id);
    await startTanda(tanda.id, org.id);

    const participants = (await request(app).get(`/api/tandas/${tanda.id}/participants`)).body;
    const orgPart = participants.find((p: any) => p.userId === org.id);

    await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: orgPart.id, amount: 200 });

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: orgPart.id, amount: 200 });
    expect(res.status).toBe(409);
  });

  it('auto-completes tanda after last round', async () => {
    const org = await makeUser('cmporg@test.com', 'CmpOrg');
    const u1 = await makeUser('cmpm1@test.com', 'CmpM1');
    const u2 = await makeUser('cmpm2@test.com', 'CmpM2');
    const tanda = await makeTanda(org.id, 'CmpTanda', 100);
    await joinTanda(tanda.id, u1.id);
    await joinTanda(tanda.id, u2.id);
    await startTanda(tanda.id, org.id); // 3 rounds

    // Advance through all 3 rounds (no contributions — all auto-missed)
    for (let i = 0; i < 3; i++) {
      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/advance`)
        .send({ requesterId: org.id });
      if (i === 2) {
        expect(res.body.status).toBe('completed');
      }
    }
  });
});

describe('GET /api/tandas/:id/rounds/:round', () => {
  it('returns round summary', async () => {
    const org = await makeUser('rndorg@test.com', 'RndOrg');
    const u1 = await makeUser('rndm1@test.com', 'RndM1');
    const u2 = await makeUser('rndm2@test.com', 'RndM2');
    const tanda = await makeTanda(org.id, 'RndTanda', 500);
    await joinTanda(tanda.id, u1.id);
    await joinTanda(tanda.id, u2.id);
    await startTanda(tanda.id, org.id);

    const res = await request(app).get(`/api/tandas/${tanda.id}/rounds/1`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('round', 1);
    expect(res.body).toHaveProperty('contributions');
    expect(res.body).toHaveProperty('recipient');
  });
});
