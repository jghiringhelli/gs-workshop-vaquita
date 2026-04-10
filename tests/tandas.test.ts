import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';
import { clearAllTables } from '../src/infrastructure/database';

describe('Tandas API', () => {
  beforeEach(() => clearAllTables());

  it('full tanda lifecycle', async () => {
    // Create organizer
    const org = await request(app)
      .post('/api/users')
      .send({ email: 'org@tanda.com', name: 'Organizer' });
    expect(org.status).toBe(201);

    // Create tanda
    const tanda = await request(app).post('/api/tandas').send({
      name: 'Test Tanda',
      contributionAmount: 100,
      organizerId: org.body.id,
    });
    expect(tanda.status).toBe(201);
    expect(tanda.body.status).toBe('forming');
    expect(tanda.body.currentRound).toBe(0);

    // Create 2 more users and join
    const u2 = await request(app)
      .post('/api/users')
      .send({ email: 'u2@tanda.com', name: 'User Two' });
    const u3 = await request(app)
      .post('/api/users')
      .send({ email: 'u3@tanda.com', name: 'User Three' });

    const join2 = await request(app)
      .post(`/api/tandas/${tanda.body.id}/join`)
      .send({ userId: u2.body.id });
    expect(join2.status).toBe(200);
    expect(join2.body.role).toBe('member');

    const join3 = await request(app)
      .post(`/api/tandas/${tanda.body.id}/join`)
      .send({ userId: u3.body.id });
    expect(join3.status).toBe(200);

    // Non-organizer cannot start
    const badStart = await request(app)
      .post(`/api/tandas/${tanda.body.id}/start`)
      .send({ organizerId: u2.body.id });
    expect(badStart.status).toBe(403);

    // Start tanda
    const start = await request(app)
      .post(`/api/tandas/${tanda.body.id}/start`)
      .send({ organizerId: org.body.id });
    expect(start.status).toBe(200);
    expect(start.body.status).toBe('active');
    expect(start.body.currentRound).toBe(1);
    expect(start.body.totalRounds).toBe(3);

    // Cannot join active tanda
    const u4 = await request(app)
      .post('/api/users')
      .send({ email: 'u4@tanda.com', name: 'User Four' });
    const lateJoin = await request(app)
      .post(`/api/tandas/${tanda.body.id}/join`)
      .send({ userId: u4.body.id });
    expect(lateJoin.status).toBe(409);

    // Get tanda details including participants
    const details = await request(app).get(`/api/tandas/${tanda.body.id}`);
    expect(details.status).toBe(200);
    expect(details.body.participants).toHaveLength(3);

    // List participants
    const participants = await request(app).get(
      `/api/tandas/${tanda.body.id}/participants`,
    );
    expect(participants.status).toBe(200);
    expect(participants.body).toHaveLength(3);

    // Advance round
    const advance = await request(app)
      .post(`/api/tandas/${tanda.body.id}/advance`)
      .send({ organizerId: org.body.id });
    expect(advance.status).toBe(200);
    expect(advance.body.currentRound).toBe(2);

    // Advance again
    const advance2 = await request(app)
      .post(`/api/tandas/${tanda.body.id}/advance`)
      .send({ organizerId: org.body.id });
    expect(advance2.status).toBe(200);
    expect(advance2.body.currentRound).toBe(3);

    // Final advance completes tanda
    const advance3 = await request(app)
      .post(`/api/tandas/${tanda.body.id}/advance`)
      .send({ organizerId: org.body.id });
    expect(advance3.status).toBe(200);
    expect(advance3.body.status).toBe('completed');

    // List tandas filtered by userId
    const myTandas = await request(app).get(`/api/tandas?userId=${org.body.id}`);
    expect(myTandas.status).toBe(200);
    expect(myTandas.body).toHaveLength(1);

    // List all tandas
    const allTandas = await request(app).get('/api/tandas');
    expect(allTandas.status).toBe(200);
    expect(allTandas.body).toHaveLength(1);
  });

  it('cannot start tanda with fewer than 3 participants', async () => {
    const org = await request(app)
      .post('/api/users')
      .send({ email: 'small@tanda.com', name: 'Organizer' });
    const tanda = await request(app).post('/api/tandas').send({
      name: 'Small Tanda',
      contributionAmount: 50,
      organizerId: org.body.id,
    });
    const u2 = await request(app)
      .post('/api/users')
      .send({ email: 'small2@tanda.com', name: 'U2' });
    await request(app)
      .post(`/api/tandas/${tanda.body.id}/join`)
      .send({ userId: u2.body.id });

    // Only 2 participants
    const start = await request(app)
      .post(`/api/tandas/${tanda.body.id}/start`)
      .send({ organizerId: org.body.id });
    expect(start.status).toBe(409);
  });

  it('cancel a forming tanda', async () => {
    const org = await request(app)
      .post('/api/users')
      .send({ email: 'cancel@tanda.com', name: 'Org' });
    const tanda = await request(app).post('/api/tandas').send({
      name: 'Cancel Tanda',
      contributionAmount: 50,
      organizerId: org.body.id,
    });

    const cancel = await request(app)
      .post(`/api/tandas/${tanda.body.id}/cancel`)
      .send({ organizerId: org.body.id });
    expect(cancel.status).toBe(200);
    expect(cancel.body.status).toBe('cancelled');
  });

  it('cannot join a cancelled tanda', async () => {
    const org = await request(app)
      .post('/api/users')
      .send({ email: 'canc2@tanda.com', name: 'Org' });
    const tanda = await request(app).post('/api/tandas').send({
      name: 'Cancelled Tanda',
      contributionAmount: 50,
      organizerId: org.body.id,
    });
    await request(app)
      .post(`/api/tandas/${tanda.body.id}/cancel`)
      .send({ organizerId: org.body.id });

    const u = await request(app)
      .post('/api/users')
      .send({ email: 'late@tanda.com', name: 'Late' });
    const join = await request(app)
      .post(`/api/tandas/${tanda.body.id}/join`)
      .send({ userId: u.body.id });
    expect(join.status).toBe(409);
  });

  it('returns 404 for unknown tanda', async () => {
    const res = await request(app).get(
      '/api/tandas/00000000-0000-0000-0000-000000000000',
    );
    expect(res.status).toBe(404);
  });

  it('user cannot join same tanda twice', async () => {
    const org = await request(app)
      .post('/api/users')
      .send({ email: 'dup@join.com', name: 'Org' });
    const tanda = await request(app).post('/api/tandas').send({
      name: 'Dup Join Tanda',
      contributionAmount: 50,
      organizerId: org.body.id,
    });
    const u = await request(app)
      .post('/api/users')
      .send({ email: 'member@join.com', name: 'Member' });
    await request(app)
      .post(`/api/tandas/${tanda.body.id}/join`)
      .send({ userId: u.body.id });
    const again = await request(app)
      .post(`/api/tandas/${tanda.body.id}/join`)
      .send({ userId: u.body.id });
    expect(again.status).toBe(409);
  });
});
