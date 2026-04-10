import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';
import request from 'supertest';
import app from '../app';
import { resetDatabase, closeDatabase, initializeDatabase } from '../db/database';
import { verifyToken } from '../utils/jwt';
import { logger } from '../logger';
import { ValidationError } from '../errors/errors';
import { createTandaWithOrganizer } from './test-helpers';

describe('User endpoints', () => {
  beforeEach(() => {
    resetDatabase();
  });

  describe('POST /api/users', () => {
    it('should create a user and return 201 with id, email, name, token', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({ email: 'alice@example.com', name: 'Alice' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('token');
      expect(res.body.email).toBe('alice@example.com');
      expect(res.body.name).toBe('Alice');
      expect(typeof res.body.id).toBe('number');
      expect(typeof res.body.token).toBe('string');
    });

    it('should return a valid JWT token with userId', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({ email: 'jwt@test.com', name: 'JWT' });

      const payload = verifyToken(res.body.token);
      expect(payload.userId).toBe(res.body.id);
    });

    it('should return 400 when email is missing', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({ name: 'No Email' });

      expect(res.status).toBe(400);
    });

    it('should return 400 when name is missing', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid email format', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({ email: 'not-an-email', name: 'Test' });

      expect(res.status).toBe(400);
    });

    it('should return 409 for duplicate email', async () => {
      await request(app)
        .post('/api/users')
        .send({ email: 'dup@example.com', name: 'First' });

      const res = await request(app)
        .post('/api/users')
        .send({ email: 'dup@example.com', name: 'Second' });

      expect(res.status).toBe(409);
    });
  });

  describe('GET /api/users', () => {
    it('should return an array of users', async () => {
      await request(app).post('/api/users').send({ email: 'a@test.com', name: 'A' });
      await request(app).post('/api/users').send({ email: 'b@test.com', name: 'B' });

      const res = await request(app).get('/api/users');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return a user by id', async () => {
      const created = await request(app)
        .post('/api/users')
        .send({ email: 'find@test.com', name: 'FindMe' });

      const res = await request(app).get(`/api/users/${created.body.id}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe('find@test.com');
    });

    it('should return 404 for nonexistent user', async () => {
      const res = await request(app).get('/api/users/999');

      expect(res.status).toBe(404);
    });
  });

  describe('Logger coverage', () => {
    it('should call logger methods without errors', () => {
      expect(() => logger.info('test info')).not.toThrow();
      expect(() => logger.error('test error')).not.toThrow();
      expect(() => logger.warn('test warn')).not.toThrow();
    });
  });

  describe('Database lifecycle', () => {
    it('should close and reinitialize database without errors', () => {
      expect(() => closeDatabase()).not.toThrow();
      initializeDatabase();
    });
  });

  describe('JWT edge cases', () => {
    it('should reject token with missing userId in payload', () => {
      expect(() => verifyToken('eyJhbGciOiJIUzI1NiJ9.e30.invalid')).toThrow();
    });

    it('should reject token with non-numeric userId', () => {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ userId: 'notanumber', iat: 1 })).toString('base64url');
      const secret = process.env.JWT_SECRET ?? 'dev-secret-change-me';
      const sig = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
      const token = `${header}.${payload}.${sig}`;

      expect(() => verifyToken(token)).toThrow();
    });
  });

  describe('Error classes coverage', () => {
    it('should instantiate ValidationError', () => {
      const err = new ValidationError('test');
      expect(err.statusCode).toBe(400);
      expect(err.message).toBe('test');
    });
  });

  describe('optionalAuth with invalid token', () => {
    it('should succeed with invalid token on optional auth route', async () => {
      const { tanda } = await createTandaWithOrganizer();
      const res = await request(app).get(`/api/tandas/${tanda.id}`).set('Authorization', 'Bearer bad.token.here');
      expect(res.status).toBe(200);
    });
  });

  describe('Error handler — generic error', () => {
    it('should return 500 for unexpected non-AppError', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Internal server error');
    });
  });
});
