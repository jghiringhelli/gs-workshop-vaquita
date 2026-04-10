import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app.js';
import { resetDb } from '../../../shared/database/index.js';

let app: ReturnType<typeof createApp>;

/** Creates a user and returns the body */
async function createUser(email: string, name: string) {
  const res = await request(app).post('/api/users').send({ email, name });
  return res.body as { id: string; email: string; name: string };
}

/** Creates a tanda and returns the body */
async function createTanda(name: string, organizerId: string, contributionAmount: number) {
  const res = await request(app)
    .post('/api/tandas')
    .send({ name, organizerId, contributionAmount });
  return res.body as { id: string; status: string; organizerId: string };
}

beforeEach(() => {
  app = createApp();
});

afterEach(() => {
  resetDb();
});

describe('Tandas API', () => {
  describe('POST /api/tandas', () => {
    it('creates a tanda in FORMING status and returns 201', async () => {
      const alice = await createUser('alice@e.com', 'Alice');
      const res = await request(app)
        .post('/api/tandas')
        .send({ name: 'Tanda Enero', organizerId: alice.id, contributionAmount: 1000 });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('forming');
      expect(res.body.organizerId).toBe(alice.id);
    });

    it('returns 400 when body is invalid', async () => {
      const res = await request(app).post('/api/tandas').send({ name: '' });
      expect(res.status).toBe(400);
    });

    it('returns 404 when organizerId is unknown', async () => {
      const res = await request(app)
        .post('/api/tandas')
        .send({ name: 'T', organizerId: '00000000-0000-0000-0000-000000000000', contributionAmount: 100 });
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/tandas', () => {
    it('returns 400 when userId query param is missing', async () => {
      const res = await request(app).get('/api/tandas');
      expect(res.status).toBe(400);
    });

    it('returns tandas for the given user', async () => {
      const alice = await createUser('alice@e.com', 'Alice');
      await createTanda('T1', alice.id, 100);
      await createTanda('T2', alice.id, 200);

      const res = await request(app).get(`/api/tandas?userId=${alice.id}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });
  });

  describe('GET /api/tandas/:id', () => {
    it('returns the tanda', async () => {
      const alice = await createUser('alice@e.com', 'Alice');
      const tanda = await createTanda('T1', alice.id, 100);
      const res = await request(app).get(`/api/tandas/${tanda.id}`);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('T1');
    });

    it('returns 404 for unknown tanda', async () => {
      const res = await request(app).get('/api/tandas/nonexistent');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/tandas/:id/join', () => {
    it('adds a member and returns 201', async () => {
      const alice = await createUser('alice@e.com', 'Alice');
      const bob = await createUser('bob@e.com', 'Bob');
      const tanda = await createTanda('T', alice.id, 100);

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/join`)
        .send({ userId: bob.id });

      expect(res.status).toBe(201);
      expect(res.body.role).toBe('member');
    });

    it('returns 409 when user already joined', async () => {
      const alice = await createUser('alice@e.com', 'Alice');
      const tanda = await createTanda('T', alice.id, 100);

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/join`)
        .send({ userId: alice.id });
      expect(res.status).toBe(409);
    });

    it('returns 400 when userId is not a UUID', async () => {
      const alice = await createUser('alice@e.com', 'Alice');
      const tanda = await createTanda('T', alice.id, 100);

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/join`)
        .send({ userId: 'not-a-uuid' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/tandas/:id/start', () => {
    async function setupWithThreeParticipants() {
      const alice = await createUser('alice@e.com', 'Alice');
      const bob = await createUser('bob@e.com', 'Bob');
      const carol = await createUser('carol@e.com', 'Carol');
      const tanda = await createTanda('T', alice.id, 100);
      await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: bob.id });
      await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: carol.id });
      return { tanda, alice, bob, carol };
    }

    it('starts the tanda and returns status active', async () => {
      const { tanda, alice } = await setupWithThreeParticipants();
      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/start`)
        .send({ userId: alice.id });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('active');
      expect(res.body.totalRounds).toBe(3);
    });

    it('returns 400 when fewer than 3 participants', async () => {
      const alice = await createUser('alice@e.com', 'Alice');
      const bob = await createUser('bob@e.com', 'Bob');
      const tanda = await createTanda('T', alice.id, 100);
      await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: bob.id });

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/start`)
        .send({ userId: alice.id });
      expect(res.status).toBe(400);
    });

    it('returns 403 when caller is not the organizer', async () => {
      const { tanda, bob } = await setupWithThreeParticipants();
      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/start`)
        .send({ userId: bob.id });
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/tandas/:id/participants', () => {
    it('lists all participants', async () => {
      const alice = await createUser('alice@e.com', 'Alice');
      const bob = await createUser('bob@e.com', 'Bob');
      const tanda = await createTanda('T', alice.id, 100);
      await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: bob.id });

      const res = await request(app).get(`/api/tandas/${tanda.id}/participants`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });
  });

  describe('POST /api/tandas/:id/cancel', () => {
    it('cancels a tanda', async () => {
      const alice = await createUser('alice@e.com', 'Alice');
      const tanda = await createTanda('T', alice.id, 100);

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/cancel`)
        .send({ userId: alice.id });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('cancelled');
    });

    it('returns 403 when caller is not the organizer', async () => {
      const alice = await createUser('alice@e.com', 'Alice');
      const bob = await createUser('bob@e.com', 'Bob');
      const tanda = await createTanda('T', alice.id, 100);

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/cancel`)
        .send({ userId: bob.id });
      expect(res.status).toBe(403);
    });
  });
});


