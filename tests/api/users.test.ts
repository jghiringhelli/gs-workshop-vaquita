import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';

describe('User API', () => {
  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      const app = createApp();
      const response = await request(app)
        .post('/api/users')
        .send({
          email: 'alice@example.com',
          name: 'Alice',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(Number),
        email: 'alice@example.com',
        name: 'Alice',
        createdAt: expect.any(String),
      });
    });

    it('should return 400 for invalid email', async () => {
      const app = createApp();
      const response = await request(app)
        .post('/api/users')
        .send({
          email: 'invalid-email',
          name: 'Alice',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'ValidationError',
      });
    });

    it('should return 400 for missing name', async () => {
      const app = createApp();
      const response = await request(app)
        .post('/api/users')
        .send({
          email: 'alice@example.com',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'ValidationError',
      });
    });

    it('should return 400 for duplicate email', async () => {
      const app = createApp();
      await request(app)
        .post('/api/users')
        .send({
          email: 'alice@example.com',
          name: 'Alice',
        })
        .expect(201);

      const response = await request(app)
        .post('/api/users')
        .send({
          email: 'alice@example.com',
          name: 'Alice 2',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'ValidationError',
      });
    });
  });

  describe('GET /api/users', () => {
    it('should return empty array when no users exist', async () => {
      const app = createApp();
      const response = await request(app).get('/api/users').expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return list of users', async () => {
      const app = createApp();
      await request(app)
        .post('/api/users')
        .send({ email: 'alice@example.com', name: 'Alice' });
      await request(app)
        .post('/api/users')
        .send({ email: 'bob@example.com', name: 'Bob' });

      const response = await request(app).get('/api/users').expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toMatchObject({
        email: 'alice@example.com',
        name: 'Alice',
      });
      expect(response.body[1]).toMatchObject({
        email: 'bob@example.com',
        name: 'Bob',
      });
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return user by id', async () => {
      const app = createApp();
      const createResponse = await request(app)
        .post('/api/users')
        .send({ email: 'alice@example.com', name: 'Alice' });

      const userId = createResponse.body.id;

      const response = await request(app).get(`/api/users/${userId}`).expect(200);

      expect(response.body).toMatchObject({
        id: userId,
        email: 'alice@example.com',
        name: 'Alice',
      });
    });

    it('should return 404 for non-existent user', async () => {
      const app = createApp();
      const response = await request(app).get('/api/users/999').expect(404);

      expect(response.body).toMatchObject({
        error: 'NotFoundError',
      });
    });

    it('should return 400 for invalid id', async () => {
      const app = createApp();
      const response = await request(app).get('/api/users/invalid').expect(400);

      expect(response.body).toMatchObject({
        error: 'ValidationError',
      });
    });
  });
});
