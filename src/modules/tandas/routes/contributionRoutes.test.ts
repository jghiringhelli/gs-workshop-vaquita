import request from 'supertest';
import { createApp } from '../../../app';
import { createDatabase } from '../../../shared/db/database';

const db = createDatabase(':memory:');
const app = createApp(db);

/** Seed a user and return their id. */
async function seedUser(email: string): Promise<string> {
  const res = await request(app).post('/api/users').send({ email, name: email });
  return res.body.id as string;
}

let counter = 0;

/** Build an ACTIVE tanda with 3 participants; returns { tandaId, organizerId, member1Id, member2Id, orgParticipantId, m1ParticipantId, m2ParticipantId } */
async function seedActiveTanda() {
  const n = ++counter;
  const organizerId = await seedUser(`contrib-org-${n}@e.com`);
  const member1Id = await seedUser(`contrib-m1-${n}@e.com`);
  const member2Id = await seedUser(`contrib-m2-${n}@e.com`);

  const tanda = await request(app).post('/api/tandas').send({
    name: 'Contrib Tanda',
    organizerId,
    contributionAmount: 500,
  });
  const tandaId = tanda.body.id as string;

  await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: member1Id });
  await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: member2Id });
  await request(app).post(`/api/tandas/${tandaId}/start`).send({ userId: organizerId });

  const participants = await request(app).get(`/api/tandas/${tandaId}/participants`);
  const orgP = participants.body.find((p: { userId: string }) => p.userId === organizerId);
  const m1P = participants.body.find((p: { userId: string }) => p.userId === member1Id);
  const m2P = participants.body.find((p: { userId: string }) => p.userId === member2Id);

  return {
    tandaId,
    organizerId,
    member1Id,
    member2Id,
    orgParticipantId: orgP.id as string,
    m1ParticipantId: m1P.id as string,
    m2ParticipantId: m2P.id as string,
  };
}

describe('POST /api/tandas/:id/contributions', () => {
  it('records a contribution as paid and returns 201', async () => {
    const { tandaId, orgParticipantId } = await seedActiveTanda();

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .send({ participantId: orgParticipantId, amount: 500 });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      participantId: orgParticipantId,
      amount: 500,
      status: 'paid',
      round: 1,
    });
  });

  it('returns 400 when amount does not match contribution amount', async () => {
    const { tandaId, m1ParticipantId } = await seedActiveTanda();

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .send({ participantId: m1ParticipantId, amount: 999 });

    expect(res.status).toBe(400);
  });

  it('returns 409 when participant already contributed this round', async () => {
    const { tandaId, m2ParticipantId } = await seedActiveTanda();

    await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .send({ participantId: m2ParticipantId, amount: 500 });

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .send({ participantId: m2ParticipantId, amount: 500 });

    expect(res.status).toBe(409);
  });

  it('returns 422 when tanda is not ACTIVE', async () => {
    const organizerId = await seedUser('forming-org@e.com');
    const tanda = await request(app).post('/api/tandas').send({
      name: 'Forming Tanda',
      organizerId,
      contributionAmount: 100,
    });
    const participants = await request(app).get(`/api/tandas/${tanda.body.id}/participants`);
    const orgP = participants.body[0];

    const res = await request(app)
      .post(`/api/tandas/${tanda.body.id}/contributions`)
      .send({ participantId: orgP.id, amount: 100 });

    expect(res.status).toBe(422);
  });

  it('returns 404 when participant does not belong to the tanda', async () => {
    const { tandaId } = await seedActiveTanda();

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .send({ participantId: 'does-not-exist', amount: 500 });

    expect(res.status).toBe(404);
  });
});

describe('GET /api/tandas/:id/rounds/:round', () => {
  it('returns a round summary with participants and their contribution status', async () => {
    const { tandaId, orgParticipantId } = await seedActiveTanda();
    await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .send({ participantId: orgParticipantId, amount: 500 });

    const res = await request(app).get(`/api/tandas/${tandaId}/rounds/1`);

    expect(res.status).toBe(200);
    expect(res.body.round).toBe(1);
    expect(Array.isArray(res.body.contributions)).toBe(true);
    const orgContrib = res.body.contributions.find(
      (c: { participantId: string }) => c.participantId === orgParticipantId,
    );
    expect(orgContrib.status).toBe('paid');
  });
});

describe('GET /api/tandas/:id/participants/:pid/history', () => {
  it('returns contribution history for a participant', async () => {
    const { tandaId, orgParticipantId } = await seedActiveTanda();
    await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .send({ participantId: orgParticipantId, amount: 500 });

    const res = await request(app).get(
      `/api/tandas/${tandaId}/participants/${orgParticipantId}/history`,
    );

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toMatchObject({ participantId: orgParticipantId, status: 'paid' });
  });
});
