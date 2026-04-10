import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';
import { clearAllTables } from '../src/infrastructure/database';

interface Participant {
  id: string;
  userId: string;
  role: string;
}

/** Creates an active tanda with 3 participants and returns useful IDs. */
async function createActiveTanda(suffix = '') {
  const org = await request(app)
    .post('/api/users')
    .send({ email: `org${suffix}@contrib.com`, name: 'Org' });
  const u2 = await request(app)
    .post('/api/users')
    .send({ email: `u2${suffix}@contrib.com`, name: 'U2' });
  const u3 = await request(app)
    .post('/api/users')
    .send({ email: `u3${suffix}@contrib.com`, name: 'U3' });

  const tanda = await request(app).post('/api/tandas').send({
    name: 'Contrib Tanda',
    contributionAmount: 100,
    organizerId: org.body.id,
  });

  await request(app)
    .post(`/api/tandas/${tanda.body.id}/join`)
    .send({ userId: u2.body.id });
  await request(app)
    .post(`/api/tandas/${tanda.body.id}/join`)
    .send({ userId: u3.body.id });
  await request(app)
    .post(`/api/tandas/${tanda.body.id}/start`)
    .send({ organizerId: org.body.id });

  const participantsRes = await request(app).get(
    `/api/tandas/${tanda.body.id}/participants`,
  );

  return {
    tandaId: tanda.body.id as string,
    organizerId: org.body.id as string,
    participants: participantsRes.body as Participant[],
  };
}

describe('Contributions API', () => {
  beforeEach(() => clearAllTables());

  it('records a contribution for the current round', async () => {
    const { tandaId, participants } = await createActiveTanda();
    const pid = (participants[0] as Participant).id;

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .send({ participantId: pid, amount: 100 });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('paid');
    expect(res.body.round).toBe(1);
    expect(res.body.amount).toBe(100);
  });

  it('records a late contribution with 5% penalty', async () => {
    const { tandaId, participants } = await createActiveTanda('late');
    const pid = (participants[0] as Participant).id;

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .send({ participantId: pid, amount: 105 });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('late');
  });

  it('rejects wrong amount', async () => {
    const { tandaId, participants } = await createActiveTanda('bad');
    const pid = (participants[0] as Participant).id;

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .send({ participantId: pid, amount: 50 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects duplicate contribution for same round', async () => {
    const { tandaId, participants } = await createActiveTanda('dup');
    const pid = (participants[0] as Participant).id;

    await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .send({ participantId: pid, amount: 100 });

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .send({ participantId: pid, amount: 100 });

    expect(res.status).toBe(409);
  });

  it('round summary includes all contributions for that round', async () => {
    const { tandaId, participants } = await createActiveTanda('summary');
    const pid = (participants[0] as Participant).id;

    await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .send({ participantId: pid, amount: 100 });

    const res = await request(app).get(`/api/tandas/${tandaId}/rounds/1`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].participantId).toBe(pid);
  });

  it('advance creates missed contributions for unpaid participants', async () => {
    const { tandaId, organizerId, participants } = await createActiveTanda('miss');
    // Only pay one participant
    const pid = (participants[0] as Participant).id;
    await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .send({ participantId: pid, amount: 100 });

    const advance = await request(app)
      .post(`/api/tandas/${tandaId}/advance`)
      .send({ organizerId });
    expect(advance.status).toBe(200);

    const summary = await request(app).get(`/api/tandas/${tandaId}/rounds/1`);
    expect(summary.status).toBe(200);

    const missed = (summary.body as Array<{ status: string }>).filter(
      (c) => c.status === 'missed',
    );
    expect(missed).toHaveLength(2);

    const paid = (summary.body as Array<{ status: string }>).filter(
      (c) => c.status === 'paid',
    );
    expect(paid).toHaveLength(1);
  });

  it('participant history shows all contributions', async () => {
    const { tandaId, organizerId, participants } = await createActiveTanda('hist');
    const pid = (participants[0] as Participant).id;

    await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .send({ participantId: pid, amount: 100 });

    await request(app)
      .post(`/api/tandas/${tandaId}/advance`)
      .send({ organizerId });

    const history = await request(app).get(
      `/api/tandas/${tandaId}/participants/${pid}/history`,
    );
    expect(history.status).toBe(200);
    expect(history.body.length).toBeGreaterThanOrEqual(1);
    expect((history.body as Array<{ participantId: string }>)[0].participantId).toBe(pid);
  });

  it('defaulter is flagged after 2 consecutive misses', async () => {
    const { tandaId, organizerId, participants } = await createActiveTanda('def');
    const pid = (participants[0] as Participant).id;

    // Advance round 1 without paying
    await request(app)
      .post(`/api/tandas/${tandaId}/advance`)
      .send({ organizerId });

    // Advance round 2 without paying
    await request(app)
      .post(`/api/tandas/${tandaId}/advance`)
      .send({ organizerId });

    // Check participant is flagged
    const allParticipants = await request(app).get(
      `/api/tandas/${tandaId}/participants`,
    );
    const target = (allParticipants.body as Participant[]).find(
      (p) => p.id === pid,
    ) as (Participant & { isDefaulter: boolean; consecutiveMisses: number }) | undefined;
    expect(target?.isDefaulter).toBe(true);
    expect(target?.consecutiveMisses).toBeGreaterThanOrEqual(2);
  });
});
