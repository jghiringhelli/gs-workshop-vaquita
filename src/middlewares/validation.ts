/**
 * Input Validation Schemas
 * Using Zod for runtime validation
 */

import { z } from 'zod';

/**
 * User validation schemas
 */
export const CreateUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;

/**
 * Tanda validation schemas
 */
export const CreateTandaSchema = z.object({
  name: z.string().min(1, 'Tanda name is required').max(200, 'Tanda name is too long'),
  organizerId: z.string().uuid('Invalid organizer ID'),
  contributionAmount: z.number().int('Contribution amount must be an integer').positive('Contribution amount must be positive'),
});

export type CreateTandaInput = z.infer<typeof CreateTandaSchema>;

export const JoinTandaSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});

export type JoinTandaInput = z.infer<typeof JoinTandaSchema>;

/**
 * Contribution validation schemas
 */
export const RecordContributionSchema = z.object({
  participantId: z.string().uuid('Invalid participant ID'),
  amount: z.number().int('Amount must be an integer').positive('Amount must be positive'),
});

export type RecordContributionInput = z.infer<typeof RecordContributionSchema>;

/**
 * Pagination and filter schemas
 */
export const PaginationSchema = z.object({
  limit: z.coerce.number().int().positive().default(50).optional(),
  offset: z.coerce.number().int().nonnegative().default(0).optional(),
});

export const UserFilterSchema = z.object({
  userId: z.string().uuid('Invalid user ID').optional(),
});

/**
 * Utility function to validate input
 */
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw {
        statusCode: 400,
        message: 'Validation failed',
        errors: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      };
    }
    throw error;
  }
}
