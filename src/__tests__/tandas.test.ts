import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import app from '../index'
import { prisma } from '../lib/prisma'
import { generateToken } from '../lib/auth'

describe('Tanda Management', () => {
  let userId1: string
  let userId2: string
  let tandaId: string
  let token1: string
  let token2: string
  let participantId1: string

  beforeEach(async () => {
    // Clean up in proper order to respect foreign keys
    await prisma.withdrawalVote.deleteMany({})
    await prisma.withdrawal.deleteMany({})
    await prisma.tandaAuditLog.deleteMany({})
    await prisma.contribution.deleteMany({})
    await prisma.payout.deleteMany({})
    await prisma.participant.deleteMany({})
    await prisma.tanda.deleteMany({})
    await prisma.user.deleteMany({})

    // Create test users with unique emails
    const timestamp = Date.now()
    const user1 = await prisma.user.create({
      data: {
        email: `alice-${timestamp}@example.com`,
        name: 'Alice',
        password: 'hashed',
      },
    })
    userId1 = user1.id
    token1 = generateToken(userId1)

    const user2 = await prisma.user.create({
      data: {
        email: `bob-${timestamp}@example.com`,
        name: 'Bob',
        password: 'hashed',
      },
    })
    userId2 = user2.id
    token2 = generateToken(userId2)
  })

  afterEach(async () => {
    // Clean up in reverse order
    try {
      await prisma.$executeRaw`PRAGMA foreign_keys = OFF`
      await prisma.withdrawalVote.deleteMany({})
      await prisma.withdrawal.deleteMany({})
      await prisma.tandaAuditLog.deleteMany({})
      await prisma.contribution.deleteMany({})
      await prisma.payout.deleteMany({})
      await prisma.participant.deleteMany({})
      await prisma.tanda.deleteMany({})
      await prisma.user.deleteMany({})
      await prisma.$executeRaw`PRAGMA foreign_keys = ON`
    } catch (e) {
      // Ignore cleanup errors
    }
  })

  describe('POST /api/tandas', () => {
    it('should create a new tanda and add organizer as first participant', async () => {
      const response = await request(app)
        .post('/api/tandas')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          name: 'Tanda Enero',
          purpose: 'Monthly savings',
          contributionAmount: 10000,
          totalRounds: 5,
          targetAmount: 50000,
        })

      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('id')
      expect(response.body.name).toBe('Tanda Enero')
      expect(response.body.status).toBe('FORMING')
      expect(response.body.totalRounds).toBe(5)
      expect(response.body.contributionAmount).toBe(10000)

      tandaId = response.body.id

      // Verify organizer was auto-added as participant
      const tanda = await prisma.tanda.findUnique({
        where: { id: tandaId },
        include: { participants: true },
      })
      expect(tanda?.participants.length).toBe(1)
      expect(tanda?.participants[0].role).toBe('ORGANIZER')
      expect(tanda?.participants[0].userId).toBe(userId1)
    })

    it('should require authentication', async () => {
      const response = await request(app).post('/api/tandas').send({
        name: 'Tanda Enero',
        contributionAmount: 10000,
        totalRounds: 5,
      })

      expect(response.status).toBe(401)
    })

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/tandas')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          // missing name
          contributionAmount: 10000,
          totalRounds: 5,
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'Validation error')
    })
  })

  describe('GET /api/tandas/:id', () => {
    beforeEach(async () => {
      const tanda = await prisma.tanda.create({
        data: {
          name: 'Tanda Enero',
          organizerId: userId1,
          contributionAmount: 10000,
          totalRounds: 5,
          status: 'FORMING',
        },
      })
      tandaId = tanda.id

      const participant = await prisma.participant.create({
        data: {
          userId: userId1,
          tandaId,
          role: 'ORGANIZER',
          rotationPosition: 0,
        },
      })
      participantId1 = participant.id
    })

    it('should return tanda details with participants', async () => {
      const response = await request(app)
        .get(`/api/tandas/${tandaId}`)
        .set('Authorization', `Bearer ${token1}`)

      expect(response.status).toBe(200)
      expect(response.body.id).toBe(tandaId)
      expect(response.body.name).toBe('Tanda Enero')
      expect(response.body.participants).toHaveLength(1)
      expect(response.body.participants[0].role).toBe('ORGANIZER')
    })

    it('should return 404 for non-existent tanda', async () => {
      const response = await request(app)
        .get('/api/tandas/nonexistent')
        .set('Authorization', `Bearer ${token1}`)

      expect(response.status).toBe(404)
    })

    it('should require authentication', async () => {
      const response = await request(app).get(`/api/tandas/${tandaId}`)

      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/tandas/:id/preview', () => {
    beforeEach(async () => {
      const tanda = await prisma.tanda.create({
        data: {
          name: 'Tanda Enero',
          organizerId: userId1,
          contributionAmount: 10000,
          totalRounds: 5,
          status: 'FORMING',
        },
      })
      tandaId = tanda.id
    })

    it('should return public preview without auth', async () => {
      const response = await request(app).get(`/api/tandas/${tandaId}/preview`)

      expect(response.status).toBe(200)
      expect(response.body.id).toBe(tandaId)
      expect(response.body.name).toBe('Tanda Enero')
      expect(response.body.status).toBe('FORMING')
    })

    it('should return 404 for non-existent tanda', async () => {
      const response = await request(app).get('/api/tandas/nonexistent/preview')

      expect(response.status).toBe(404)
    })
  })

  describe('POST /api/tandas/:id/invite', () => {
    beforeEach(async () => {
      const tanda = await prisma.tanda.create({
        data: {
          name: 'Tanda Enero',
          organizerId: userId1,
          contributionAmount: 10000,
          totalRounds: 5,
          status: 'FORMING',
        },
      })
      tandaId = tanda.id

      await prisma.participant.create({
        data: {
          userId: userId1,
          tandaId,
          role: 'ORGANIZER',
          rotationPosition: 0,
        },
      })
    })

    it('should invite a user as member', async () => {
      const response = await request(app)
        .post(`/api/tandas/${tandaId}/invite`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          userId: userId2,
        })

      expect(response.status).toBe(201)
      expect(response.body.role).toBe('MEMBER')
      expect(response.body.userId).toBe(userId2)
    })

    it('should not invite duplicate participant', async () => {
      // Add user2 first
      await request(app)
        .post(`/api/tandas/${tandaId}/invite`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ userId: userId2 })

      // Try to add again
      const response = await request(app)
        .post(`/api/tandas/${tandaId}/invite`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ userId: userId2 })

      expect(response.status).toBe(400)
      expect(response.body.error).toContain('already a participant')
    })

    it('should reject invite if not organizer', async () => {
      // Add user2 as member first
      await request(app)
        .post(`/api/tandas/${tandaId}/invite`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ userId: userId2 })

      // Try to invite as user2 (member, not organizer)
      const response = await request(app)
        .post(`/api/tandas/${tandaId}/invite`)
        .set('Authorization', `Bearer ${token2}`)
        .send({ userId: 'someuser' })

      expect(response.status).toBe(403)
    })

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/tandas/${tandaId}/invite`)
        .send({ userId: userId2 })

      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/tandas/:id/contributions', () => {
    beforeEach(async () => {
      const tanda = await prisma.tanda.create({
        data: {
          name: 'Tanda Enero',
          organizerId: userId1,
          contributionAmount: 10000,
          totalRounds: 5,
          status: 'FORMING',
        },
      })
      tandaId = tanda.id

      const participant = await prisma.participant.create({
        data: {
          userId: userId1,
          tandaId,
          role: 'ORGANIZER',
          rotationPosition: 0,
        },
      })
      participantId1 = participant.id
    })

    it('should record a contribution', async () => {
      const response = await request(app)
        .post(`/api/tandas/${tandaId}/contributions`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          participantId: participantId1,
          amountCents: 10000,
        })

      expect(response.status).toBe(201)
      expect(response.body.status).toBe('PAID')
      expect(response.body.amountCents).toBe(10000)
    })

    it('should mark late contributions', async () => {
      const response = await request(app)
        .post(`/api/tandas/${tandaId}/contributions`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          participantId: participantId1,
          amountCents: 9000, // Less than required
        })

      expect(response.status).toBe(201)
      expect(response.body.status).toBe('LATE')
    })

    it('should not allow duplicate contribution in same round', async () => {
      // Record first contribution
      await request(app)
        .post(`/api/tandas/${tandaId}/contributions`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          participantId: participantId1,
          amountCents: 10000,
        })

      // Try to record again
      const response = await request(app)
        .post(`/api/tandas/${tandaId}/contributions`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          participantId: participantId1,
          amountCents: 10000,
        })

      expect(response.status).toBe(409)
    })

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/tandas/${tandaId}/contributions`)
        .send({
          participantId: participantId1,
          amountCents: 10000,
        })

      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/tandas/:id/balance', () => {
    beforeEach(async () => {
      const tanda = await prisma.tanda.create({
        data: {
          name: 'Tanda Enero',
          organizerId: userId1,
          contributionAmount: 10000,
          totalRounds: 5,
          status: 'FORMING',
          totalContributions: 20000,
        },
      })
      tandaId = tanda.id

      await prisma.participant.create({
        data: {
          userId: userId1,
          tandaId,
          role: 'ORGANIZER',
          rotationPosition: 0,
        },
      })
    })

    it('should return balance information', async () => {
      const response = await request(app)
        .get(`/api/tandas/${tandaId}/balance`)
        .set('Authorization', `Bearer ${token1}`)

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('totalContributions')
      expect(response.body).toHaveProperty('balance')
      expect(response.body).toHaveProperty('status')
    })

    it('should require authentication', async () => {
      const response = await request(app).get(`/api/tandas/${tandaId}/balance`)

      expect(response.status).toBe(401)
    })
  })
})
