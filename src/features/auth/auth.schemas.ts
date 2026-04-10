import { z } from "zod";

export const issueTokenBodySchema = z.object({
  email: z.string().trim().email(),
}).strict();