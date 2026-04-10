import express from "express"
import request from "supertest"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { Request } from "express"
import { signAuthToken } from "../../src/shared/auth/jwt"
import { BadRequestError } from "../../src/shared/errors/application-error"
import {
  createAuthenticationContextMiddleware,
  createNotFoundHandler,
  createRateLimitMiddleware,
  createRequestIdMiddleware,
  createSecurityHeadersMiddleware,
  errorHandler,
  getAuthenticatedUserId,
  sendData,
  sendNoContent,
} from "../../src/shared/http/http"
import { createTestConfig } from "../support/test-config"

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("Shared HTTP helpers", () => {
  it("SendData_ExplicitPayload_ReturnsStandardEnvelope", async () => {
    const app = express()

    app.get("/data", (_request, response) => {
      sendData(response, 201, { ok: true }, { page: 1 })
    })

    const response = await request(app).get("/data")

    expect(response.status).toBe(201)
    expect(response.body).toEqual({
      data: { ok: true },
      meta: { page: 1 },
      errors: [],
    })
  })

  it("SendNoContent_SuccessfulCommand_ReturnsEmpty204Response", async () => {
    const app = express()

    app.post("/empty", (_request, response) => {
      sendNoContent(response)
    })

    const response = await request(app).post("/empty")

    expect(response.status).toBe(204)
    expect(response.text).toBe("")
  })

  it("CreateSecurityHeadersMiddleware_RequestHandled_SetsExpectedHeaders", async () => {
    const app = express()
    app.use(createSecurityHeadersMiddleware())
    app.get("/headers", (_request, response) => {
      sendData(response, 200, { ok: true })
    })

    const response = await request(app).get("/headers")

    expect(response.headers["x-content-type-options"]).toBe("nosniff")
    expect(response.headers["x-frame-options"]).toBe("DENY")
    expect(response.headers["referrer-policy"]).toBe("no-referrer")
    expect(response.headers["permissions-policy"]).toBe(
      "geolocation=(), camera=(), microphone=()",
    )
  })

  it("CreateRequestIdMiddleware_RequestHandled_SetsStableLengthHeader", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-10T12:00:00.000Z"))

    const app = express()
    app.use(createRequestIdMiddleware(createTestConfig()))
    app.get("/trace", (_request, response) => {
      sendData(response, 200, { ok: true })
    })

    const response = await request(app).get("/trace")

    expect(response.headers["x-request-id"]).toMatch(/^[a-f0-9]{16}$/)
  })

  it("CreateAuthenticationContextMiddleware_MissingAuthorizationHeader_LeavesRequestUnauthenticated", async () => {
    const app = createAuthTestApp()

    const response = await request(app).get("/me")

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual({
      userId: null,
      email: null,
    })
  })

  it("CreateAuthenticationContextMiddleware_ValidBearerToken_AttachesAuthenticatedUser", async () => {
    const app = createAuthTestApp()
    const token = signAuthToken(
      {
        sub: 7,
        email: "organizer@example.com",
        name: "Organizer",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      "test-secret",
    )

    const response = await request(app)
      .get("/me")
      .set("Authorization", `Bearer ${token}`)

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual({
      userId: 7,
      email: "organizer@example.com",
    })
  })

  it("CreateAuthenticationContextMiddleware_InvalidScheme_ReturnsUnauthorizedError", async () => {
    const app = createAuthTestApp()

    const response = await request(app)
      .get("/me")
      .set("Authorization", "Basic abc123")

    expect(response.status).toBe(401)
    expect(response.body.errors[0]).toMatchObject({
      code: "UNAUTHORIZED",
      message: "Authorization header must use Bearer token",
    })
  })

  it("CreateAuthenticationContextMiddleware_InvalidBearerToken_ReturnsUnauthorizedError", async () => {
    const app = createAuthTestApp()

    const response = await request(app)
      .get("/me")
      .set("Authorization", "Bearer invalid-token")

    expect(response.status).toBe(401)
    expect(response.body.errors[0]).toMatchObject({
      code: "UNAUTHORIZED",
    })
  })

  it("CreateRateLimitMiddleware_RequestCountExceedsLimit_ReturnsRetryAfterAnd429", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-10T12:00:00.000Z"))

    const app = express()
    app.use(
      createRateLimitMiddleware(
        createTestConfig({
          rateLimitWindowMs: 1_000,
          rateLimitMaxRequests: 1,
        }),
      ),
    )
    app.get("/limited", (_request, response) => {
      sendData(response, 200, { ok: true })
    })

    const firstResponse = await request(app).get("/limited")
    const secondResponse = await request(app).get("/limited")

    expect(firstResponse.status).toBe(200)
    expect(secondResponse.status).toBe(429)
    expect(secondResponse.headers["retry-after"]).toBe("1")
    expect(secondResponse.body.errors[0]).toMatchObject({
      code: "RATE_LIMITED",
    })
  })

  it("CreateRateLimitMiddleware_WindowExpires_ResetsCounterForNextRequest", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-10T12:00:00.000Z"))

    const app = express()
    app.use(
      createRateLimitMiddleware(
        createTestConfig({
          rateLimitWindowMs: 1_000,
          rateLimitMaxRequests: 1,
        }),
      ),
    )
    app.get("/limited", (_request, response) => {
      sendData(response, 200, { ok: true })
    })

    const firstResponse = await request(app).get("/limited")
    vi.advanceTimersByTime(1_001)
    const secondResponse = await request(app).get("/limited")

    expect(firstResponse.status).toBe(200)
    expect(secondResponse.status).toBe(200)
  })

  it("CreateRateLimitMiddleware_RequestIpMissing_UsesUnknownBucketKey", () => {
    const next = vi.fn()
    const middleware = createRateLimitMiddleware(createTestConfig())

    middleware({} as Request, {} as Response, next)

    expect(next).toHaveBeenCalledOnce()
  })

  it("CreateNotFoundHandler_UnmatchedRoute_ReturnsNotFoundEnvelope", async () => {
    const app = express()
    app.use(createNotFoundHandler())
    app.use(errorHandler)

    const response = await request(app).get("/missing")

    expect(response.status).toBe(404)
    expect(response.body.errors[0]).toMatchObject({
      code: "NOT_FOUND",
      message: "Route not found",
    })
  })

  it("ErrorHandler_ApplicationError_ReturnsStructuredEnvelope", async () => {
    const app = express()
    app.get("/bad-request", (_request, _response, next) => {
      next(new BadRequestError("Invalid input", { field: "email" }))
    })
    app.use(errorHandler)

    const response = await request(app).get("/bad-request")

    expect(response.status).toBe(400)
    expect(response.body.errors[0]).toMatchObject({
      code: "BAD_REQUEST",
      message: "Invalid input",
      details: { field: "email" },
    })
  })

  it("ErrorHandler_UnexpectedError_ReturnsInternalServerErrorEnvelope", async () => {
    const app = express()
    app.get("/boom", () => {
      throw new Error("boom")
    })
    app.use(errorHandler)

    const response = await request(app).get("/boom")

    expect(response.status).toBe(500)
    expect(response.body.errors[0]).toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "Unexpected internal error",
    })
  })

  it("GetAuthenticatedUserId_MissingAuthContext_ReturnsNull", () => {
    expect(getAuthenticatedUserId({} as Request)).toBeNull()
  })
})

/**
 * Create a small Express app that exposes auth context through an endpoint.
 *
 * @returns Configured Express app.
 */
function createAuthTestApp() {
  const app = express()

  app.use(createAuthenticationContextMiddleware(createTestConfig()))
  app.get("/me", (request, response) => {
    sendData(response, 200, {
      userId: getAuthenticatedUserId(request),
      email: "authUser" in request && request.authUser ? request.authUser.email : null,
    })
  })
  app.use(errorHandler)

  return app
}
