import type { RequestHandler } from "express"
import type { ZodTypeAny } from "zod"
import { ValidationError } from "../errors/application-error"

/**
 * Request schema definitions for body, query, and path params.
 */
export interface RequestSchemas {
  readonly body?: ZodTypeAny
  readonly params?: ZodTypeAny
  readonly query?: ZodTypeAny
}

/**
 * Validate request data at the API boundary.
 *
 * @param schemas - Zod schemas for selected request segments.
 * @returns Express middleware.
 */
export function validateRequest(schemas: RequestSchemas): RequestHandler {
  return (request, _response, next) => {
    try {
      if (schemas.body) {
        request.body = schemas.body.parse(request.body)
      }

      if (schemas.params) {
        request.params = schemas.params.parse(request.params)
      }

      if (schemas.query) {
        request.query = schemas.query.parse(request.query)
      }

      next()
    } catch (error) {
      const fieldErrors =
        error && typeof error === "object" && "issues" in error
          ? (error as { issues: Array<{ path: Array<string | number>; message: string }> }).issues.map(
              (issue) => ({
                field: issue.path.join(".") || "request",
                message: issue.message,
              }),
            )
          : []

      next(
        new ValidationError("Request validation failed", {
          fieldErrors,
        }),
      )
    }
  }
}
