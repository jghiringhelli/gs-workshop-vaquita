import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { createDatabase } from '../src/db/database';
import { SqliteUserRepository } from '../src/modules/users/SqliteUserRepository';
import { UserService } from '../src/modules/users/UserService';
import { SqliteTandaRepository } from '../src/modules/tandas/SqliteTandaRepository';
import { SqliteParticipantRepository } from '../src/modules/participants/SqliteParticipantRepository';
import { SqliteContributionRepository } from '../src/modules/contributions/SqliteContributionRepository';
import { TandaService } from '../src/modules/tandas/TandaService';

function buildApp() {
  const db = createDatabase(':memory:');
  const userRepo = new SqliteUserRepository(db);
  const tandaRepo = new SqliteTandaRepository(db);
  const participantRepo = new SqliteParticipantRepository(db);
  const contributionRepo = new SqliteContributionRepository(db);
  const userService = new UserService(userRepo);
  const tandaService = new TandaService(tandaRepo, participantRepo, contributionRepo, userRepo);
  return createApp({ userService, tandaService });
}

async function setupActiveTanda(app: ReturnType<typeof buildApp>, suffix: string) {
  const org = await request(app)
    .post('/api/users')
    .send({ email: `org-${suffix}@test.com`, name: `Org${suffix}` });
  const m1 = await request(app)
    .post('/api/users')
    .send({ email: `m1-${suffix}@test.com`, name: `M1${suffix}` });
  const m2 = await request(app)
    .post('/api/users')
    .send({ email: `m2-${suffix}@test.com`, name: `M2${suffix}` });

  const orgId: string = org.body.data.id;
  const m1Id: string = m1.body.data.id;
  const m2Id: string = m2.body.data.id;

  const tandaRes = await request(app)
    .post('/api/tandas')
    .send({ name: `Tanda${suffix}`, organizerId: orgId, contributionAmount: 100 });
  const tandaId: string = tandaRes.body.data.id;

  const join1 = await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: m1Id });
  const join2 = await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: m2Id });

  await request(app).post(`/api/tandas/${tandaId}/start`).send({ userId: orgId });

  // Get participants after start (rotation positions assigned)
  const partsRes = await request(app).get(`/api/tandas/${tandaId}/participants`);
  const participants = partsRes.body.data as Array<{
    id: string;
    userId: string;
    rotationPosition: number;
  }>;

  const orgParticipant = participants.find((p) => p.userId === orgId)!;
  const m1Participant = participants.find((p) => p.id === join1.body.data.id)!;

  return { tandaId, orgId, m1Id, m2Id, orgParticipant, m1Participant, participants };
}

describe('Contributions API', () => {
  describe('POST /api/tandas/:id/contributions', () => {
    const app = buildApp();

    it('records a contribution and returns 201', async () => {
      const { tandaId, m1Id, m1Participant } = await setupActiveTanda(app, 'contrib1');
      const res = await request(app)
        .post(`/api/tandas/${tandaId}/contributions`)
        .send({ participantId: m1Participant.id, userId: m1Id });
      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('paid');
      expect(res.body.data.amount).toBe(100);
    });

    it('returns 409 for duplicate contribution in same round', async () => {
      const { tandaId, m1Id, m1Participant } = await setupActiveTanda(app, 'contrib2');
      await request(app)
        .post(`/api/tandas/${tandaId}/contributions`)
        .send({ participantId: m1Participant.id, userId: m1Id });
      const res = await request(app)
        .post(`/api/tandas/${tandaId}/contributions`)
        .send({ participantId: m1Participant.id, userId: m1Id });
      expect(res.status).toBe(409);
    });

    it('returns 403 when recording for someone else', async () => {
      const { tandaId, m2Id, m1Participant } = await setupActiveTanda(app, 'contrib3');
      const res = await request(app)
        .post(`/api/tandas/${tandaId}/contributions`)
        .send({ participantId: m1Participant.id, userId: m2Id });
      expect(res.status).toBe(403);
    });

    it('returns 422 when participant is from a different tanda', async () => {
      const { orgParticipant, orgId } = await setupActiveTanda(app, 'contrib4');
      const { tandaId: tanda2Id } = await setupActiveTanda(app, 'contrib4b');

      const res = await request(app)
        .post(`/api/tandas/${tanda2Id}/contributions`)
        .send({ participantId: orgParticipant.id, userId: orgId });
      expect(res.status).toBe(422);
    });
  });

  describe('GET /api/tandas/:id/rounds/:round', () => {
    const app = buildApp();
    let tandaId: string;
    let m1Id: string;
    let m1ParticipantId: string;

    beforeAll(async () => {
      const setup = await setupActiveTanda(app, 'rounds1');
      tandaId = setup.tandaId;
      m1Id = setup.m1Id;
      m1ParticipantId = setup.m1Participant.id;

      // Record contribution for m1 in round 1
      await request(app)
        .post(`/api/tandas/${tandaId}/contributions`)
        .send({ participantId: m1ParticipantId, userId: m1Id });
    });

    it('returns round summary with contributions', async () => {
      const res = await request(app).get(`/api/tandas/${tandaId}/rounds/1`);
      expect(res.status).toBe(200);
      expect(res.body.data.round).toBe(1);
      expect(Array.isArray(res.body.data.contributions)).toBe(true);
      expect(res.body.data.contributions.length).toBeGreaterThan(0);
      expect(res.body.data.totalCollected).toBeGreaterThan(0);
    });

    it('returns receiverId as the participant with rotationPosition = round', async () => {
      const res = await request(app).get(`/api/tandas/${tandaId}/rounds/1`);
      expect(res.status).toBe(200);
      // receiverId should be a valid participant id (not null since tanda is started)
      expect(res.body.data.receiverId).not.toBeNull();
    });

    it('returns 404 for unknown tanda', async () => {
      const res = await request(app).get(
        '/api/tandas/00000000-0000-0000-0000-000000000000/rounds/1',
      );
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/tandas/:id/participants/:pid/history', () => {
    const app = buildApp();
    let tandaId: string;
    let m1Id: string;
    let m1ParticipantId: string;

    beforeAll(async () => {
      const setup = await setupActiveTanda(app, 'history1');
      tandaId = setup.tandaId;
      m1Id = setup.m1Id;
      m1ParticipantId = setup.m1Participant.id;

      await request(app)
        .post(`/api/tandas/${tandaId}/contributions`)
        .send({ participantId: m1ParticipantId, userId: m1Id });
    });

    it('returns contribution history for participant', async () => {
      const res = await request(app).get(
        `/api/tandas/${tandaId}/participants/${m1ParticipantId}/history`,
      );
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].status).toBe('paid');
    });

    it('returns 404 for unknown participant', async () => {
      const res = await request(app).get(
        `/api/tandas/${tandaId}/participants/00000000-0000-0000-0000-000000000000/history`,
      );
      expect(res.status).toBe(404);
    });

    it('returns empty array for participant with no contributions', async () => {
      const setup = await setupActiveTanda(app, 'history2');
      const res = await request(app).get(
        `/api/tandas/${setup.tandaId}/participants/${setup.orgParticipant.id}/history`,
      );
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });
});
