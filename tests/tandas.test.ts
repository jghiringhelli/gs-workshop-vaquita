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

async function createUser(app: ReturnType<typeof buildApp>, email: string, name: string) {
  const res = await request(app).post('/api/users').send({ email, name });
  return res.body.data as { id: string; email: string; name: string };
}

async function createTanda(
  app: ReturnType<typeof buildApp>,
  organizerId: string,
  name = 'Test Tanda',
  amount = 100,
) {
  const res = await request(app)
    .post('/api/tandas')
    .send({ name, organizerId, contributionAmount: amount });
  return res.body.data as { id: string; organizerId: string; status: string };
}

describe('Tandas API', () => {
  describe('POST /api/tandas', () => {
    const app = buildApp();

    it('creates a tanda and returns 201', async () => {
      const user = await createUser(app, 'org1@test.com', 'Org1');
      const res = await request(app)
        .post('/api/tandas')
        .send({ name: 'My Tanda', organizerId: user.id, contributionAmount: 200 });
      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ name: 'My Tanda', status: 'forming' });
    });

    it('returns 422 for missing fields', async () => {
      const res = await request(app).post('/api/tandas').send({ name: 'No Organizer' });
      expect(res.status).toBe(422);
    });

    it('returns 404 for unknown organizer', async () => {
      const res = await request(app).post('/api/tandas').send({
        name: 'Ghost Tanda',
        organizerId: '00000000-0000-0000-0000-000000000000',
        contributionAmount: 100,
      });
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/tandas', () => {
    const app = buildApp();

    it('returns tandas for a userId', async () => {
      const user = await createUser(app, 'list-org@test.com', 'ListOrg');
      await createTanda(app, user.id, 'ListTanda');
      const res = await request(app).get(`/api/tandas?userId=${user.id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('returns empty array when no userId provided', async () => {
      const res = await request(app).get('/api/tandas');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/tandas/:id', () => {
    const app = buildApp();
    let tandaId: string;

    beforeAll(async () => {
      const user = await createUser(app, 'get-tanda@test.com', 'GetTanda');
      const tanda = await createTanda(app, user.id);
      tandaId = tanda.id;
    });

    it('returns 200 with the tanda', async () => {
      const res = await request(app).get(`/api/tandas/${tandaId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(tandaId);
    });

    it('returns 404 for unknown tanda', async () => {
      const res = await request(app).get('/api/tandas/00000000-0000-0000-0000-000000000000');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/tandas/:id/join', () => {
    const app = buildApp();
    let tandaId: string;
    let orgId: string;

    beforeAll(async () => {
      const org = await createUser(app, 'join-org@test.com', 'JoinOrg');
      orgId = org.id;
      const tanda = await createTanda(app, orgId, 'JoinTanda');
      tandaId = tanda.id;
    });

    it('joins a forming tanda and returns 201', async () => {
      const member = await createUser(app, 'join-member@test.com', 'JoinMember');
      const res = await request(app)
        .post(`/api/tandas/${tandaId}/join`)
        .send({ userId: member.id });
      expect(res.status).toBe(201);
      expect(res.body.data.userId).toBe(member.id);
    });

    it('returns 409 when user already joined', async () => {
      const member = await createUser(app, 'join-dup@test.com', 'JoinDup');
      await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: member.id });
      const res = await request(app)
        .post(`/api/tandas/${tandaId}/join`)
        .send({ userId: member.id });
      expect(res.status).toBe(409);
    });

    it('returns 422 when tanda is not forming', async () => {
      // Start the tanda first — need 3 participants total (org already joined)
      const m2 = await createUser(app, 'join-m2@test.com', 'M2');
      const m3 = await createUser(app, 'join-m3@test.com', 'M3');
      await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: m2.id });
      await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: m3.id });
      await request(app).post(`/api/tandas/${tandaId}/start`).send({ userId: orgId });

      const newMember = await createUser(app, 'join-late@test.com', 'Late');
      const res = await request(app)
        .post(`/api/tandas/${tandaId}/join`)
        .send({ userId: newMember.id });
      expect(res.status).toBe(422);
    });
  });

  describe('POST /api/tandas/:id/start', () => {
    const app = buildApp();

    it('starts a tanda with enough participants', async () => {
      const org = await createUser(app, 'start-org@test.com', 'StartOrg');
      const m1 = await createUser(app, 'start-m1@test.com', 'M1');
      const m2 = await createUser(app, 'start-m2@test.com', 'M2');
      const tanda = await createTanda(app, org.id, 'StartTanda');
      await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m1.id });
      await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m2.id });

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/start`)
        .send({ userId: org.id });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('active');
      expect(res.body.data.totalRounds).toBe(3);
    });

    it('returns 403 when non-organizer tries to start', async () => {
      const org = await createUser(app, 'start403-org@test.com', 'Org');
      const m1 = await createUser(app, 'start403-m1@test.com', 'M1');
      const m2 = await createUser(app, 'start403-m2@test.com', 'M2');
      const tanda = await createTanda(app, org.id, 'ForbTanda');
      await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m1.id });
      await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m2.id });

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/start`)
        .send({ userId: m1.id });
      expect(res.status).toBe(403);
    });

    it('returns 422 when too few participants', async () => {
      const org = await createUser(app, 'start422-org@test.com', 'Org');
      const tanda = await createTanda(app, org.id, 'SmallTanda');
      // Only 1 participant (the organizer)
      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/start`)
        .send({ userId: org.id });
      expect(res.status).toBe(422);
    });
  });

  describe('POST /api/tandas/:id/cancel', () => {
    const app = buildApp();

    it('cancels a forming tanda', async () => {
      const org = await createUser(app, 'cancel-org@test.com', 'CancelOrg');
      const tanda = await createTanda(app, org.id, 'CancelTanda');
      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/cancel`)
        .send({ userId: org.id });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('cancelled');
    });

    it('returns 403 when non-organizer tries to cancel', async () => {
      const org = await createUser(app, 'cancel403-org@test.com', 'Org');
      const member = await createUser(app, 'cancel403-mem@test.com', 'Mem');
      const tanda = await createTanda(app, org.id, 'Cancel403Tanda');
      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/cancel`)
        .send({ userId: member.id });
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/tandas/:id/participants', () => {
    const app = buildApp();

    it('returns participants list', async () => {
      const org = await createUser(app, 'parts-org@test.com', 'PartsOrg');
      const m1 = await createUser(app, 'parts-m1@test.com', 'PM1');
      const tanda = await createTanda(app, org.id, 'PartsTanda');
      await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m1.id });

      const res = await request(app).get(`/api/tandas/${tanda.id}/participants`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
    });
  });

  describe('POST /api/tandas/:id/advance', () => {
    const app = buildApp();

    it('advances round and completes tanda after all rounds', async () => {
      const org = await createUser(app, 'adv-org@test.com', 'AdvOrg');
      const m1 = await createUser(app, 'adv-m1@test.com', 'AdvM1');
      const m2 = await createUser(app, 'adv-m2@test.com', 'AdvM2');
      const tanda = await createTanda(app, org.id, 'AdvTanda');
      await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m1.id });
      await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m2.id });
      await request(app).post(`/api/tandas/${tanda.id}/start`).send({ userId: org.id });

      // Advance round 1 -> 2
      const res1 = await request(app)
        .post(`/api/tandas/${tanda.id}/advance`)
        .send({ userId: org.id });
      expect(res1.status).toBe(200);
      expect(res1.body.data.currentRound).toBe(2);

      // Advance round 2 -> 3
      const res2 = await request(app)
        .post(`/api/tandas/${tanda.id}/advance`)
        .send({ userId: org.id });
      expect(res2.status).toBe(200);
      expect(res2.body.data.currentRound).toBe(3);

      // Advance round 3 -> completed (3 total rounds)
      const res3 = await request(app)
        .post(`/api/tandas/${tanda.id}/advance`)
        .send({ userId: org.id });
      expect(res3.status).toBe(200);
      expect(res3.body.data.status).toBe('completed');
    });

    it('returns 403 when non-organizer advances', async () => {
      const org = await createUser(app, 'adv403-org@test.com', 'AdvOrg403');
      const m1 = await createUser(app, 'adv403-m1@test.com', 'AdvM1-403');
      const m2 = await createUser(app, 'adv403-m2@test.com', 'AdvM2-403');
      const tanda = await createTanda(app, org.id, 'Adv403Tanda');
      await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m1.id });
      await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m2.id });
      await request(app).post(`/api/tandas/${tanda.id}/start`).send({ userId: org.id });

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/advance`)
        .send({ userId: m1.id });
      expect(res.status).toBe(403);
    });
  });
});
