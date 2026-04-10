import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import app from '../index'
import { prisma } from '../lib/prisma'

describe('User Authentication', () => {
  beforeEach(async () => {
    // Clean up users before each test
    await prisma.user.deleteMany({})
  })

  afterEach(async () => {
    // Clean up after tests
    await prisma.user.deleteMany({})
  })

  describe('POST /api/users/register', () => {
    it('should register a new user and return token', async () => {
      const response = await request(app).post('/api/users/register').send({
        email: 'alice@example.com',
        name: 'Alice',
        password: 'testpassword123',
      })

      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('email', 'alice@example.com')
      expect(response.body).toHaveProperty('name', 'Alice')
      expect(response.body).toHaveProperty('token')
      expect(response.body).not.toHaveProperty('password')
    })

    it('should not register user with duplicate email', async () => {
      // First registration
      await request(app).post('/api/users/register').send({
        email: 'alice@example.com',
        name: 'Alice',
        password: 'testpassword123',
      })

      // Attempt duplicate
      const response = await request(app).post('/api/users/register').send({
        email: 'alice@example.com',
        name: 'Alice Smith',
        password: 'differentpassword123',
      })

      expect(response.status).toBe(409)
      expect(response.body).toHaveProperty('error')
    })

    it('should reject registration with invalid email', async () => {
      const response = await request(app).post('/api/users/register').send({
        email: 'not-an-email',
        name: 'Alice',
        password: 'testpassword123',
      })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'Validation error')
    })

    it('should reject registration with password too short', async () => {
      const response = await request(app).post('/api/users/register').send({
        email: 'alice@example.com',
        name: 'Alice',
        password: 'short',
      })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'Validation error')
    })

    it('should reject registration with missing name', async () => {
      const response = await request(app).post('/api/users/register').send({
        email: 'alice@example.com',
        password: 'testpassword123',
      })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'Validation error')
    })

    it('should not return password hash in response', async () => {
      const response = await request(app).post('/api/users/register').send({
        email: 'alice@example.com',
        name: 'Alice',
        password: 'testpassword123',
      })

      expect(response.status).toBe(201)
      expect(response.body).not.toHaveProperty('password')
    })
  })

  describe('POST /api/users/login', () => {
    beforeEach(async () => {
      // Register a user for login tests
      await request(app).post('/api/users/register').send({
        email: 'alice@example.com',
        name: 'Alice',
        password: 'testpassword123',
      })
    })

    it('should login user with correct credentials', async () => {
      const response = await request(app).post('/api/users/login').send({
        email: 'alice@example.com',
        password: 'testpassword123',
      })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('email', 'alice@example.com')
      expect(response.body).toHaveProperty('token')
      expect(response.body).not.toHaveProperty('password')
    })

    it('should not login with wrong password', async () => {
      const response = await request(app).post('/api/users/login').send({
        email: 'alice@example.com',
        password: 'wrongpassword',
      })

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error', 'Invalid email or password')
    })

    it('should not login with non-existent email', async () => {
      const response = await request(app).post('/api/users/login').send({
        email: 'nonexistent@example.com',
        password: 'testpassword123',
      })

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error', 'Invalid email or password')
    })

    it('should reject login with invalid email format', async () => {
      const response = await request(app).post('/api/users/login').send({
        email: 'not-an-email',
        password: 'testpassword123',
      })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'Validation error')
    })

    it('should reject login with missing password', async () => {
      const response = await request(app).post('/api/users/login').send({
        email: 'alice@example.com',
      })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'Validation error')
    })
  })
})
