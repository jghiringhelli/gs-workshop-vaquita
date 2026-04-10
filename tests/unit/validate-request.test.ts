import type { NextFunction, Request, Response } from "express"
import type { ZodTypeAny } from "zod"
import { describe, expect, it, vi } from "vitest"
import { ValidationError } from "../../src/shared/errors/application-error"
import { validateRequest } from "../../src/shared/validation/validate-request"

describe("Validate request middleware", () => {
  it("ValidateRequest_IssueWithoutPath_MapsFieldNameToRequest", () => {
    const next = vi.fn<NextFunction>()
    const middleware = validateRequest({
      body: {
        parse() {
          throw {
            issues: [
              {
                path: [],
                message: "Body is required",
              },
            ],
          }
        },
      } as unknown as ZodTypeAny,
    })

    middleware(
      { body: null, params: {}, query: {} } as Request,
      {} as Response,
      next,
    )

    const error = next.mock.calls[0]?.[0] as ValidationError

    expect(error).toBeInstanceOf(ValidationError)
    expect(error.details).toEqual({
      fieldErrors: [
        {
          field: "request",
          message: "Body is required",
        },
      ],
    })
  })

  it("ValidateRequest_NonZodError_ReturnsValidationErrorWithEmptyFieldErrors", () => {
    const next = vi.fn<NextFunction>()
    const middleware = validateRequest({
      body: {
        parse() {
          throw new Error("boom")
        },
      } as unknown as ZodTypeAny,
    })

    middleware(
      { body: {}, params: {}, query: {} } as Request,
      {} as Response,
      next,
    )

    const error = next.mock.calls[0]?.[0] as ValidationError

    expect(error).toBeInstanceOf(ValidationError)
    expect(error.details).toEqual({
      fieldErrors: [],
    })
  })
})
