import { ZodError, type ZodType } from "zod";

import { ValidationError } from "../errors/app-error";

export function parseSchema<T>(schema: ZodType<T>, value: unknown): T {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) {
      const message = error.issues[0]?.message ?? "Invalid request payload";
      throw new ValidationError(message);
    }

    throw error;
  }
}
