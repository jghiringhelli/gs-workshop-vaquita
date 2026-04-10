import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';

// For now, test against the running server
const baseURL = 'http://localhost:3000';

describe('User API', () => {
  it('should create a user', async () => {
    const response = await request(baseURL)
      .post('/api/users')
      .send({ email: 'test@example.com', name: 'Test User' })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.email).toBe('test@example.com');
    expect(response.body.name).toBe('Test User');
  });

  it('should return 422 for invalid email', async () => {
    await request(baseURL)
      .post('/api/users')
      .send({ email: 'invalid-email', name: 'Test User' })
      .expect(422);
  });

  it('should list users', async () => {
    const response = await request(baseURL)
      .get('/api/users')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

  it('should get user by id', async () => {
    // First create a user
    const createResponse = await request(baseURL)
      .post('/api/users')
      .send({ email: 'get@example.com', name: 'Get User' });

    const userId = createResponse.body.id;

    const response = await request(baseURL)
      .get(`/api/users/${userId}`)
      .expect(200);

    expect(response.body.id).toBe(userId);
    expect(response.body.email).toBe('get@example.com');
  });

  it('should return 404 for non-existent user', async () => {
    await request(baseURL)
      .get('/api/users/non-existent-id')
      .expect(404);
  });
});