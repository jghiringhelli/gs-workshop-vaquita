import { z } from 'zod';

const NAME_REGEX = /^[a-zA-ZÀ-ÿ]+([ '\-.][ ]?[a-zA-ZÀ-ÿ]+)*$/;

export const CreateUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z
    .string()
    .min(1, 'Name is required')
    .regex(NAME_REGEX, "Name may only contain letters, spaces, hyphens, apostrophes, and periods"),
});

export type CreateUserDto = z.infer<typeof CreateUserSchema>;
