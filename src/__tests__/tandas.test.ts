import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';

const baseURL = 'http://localhost:3000';

describe('Tanda API', () => {
  let userId: string;
  let tandaId: string;

  beforeEach(async () => {
    // Create a test user
    const userResponse = await request(baseURL)
      .post('/api/users')
      .send({ email: `test${Date.now()}@example.com`, name: 'Test User' });
    userId = userResponse.body.id;
  });

  it('should create a tanda', async () => {
    const response = await request(baseURL)
      .post('/api/tandas')
      .send({
        name: 'Test Tanda',
        organizerId: userId,
        contributionAmount: 500
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe('Test Tanda');
    expect(response.body.status).toBe('forming');
    tandaId = response.body.id;
  });

  it('should get tanda by id', async () => {
    // First create a tanda
    const createResponse = await request(baseURL)
      .post('/api/tandas')
      .send({
        name: 'Get Test Tanda',
        organizerId: userId,
        contributionAmount: 600
      });
    const id = createResponse.body.id;

    const response = await request(baseURL)
      .get(`/api/tandas/${id}`)
      .expect(200);

    expect(response.body.id).toBe(id);
    expect(response.body.name).toBe('Get Test Tanda');
  });

  it('should return 404 for non-existent tanda', async () => {
    await request(baseURL)
      .get('/api/tandas/non-existent-id')
      .expect(404);
  });

  it('should list tandas for user', async () => {
    // Create a tanda first
    await request(baseURL)
      .post('/api/tandas')
      .send({
        name: 'List Test Tanda',
        organizerId: userId,
        contributionAmount: 700
      });

    const response = await request(baseURL)
      .get(`/api/tandas?userId=${userId}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });

  it('should join a tanda', async () => {
    // Create tanda
    const tandaResponse = await request(baseURL)
      .post('/api/tandas')
      .send({
        name: 'Join Test Tanda',
        organizerId: userId,
        contributionAmount: 800
      });
    const tid = tandaResponse.body.id;

    // Create another user
    const user2Response = await request(baseURL)
      .post('/api/users')
      .send({ email: `join${Date.now()}@example.com`, name: 'Join User' });
    const uid2 = user2Response.body.id;

    const response = await request(baseURL)
      .post(`/api/tandas/${tid}/join`)
      .send({ userId: uid2 })
      .expect(201);

    expect(response.body.userId).toBe(uid2);
    expect(response.body.tandaId).toBe(tid);
    expect(response.body.role).toBe('member');
  });

  it('should start a tanda with 3 participants', async () => {
    // Create tanda
    const tandaResponse = await request(baseURL)
      .post('/api/tandas')
      .send({
        name: 'Start Test Tanda',
        organizerId: userId,
        contributionAmount: 900
      });
    const tid = tandaResponse.body.id;

    // Create 2 more users and join
    for (let i = 0; i < 2; i++) {
      const userResponse = await request(baseURL)
        .post('/api/users')
        .send({ email: `start${i}${Date.now()}@example.com`, name: `Start User ${i}` });
      const uid = userResponse.body.id;

      await request(baseURL)
        .post(`/api/tandas/${tid}/join`)
        .send({ userId: uid });
    }

    const response = await request(baseURL)
      .post(`/api/tandas/${tid}/start`)
      .send({ organizerId: userId })
      .expect(200);

    expect(response.body.status).toBe('active');
    expect(response.body.currentRound).toBe(1);
    expect(response.body.totalRounds).toBe(3);
  });

  it('should return 422 when starting tanda with less than 3 participants', async () => {
    // Create tanda with only organizer
    const tandaResponse = await request(baseURL)
      .post('/api/tandas')
      .send({
        name: 'Fail Start Tanda',
        organizerId: userId,
        contributionAmount: 1000
      });
    const tid = tandaResponse.body.id;

    await request(baseURL)
      .post(`/api/tandas/${tid}/start`)
      .send({ organizerId: userId })
      .expect(422);
  });
});