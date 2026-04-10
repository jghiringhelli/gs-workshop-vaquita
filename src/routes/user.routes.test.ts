import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import Database from 'better-sqlite3';
import { UserRepository } from '../repositories/user.repository';
import { UserService } from '../services/user.service';
import { createUserRoutes } from '../routes/user.routes';

describe('User Endpoints', () => {
  let app: any;
  let db: Database.Database;
  let userRepository: UserRepository;
  let userService: UserService;

  beforeEach(() => {
    // Create in-memory database for tests
    db = new Database(':memory:');
    userRepository = new UserRepository(db);
    userRepository.init();
    userService = new UserService(userRepository);

    // Create Express app
    app = express();
    app.use(express.json());
    app.use('/api/users', createUserRoutes(userService));
  });

  describe('POST /api/users', () => {
    it('should create a user with valid data', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({ email: 'john@example.com', name: 'John Doe' });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe('john@example.com');
      expect(response.body.name).toBe('John Doe');
      expect(response.body).toHaveProperty('createdAt');
    });

    it('should return 400 for missing email', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({ name: 'John Doe' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({ email: 'invalid-email', name: 'John Doe' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for missing name', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({ email: 'john@example.com' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 409 for duplicate email', async () => {
      await request(app)
        .post('/api/users')
        .send({ email: 'john@example.com', name: 'John Doe' });

      const response = await request(app)
        .post('/api/users')
        .send({ email: 'john@example.com', name: 'Jane Doe' });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('GET /api/users', () => {
    it('should return empty array initially', async () => {
      const response = await request(app).get('/api/users');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return all users', async () => {
      await request(app)
        .post('/api/users')
        .send({ email: 'john@example.com', name: 'John Doe' });

      await request(app)
        .post('/api/users')
        .send({ email: 'jane@example.com', name: 'Jane Doe' });

      const response = await request(app).get('/api/users');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].email).toBe('john@example.com');
      expect(response.body[1].email).toBe('jane@example.com');
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return user by id', async () => {
      const createResponse = await request(app)
        .post('/api/users')
        .send({ email: 'john@example.com', name: 'John Doe' });

      const userId = createResponse.body.id;

      const response = await request(app).get(`/api/users/${userId}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(userId);
      expect(response.body.email).toBe('john@example.com');
      expect(response.body.name).toBe('John Doe');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app).get('/api/users/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });
  });
});
