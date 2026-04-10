import { describe, it, expect } from 'vitest';
import {
  createUserSchema,
  createTandaSchema,
  recordContributionSchema,
  participantResponseSchema,
} from '../src/schemas';

describe('Zod Schemas', () => {
  describe('createUserSchema', () => {
    it('should validate correct user input', () => {
      const result = createUserSchema.safeParse({
        email: 'test@example.com',
        name: 'John Doe',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = createUserSchema.safeParse({
        email: 'invalid-email',
        name: 'John Doe',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Invalid email');
      }
    });

    it('should reject missing name', () => {
      const result = createUserSchema.safeParse({
        email: 'test@example.com',
        name: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing email', () => {
      const result = createUserSchema.safeParse({
        name: 'John Doe',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createTandaSchema', () => {
    it('should validate correct tanda input', () => {
      const result = createTandaSchema.safeParse({
        name: 'Tanda Enero',
        organizerId: 'user-123',
        contributionAmount: 1000,
        totalRounds: 12,
      });
      expect(result.success).toBe(true);
    });

    it('should reject negative contribution amount', () => {
      const result = createTandaSchema.safeParse({
        name: 'Tanda Enero',
        organizerId: 'user-123',
        contributionAmount: -1000,
        totalRounds: 12,
      });
      expect(result.success).toBe(false);
    });

    it('should reject zero contribution amount', () => {
      const result = createTandaSchema.safeParse({
        name: 'Tanda Enero',
        organizerId: 'user-123',
        contributionAmount: 0,
        totalRounds: 12,
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-integer total rounds', () => {
      const result = createTandaSchema.safeParse({
        name: 'Tanda Enero',
        organizerId: 'user-123',
        contributionAmount: 1000,
        totalRounds: 12.5,
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative total rounds', () => {
      const result = createTandaSchema.safeParse({
        name: 'Tanda Enero',
        organizerId: 'user-123',
        contributionAmount: 1000,
        totalRounds: -1,
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty name', () => {
      const result = createTandaSchema.safeParse({
        name: '',
        organizerId: 'user-123',
        contributionAmount: 1000,
        totalRounds: 12,
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty organizerId', () => {
      const result = createTandaSchema.safeParse({
        name: 'Tanda Enero',
        organizerId: '',
        contributionAmount: 1000,
        totalRounds: 12,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('recordContributionSchema', () => {
    it('should validate correct contribution input', () => {
      const result = recordContributionSchema.safeParse({
        participantId: 'p-123',
        amount: 1000,
      });
      expect(result.success).toBe(true);
    });

    it('should reject negative amount', () => {
      const result = recordContributionSchema.safeParse({
        participantId: 'p-123',
        amount: -500,
      });
      expect(result.success).toBe(false);
    });

    it('should reject zero amount', () => {
      const result = recordContributionSchema.safeParse({
        participantId: 'p-123',
        amount: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty participantId', () => {
      const result = recordContributionSchema.safeParse({
        participantId: '',
        amount: 1000,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('participantResponseSchema', () => {
    it('should validate correct participant response', () => {
      const result = participantResponseSchema.safeParse({
        id: 'p-123',
        userId: 'u-456',
        tandaId: 't-789',
        role: 'organizer',
        rotationPosition: 1,
        consecutiveMissed: 0,
        isDefaulter: false,
        created_at: '2024-01-01T00:00:00Z',
      });
      expect(result.success).toBe(true);
    });

    it('should accept null rotation position', () => {
      const result = participantResponseSchema.safeParse({
        id: 'p-123',
        userId: 'u-456',
        tandaId: 't-789',
        role: 'member',
        rotationPosition: null,
        consecutiveMissed: 0,
        isDefaulter: false,
        created_at: '2024-01-01T00:00:00Z',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid role', () => {
      const result = participantResponseSchema.safeParse({
        id: 'p-123',
        userId: 'u-456',
        tandaId: 't-789',
        role: 'invalid',
        rotationPosition: 1,
        consecutiveMissed: 0,
        isDefaulter: false,
        created_at: '2024-01-01T00:00:00Z',
      });
      expect(result.success).toBe(false);
    });
  });
});
