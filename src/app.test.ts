import request from 'supertest';
import { describe, it, expect, beforeEach } from 'vitest';
import { app } from './app';
import db from './db';
import jwt from 'jsonwebtoken';

// Reset DB between tests (in-memory, so just re-run DDL via fresh import wouldn't work.
// Instead we delete rows in the right order.)
beforeEach(() => {
  db.exec('DELETE FROM contributions; DELETE FROM participants; DELETE FROM tandas; DELETE FROM users;');
});

function makeToken(userId: string) {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '1h' });
}

// ── User tests ────────────────────────────────────────────────────────────────

describe('POST /api/users', () => {
  it('creates a user and returns a JWT', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ email: 'alice@example.com', name: 'Alice' });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('alice@example.com');
    expect(res.body.token).toBeTruthy();
  });

  it('returns 409 for duplicate email', async () => {
    await request(app).post('/api/users').send({ email: 'alice@example.com', name: 'Alice' });
    const res = await request(app).post('/api/users').send({ email: 'alice@example.com', name: 'Alice 2' });
    expect(res.status).toBe(409);
  });

  it('returns 400 for invalid email', async () => {
    const res = await request(app).post('/api/users').send({ email: 'not-an-email', name: 'Alice' });
    expect(res.status).toBe(400);
  });
});

// ── Tanda tests ───────────────────────────────────────────────────────────────

describe('POST /api/tandas', () => {
  it('creates a tanda and auto-joins organizer', async () => {
    const userRes = await request(app).post('/api/users').send({ email: 'bob@example.com', name: 'Bob' });
    const { token } = userRes.body;

    const res = await request(app)
      .post('/api/tandas')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Tanda Enero', contributionAmount: 1000 });

    expect(res.status).toBe(201);
    expect(res.body.tanda.status).toBe('forming');
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/tandas').send({ name: 'T', contributionAmount: 100 });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/tandas/:id', () => {
  it('returns tanda with participants', async () => {
    const userRes = await request(app).post('/api/users').send({ email: 'carol@example.com', name: 'Carol' });
    const { token, user } = userRes.body;

    const tandaRes = await request(app)
      .post('/api/tandas')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Mi Tanda', contributionAmount: 500 });

    const tandaId = tandaRes.body.tanda.id;
    const res = await request(app).get(`/api/tandas/${tandaId}`);
    expect(res.status).toBe(200);
    expect(res.body.participants.length).toBe(1);
    expect(res.body.participants[0].user_id).toBe(user.id);
  });

  it('returns 404 for unknown tanda', async () => {
    const res = await request(app).get('/api/tandas/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });
});

// ── Join tests ────────────────────────────────────────────────────────────────

describe('POST /api/tandas/:id/join', () => {
  it('lets a user join a forming tanda', async () => {
    const org = await request(app).post('/api/users').send({ email: 'org@example.com', name: 'Organizer' });
    const member = await request(app).post('/api/users').send({ email: 'member@example.com', name: 'Member' });

    const tandaRes = await request(app)
      .post('/api/tandas')
      .set('Authorization', `Bearer ${org.body.token}`)
      .send({ name: 'Tanda', contributionAmount: 100 });

    const tandaId = tandaRes.body.tanda.id;
    const res = await request(app)
      .post(`/api/tandas/${tandaId}/join`)
      .send({ userId: member.body.user.id });

    expect(res.status).toBe(201);
  });

  it('rejects joining already-joined tanda', async () => {
    const org = await request(app).post('/api/users').send({ email: 'org2@example.com', name: 'Org' });
    const tandaRes = await request(app)
      .post('/api/tandas')
      .set('Authorization', `Bearer ${org.body.token}`)
      .send({ name: 'Tanda', contributionAmount: 100 });

    const tandaId = tandaRes.body.tanda.id;
    // Try joining as organizer (already in)
    const res = await request(app)
      .post(`/api/tandas/${tandaId}/join`)
      .send({ userId: org.body.user.id });
    expect(res.status).toBe(409);
  });
});

// ── Start tests ───────────────────────────────────────────────────────────────

describe('POST /api/tandas/:id/start', () => {
  it('refuses to start with fewer than 3 participants', async () => {
    const org = await request(app).post('/api/users').send({ email: 'org3@example.com', name: 'Org' });
    const tandaRes = await request(app)
      .post('/api/tandas')
      .set('Authorization', `Bearer ${org.body.token}`)
      .send({ name: 'Tanda', contributionAmount: 100 });

    const tandaId = tandaRes.body.tanda.id;
    const res = await request(app)
      .post(`/api/tandas/${tandaId}/start`)
      .set('Authorization', `Bearer ${org.body.token}`);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/3/);
  });

  it('starts tanda when 3+ participants and transitions to active', async () => {
    const org = await request(app).post('/api/users').send({ email: 'org4@example.com', name: 'Org' });
    const u2 = await request(app).post('/api/users').send({ email: 'u2@example.com', name: 'U2' });
    const u3 = await request(app).post('/api/users').send({ email: 'u3@example.com', name: 'U3' });

    const tandaRes = await request(app)
      .post('/api/tandas')
      .set('Authorization', `Bearer ${org.body.token}`)
      .send({ name: 'Tanda', contributionAmount: 100 });
    const tandaId = tandaRes.body.tanda.id;

    await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: u2.body.user.id });
    await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: u3.body.user.id });

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/start`)
      .set('Authorization', `Bearer ${org.body.token}`);

    expect(res.status).toBe(200);
    expect(res.body.tanda.status).toBe('active');
    expect(res.body.tanda.current_round).toBe(1);
    expect(res.body.tanda.total_rounds).toBe(3);
  });
});
