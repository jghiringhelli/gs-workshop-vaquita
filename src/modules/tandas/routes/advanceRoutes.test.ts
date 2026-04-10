import request from 'supertest';
import { createApp } from '../../../app';
import { createDatabase } from '../../../shared/db/database';

const db = createDatabase(':memory:');
const app = createApp(db);

let counter = 0;

async function seedUser(email: string): Promise<string> {
  const res = await request(app).post('/api/users').send({ email, name: email });
  return res.body.id as string;
}

/** Seeds an ACTIVE tanda with `extraMembers` additional members beyond the minimum 3. */
async function seedActiveTanda(extraMembers = 0) {
  const n = ++counter;
  const organizerId = await seedUser(`adv-org-${n}@e.com`);
  const memberIds: string[] = [];
  for (let i = 0; i < 2 + extraMembers; i++) {
    memberIds.push(await seedUser(`adv-m${i}-${n}@e.com`));
  }

  const tanda = await request(app).post('/api/tandas').send({
    name: `Advance Tanda ${n}`,
    organizerId,
    contributionAmount: 100,
  });
  const tandaId = tanda.body.id as string;

  for (const mid of memberIds) {
    await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: mid });
  }
  await request(app).post(`/api/tandas/${tandaId}/start`).send({ userId: organizerId });

  const parts = await request(app).get(`/api/tandas/${tandaId}/participants`);
  const participantIds: string[] = parts.body.map((p: { id: string }) => p.id);

  return { tandaId, organizerId, memberIds, participantIds };
}

describe('POST /api/tandas/:id/advance', () => {
  it('advances currentRound by 1 and returns the updated tanda', async () => {
    const { tandaId, organizerId, participantIds } = await seedActiveTanda();

    // All participants contribute
    for (const pid of participantIds) {
      await request(app)
        .post(`/api/tandas/${tandaId}/contributions`)
        .send({ participantId: pid, amount: 100 });
    }

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/advance`)
      .send({ userId: organizerId });

    expect(res.status).toBe(200);
    expect(res.body.currentRound).toBe(2);
    expect(res.body.status).toBe('active');
  });

  it('marks missing contributions as missed before advancing', async () => {
    const { tandaId, organizerId, participantIds } = await seedActiveTanda();

    // Only first participant contributes — rest are missed
    await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .send({ participantId: participantIds[0], amount: 100 });

    await request(app)
      .post(`/api/tandas/${tandaId}/advance`)
      .send({ userId: organizerId });

    const summary = await request(app).get(`/api/tandas/${tandaId}/rounds/1`);
    const statuses = summary.body.contributions.map((c: { status: string }) => c.status);
    expect(statuses).toContain('missed');
    expect(statuses).toContain('paid');
  });

  it('transitions tanda to COMPLETED on the last round', async () => {
    const { tandaId, organizerId, participantIds } = await seedActiveTanda();
    const totalRounds = participantIds.length;

    for (let round = 0; round < totalRounds; round++) {
      for (const pid of participantIds) {
        await request(app)
          .post(`/api/tandas/${tandaId}/contributions`)
          .send({ participantId: pid, amount: 100 });
      }
      await request(app)
        .post(`/api/tandas/${tandaId}/advance`)
        .send({ userId: organizerId });
    }

    const tanda = await request(app).get(`/api/tandas/${tandaId}`);
    expect(tanda.body.status).toBe('completed');
  });

  it('returns 403 when caller is not the organizer', async () => {
    const { tandaId, memberIds } = await seedActiveTanda();

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/advance`)
      .send({ userId: memberIds[0] });

    expect(res.status).toBe(403);
  });

  it('returns 409 when tanda is already COMPLETED', async () => {
    const { tandaId, organizerId, participantIds } = await seedActiveTanda();
    const totalRounds = participantIds.length;

    // Complete the tanda
    for (let round = 0; round < totalRounds; round++) {
      for (const pid of participantIds) {
        await request(app)
          .post(`/api/tandas/${tandaId}/contributions`)
          .send({ participantId: pid, amount: 100 });
      }
      await request(app)
        .post(`/api/tandas/${tandaId}/advance`)
        .send({ userId: organizerId });
    }

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/advance`)
      .send({ userId: organizerId });

    expect(res.status).toBe(409);
  });

  it('flags a participant as defaulter after 2 consecutive missed contributions', async () => {
    const { tandaId, organizerId, participantIds } = await seedActiveTanda(1); // 4 participants = 4 rounds

    // Round 1: all miss except organizer
    await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .send({ participantId: participantIds[0], amount: 100 });
    await request(app).post(`/api/tandas/${tandaId}/advance`).send({ userId: organizerId });

    // Round 2: all miss except organizer again (participant[1] now has 2 consecutive misses)
    await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .send({ participantId: participantIds[0], amount: 100 });
    await request(app).post(`/api/tandas/${tandaId}/advance`).send({ userId: organizerId });

    const parts = await request(app).get(`/api/tandas/${tandaId}/participants`);
    const defaulters = parts.body.filter((p: { isDefaulter: boolean }) => p.isDefaulter);
    expect(defaulters.length).toBeGreaterThan(0);
  });
});

describe('GET /api/tandas/:id', () => {
  it('returns tanda details', async () => {
    const { tandaId } = await seedActiveTanda();
    const res = await request(app).get(`/api/tandas/${tandaId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(tandaId);
    expect(res.body.status).toBe('active');
  });

  it('returns 404 for unknown tanda', async () => {
    const res = await request(app).get('/api/tandas/no-such-tanda');
    expect(res.status).toBe(404);
  });
});
