import { z, type ZodTypeAny } from "zod";

import { UnprocessableEntityError } from "../errors/AppError";

/**
 * Parse input with a Zod schema and raise a 422 error on failure.
 *
 * @param schema The Zod schema used to validate the input.
 * @param input The unknown value to validate.
 * @returns The validated and typed value.
 */
export function parseWithSchema<TSchema extends ZodTypeAny>(schema: TSchema, input: unknown): z.infer<TSchema> {
  const parsedResult = schema.safeParse(input);
  if (!parsedResult.success) {
    throw new UnprocessableEntityError("Request validation failed", parsedResult.error.flatten());
  }

  return parsedResult.data;
}
