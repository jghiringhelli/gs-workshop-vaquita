import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest'
import request from 'supertest'
import app from '../index'
import { prisma } from '../lib/prisma'
import { generateToken } from '../lib/auth'

describe('Withdrawals and Voting', () => {
  beforeAll(async () => {
    // Ensure clean db before all tests in this file
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
  })
  let userId1: string // organizer
  let userId2: string // member
  let userId3: string // member
  let tandaId: string
  let token1: string
  let token2: string
  let token3: string
  let participantId1: string
  let participantId2: string
  let participantId3: string

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

    // Create test users
    const timestamp = Date.now()
    const user1 = await prisma.user.create({
      data: {
        email: `organizer-${timestamp}@example.com`,
        name: 'Organizer',
        password: 'hashed',
      },
    })
    userId1 = user1.id
    token1 = generateToken(userId1)

    const user2 = await prisma.user.create({
      data: {
        email: `member1-${timestamp}@example.com`,
        name: 'Member1',
        password: 'hashed',
      },
    })
    userId2 = user2.id
    token2 = generateToken(userId2)

    const user3 = await prisma.user.create({
      data: {
        email: `member2-${timestamp}@example.com`,
        name: 'Member2',
        password: 'hashed',
      },
    })
    userId3 = user3.id
    token3 = generateToken(userId3)

    // Create tanda with 3 participants
    const tanda = await prisma.tanda.create({
      data: {
        name: 'Test Tanda',
        organizerId: userId1,
        contributionAmount: 10000,
        totalRounds: 5,
        status: 'ACTIVE',
      },
    })
    tandaId = tanda.id

    // Add participants
    const p1 = await prisma.participant.create({
      data: {
        userId: userId1,
        tandaId,
        role: 'ORGANIZER',
        rotationPosition: 0,
      },
    })
    participantId1 = p1.id

    const p2 = await prisma.participant.create({
      data: {
        userId: userId2,
        tandaId,
        role: 'MEMBER',
        rotationPosition: 1,
      },
    })
    participantId2 = p2.id

    const p3 = await prisma.participant.create({
      data: {
        userId: userId3,
        tandaId,
        role: 'MEMBER',
        rotationPosition: 2,
      },
    })
    participantId3 = p3.id
  })

  afterEach(async () => {
    try {
      await prisma.withdrawalVote.deleteMany({})
      await prisma.withdrawal.deleteMany({})
      await prisma.tandaAuditLog.deleteMany({})
      await prisma.contribution.deleteMany({})
      await prisma.payout.deleteMany({})
      await prisma.participant.deleteMany({})
      await prisma.tanda.deleteMany({})
      await prisma.user.deleteMany({})
    } catch (e) {
      console.error('Cleanup error:', e)
    }
  })

  describe('POST /api/tandas/:id/withdrawals', () => {
    it('should request a withdrawal as organizer', async () => {
      const response = await request(app)
        .post(`/api/tandas/${tandaId}/withdrawals`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          amountCents: 50000,
          reason: 'Group dinner',
          receiptUrl: 'https://example.com/receipt.jpg',
        })

      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('id')
      expect(response.body.amountCents).toBe(50000)
      expect(response.body.status).toBe('PENDING')
    })

    it('should reject if not organizer', async () => {
      const response = await request(app)
        .post(`/api/tandas/${tandaId}/withdrawals`)
        .set('Authorization', `Bearer ${token2}`)
        .send({
          amountCents: 50000,
          reason: 'Group dinner',
        })

      expect(response.status).toBe(403)
    })

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/tandas/${tandaId}/withdrawals`)
        .send({
          amountCents: 50000,
          reason: 'Group dinner',
        })

      expect(response.status).toBe(401)
    })

    it('should validate amount', async () => {
      const response = await request(app)
        .post(`/api/tandas/${tandaId}/withdrawals`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          amountCents: -1000,
        })

      expect(response.status).toBe(400)
    })
  })

  describe('GET /api/tandas/:id/withdrawals', () => {
    beforeEach(async () => {
      // Create a withdrawal for testing
      await prisma.withdrawal.create({
        data: {
          tandaId,
          organizerId: userId1,
          amountCents: 50000,
          reason: 'Group dinner',
          receiptUrl: 'https://example.com/receipt.jpg',
          status: 'PENDING',
        },
      })
    })

    it('should list withdrawals with vote counts', async () => {
      const response = await request(app)
        .get(`/api/tandas/${tandaId}/withdrawals`)
        .set('Authorization', `Bearer ${token1}`)

      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBeGreaterThan(0)
      expect(response.body[0]).toHaveProperty('id')
      expect(response.body[0]).toHaveProperty('approveVotes')
      expect(response.body[0]).toHaveProperty('rejectVotes')
    })

    it('should require authentication', async () => {
      const response = await request(app).get(`/api/tandas/${tandaId}/withdrawals`)

      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/withdrawals/:id/vote', () => {
    let withdrawalId: string

    beforeEach(async () => {
      // Create a withdrawal with receipt
      const withdrawal = await prisma.withdrawal.create({
        data: {
          tandaId,
          organizerId: userId1,
          amountCents: 50000,
          reason: 'Group dinner',
          receiptUrl: 'https://example.com/receipt.jpg',
          status: 'PENDING',
        },
      })
      withdrawalId = withdrawal.id
    })

    it('should vote on a withdrawal', async () => {
      const response = await request(app)
        .post(`/api/withdrawals/vote/${withdrawalId}`)
        .set('Authorization', `Bearer ${token2}`)
        .send({
          participantId: participantId2,
          vote: 'approve',
        })

      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('id')
      expect(response.body.vote).toBe('approve')
    })

    it('should reject vote if no receipt URL', async () => {
      // Create withdrawal without receipt
      const noReceiptWithdrawal = await prisma.withdrawal.create({
        data: {
          tandaId,
          organizerId: userId1,
          amountCents: 50000,
          receiptUrl: null,
          status: 'PENDING',
        },
      })

      const response = await request(app)
        .post(`/api/withdrawals/vote/${noReceiptWithdrawal.id}`)
        .set('Authorization', `Bearer ${token2}`)
        .send({
          participantId: participantId2,
          vote: 'approve',
        })

      expect(response.status).toBe(400)
      expect(response.body.error).toContain('Receipt URL')
    })

    it('should not allow organizer to vote on own withdrawal', async () => {
      const response = await request(app)
        .post(`/api/withdrawals/vote/${withdrawalId}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          participantId: participantId1,
          vote: 'approve',
        })

      expect(response.status).toBe(403)
    })

    it('should not allow duplicate votes', async () => {
      // First vote
      await request(app)
        .post(`/api/withdrawals/vote/${withdrawalId}`)
        .set('Authorization', `Bearer ${token2}`)
        .send({
          participantId: participantId2,
          vote: 'approve',
        })

      // Second vote from same person
      const response = await request(app)
        .post(`/api/withdrawals/vote/${withdrawalId}`)
        .set('Authorization', `Bearer ${token2}`)
        .send({
          participantId: participantId2,
          vote: 'reject',
        })

      expect(response.status).toBe(400)
      expect(response.body.error).toContain('already voted')
    })

    it('should approve withdrawal at ceil(members/2) approve votes', async () => {
      // 3 members total (including organizer), so ceil(3/2) = 2 approves needed (from 2 non-organizers)
      // Vote 1: approve
      await request(app)
        .post(`/api/withdrawals/vote/${withdrawalId}`)
        .set('Authorization', `Bearer ${token2}`)
        .send({
          participantId: participantId2,
          vote: 'approve',
        })

      // Vote 2: approve - should trigger approval
      const response = await request(app)
        .post(`/api/withdrawals/vote/${withdrawalId}`)
        .set('Authorization', `Bearer ${token3}`)
        .send({
          participantId: participantId3,
          vote: 'approve',
        })

      expect(response.status).toBe(201)

      // Check withdrawal is approved
      const withdrawal = await prisma.withdrawal.findUnique({
        where: { id: withdrawalId },
      })

      expect(withdrawal?.status).toBe('APPROVED')
      expect(withdrawal?.resolvedAt).toBeDefined()
    })

    it('should reject withdrawal at floor(members/2)+1 reject votes', async () => {
      // 3 members total, so floor(3/2)+1 = 2 rejects needed
      // Vote 1: reject
      await request(app)
        .post(`/api/withdrawals/vote/${withdrawalId}`)
        .set('Authorization', `Bearer ${token2}`)
        .send({
          participantId: participantId2,
          vote: 'reject',
        })

      // Vote 2: reject - should trigger rejection
      const response = await request(app)
        .post(`/api/withdrawals/vote/${withdrawalId}`)
        .set('Authorization', `Bearer ${token3}`)
        .send({
          participantId: participantId3,
          vote: 'reject',
        })

      expect(response.status).toBe(201)

      // Check withdrawal is rejected
      const withdrawal = await prisma.withdrawal.findUnique({
        where: { id: withdrawalId },
      })

      expect(withdrawal?.status).toBe('REJECTED')
      expect(withdrawal?.resolvedAt).toBeDefined()
    })

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/withdrawals/vote/${withdrawalId}`)
        .send({
          participantId: participantId2,
          vote: 'approve',
        })

      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/tandas/:id/dissolve', () => {
    it('should dissolve tanda as organizer', async () => {
      const response = await request(app)
        .post(`/api/tandas/${tandaId}/dissolve`)
        .set('Authorization', `Bearer ${token1}`)

      expect(response.status).toBe(200)
      expect(response.body.status).toBe('CANCELLED')
    })

    it('should not allow members to dissolve', async () => {
      const response = await request(app)
        .post(`/api/tandas/${tandaId}/dissolve`)
        .set('Authorization', `Bearer ${token2}`)

      expect(response.status).toBe(403)
    })

    it('should require authentication', async () => {
      const response = await request(app).post(`/api/tandas/${tandaId}/dissolve`)

      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/tandas/:id/ledger', () => {
    beforeEach(async () => {
      // Clear database before setup
      await prisma.withdrawalVote.deleteMany({})
      await prisma.withdrawal.deleteMany({})
      await prisma.tandaAuditLog.deleteMany({})
      await prisma.contribution.deleteMany({})
      await prisma.payout.deleteMany({})
      await prisma.participant.deleteMany({})
      await prisma.tanda.deleteMany({})
      await prisma.user.deleteMany({})

      // Re-setup data for this test
      const timestamp = Date.now()
      const user1 = await prisma.user.create({
        data: {
          email: `org-${timestamp}@example.com`,
          name: 'Organizer',
          password: 'hashed',
        },
      })
      userId1 = user1.id
      token1 = generateToken(userId1)

      const user2 = await prisma.user.create({
        data: {
          email: `member-${timestamp}@example.com`,
          name: 'Member',
          password: 'hashed',
        },
      })
      userId2 = user2.id

      const tanda = await prisma.tanda.create({
        data: {
          name: 'Test Tanda',
          organizerId: userId1,
          contributionAmount: 10000,
          totalRounds: 5,
          status: 'ACTIVE',
        },
      })
      tandaId = tanda.id

      const p1 = await prisma.participant.create({
        data: {
          userId: userId1,
          tandaId,
          role: 'ORGANIZER',
          rotationPosition: 0,
        },
      })
      participantId1 = p1.id

      const p2 = await prisma.participant.create({
        data: {
          userId: userId2,
          tandaId,
          role: 'MEMBER',
          rotationPosition: 1,
        },
      })
      participantId2 = p2.id
    })

    it('should return combined ledger of contributions and withdrawals', async () => {
      // Create a contribution
      await prisma.contribution.create({
        data: {
          tandaId,
          participantId: participantId2,
          round: 0,
          status: 'PAID',
        },
      })

      // Create a withdrawal
      await prisma.withdrawal.create({
        data: {
          tandaId,
          organizerId: userId1,
          amountCents: 50000,
          receiptUrl: 'https://example.com/receipt.jpg',
        },
      })

      const response = await request(app)
        .get(`/api/tandas/${tandaId}/ledger`)
        .set('Authorization', `Bearer ${token1}`)

      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBe(2)

      // Check entries are sorted by createdAt
      expect(response.body[0].createdAt <= response.body[1].createdAt).toBe(true)
    })

    it('should require authentication', async () => {
      const response = await request(app).get(`/api/tandas/${tandaId}/ledger`)

      expect(response.status).toBe(401)
    })
  })
})
