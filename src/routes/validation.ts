import type { ZodSchema } from "zod";
import { ValidationError } from "../errors/app-error";

/**
 * Parses `data` against `schema`, throwing a ValidationError on failure.
 * @param schema - Zod schema to validate against
 * @param data - raw input (body, params, query)
 * @returns parsed and typed output
 */
export function parseSchema<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.errors.map((e) => e.message).join(", ");
    throw new ValidationError(message);
  }
  return result.data;
}
