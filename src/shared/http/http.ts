import { createHash } from "node:crypto"
import type { NextFunction, Request, RequestHandler, Response } from "express"
import type { AppConfig } from "../../config/env"
import { verifyAuthToken, type AuthTokenPayload } from "../auth/jwt"
import {
  ApplicationError,
  NotFoundError,
  UnauthorizedError,
} from "../errors/application-error"

/**
 * Request shape with optional authenticated user context.
 */
export type AuthenticatedRequest = Request & {
  authUser?: AuthTokenPayload
}

/**
 * Send a successful JSON response using the project envelope.
 *
 * @param response - Express response object.
 * @param statusCode - HTTP status code.
 * @param data - Response payload.
 * @param meta - Optional response metadata.
 */
export function sendData<T>(
  response: Response,
  statusCode: number,
  data: T,
  meta: Record<string, unknown> = {},
): void {
  response.status(statusCode).json({
    data,
    meta,
    errors: [],
  })
}

/**
 * Send a no-content response for successful empty commands.
 *
 * @param response - Express response object.
 */
export function sendNoContent(response: Response): void {
  response.status(204).send()
}

/**
 * Install simple security response headers.
 *
 * @returns Express middleware.
 */
export function createSecurityHeadersMiddleware(): RequestHandler {
  return (_request, response, next) => {
    response.setHeader("X-Content-Type-Options", "nosniff")
    response.setHeader("X-Frame-Options", "DENY")
    response.setHeader("Referrer-Policy", "no-referrer")
    response.setHeader(
      "Permissions-Policy",
      "geolocation=(), camera=(), microphone=()",
    )
    next()
  }
}

/**
 * Attach bearer token identity to the request when present.
 *
 * @param config - Application configuration.
 * @returns Express middleware.
 */
export function createAuthenticationContextMiddleware(
  config: AppConfig,
): RequestHandler {
  return (request, _response, next) => {
    const header = request.header("authorization")

    if (!header) {
      next()
      return
    }

    const token = extractBearerToken(header)

    if (!token) {
      next(new UnauthorizedError("Authorization header must use Bearer token"))
      return
    }

    try {
      ;(request as AuthenticatedRequest).authUser = verifyAuthToken(
        token,
        config.jwtSecret,
      )
      next()
    } catch (error) {
      next(error)
    }
  }
}

/**
 * Apply a lightweight in-memory rate limit per IP address.
 *
 * @param config - Application configuration.
 * @returns Express middleware.
 */
export function createRateLimitMiddleware(config: AppConfig): RequestHandler {
  const requestCounts = new Map<string, { count: number; windowStartedAt: number }>()

  return (request, response, next) => {
    const key = request.ip || "unknown"
    const currentTime = Date.now()
    const currentWindow = requestCounts.get(key)

    if (
      !currentWindow ||
      currentTime - currentWindow.windowStartedAt >= config.rateLimitWindowMs
    ) {
      requestCounts.set(key, { count: 1, windowStartedAt: currentTime })
      next()
      return
    }

    if (currentWindow.count >= config.rateLimitMaxRequests) {
      response.setHeader(
        "Retry-After",
        String(Math.ceil(config.rateLimitWindowMs / 1000)),
      )
      response.status(429).json({
        data: null,
        meta: {},
        errors: [
          {
            code: "RATE_LIMITED",
            message: "Too many requests, please retry later",
          },
        ],
      })
      return
    }

    currentWindow.count += 1
    next()
  }
}

/**
 * Attach a deterministic request id header for easier tracing.
 *
 * @param config - Application configuration.
 * @returns Express middleware.
 */
export function createRequestIdMiddleware(config: AppConfig): RequestHandler {
  return (request, response, next) => {
    const requestId = createHash("sha256")
      .update(`${config.requestIdSeed}:${request.method}:${request.originalUrl}:${Date.now()}`)
      .digest("hex")
      .slice(0, 16)

    response.setHeader("X-Request-Id", requestId)
    next()
  }
}

/**
 * Create an Express 404 handler.
 *
 * @returns Express middleware.
 */
export function createNotFoundHandler(): RequestHandler {
  return (_request, _response, next) => {
    next(new NotFoundError("Route not found"))
  }
}

/**
 * Centralized application error handler.
 *
 * @param error - Unknown thrown error.
 * @param _request - Express request object.
 * @param response - Express response object.
 * @param _next - Express next function.
 */
export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
): void {
  if (error instanceof ApplicationError) {
    response.status(error.statusCode).json({
      data: null,
      meta: {},
      errors: [
        {
          code: error.code,
          message: error.message,
          details: error.details ?? null,
        },
      ],
    })
    return
  }

  response.status(500).json({
    data: null,
    meta: {},
    errors: [
      {
        code: "INTERNAL_SERVER_ERROR",
        message: "Unexpected internal error",
      },
    ],
  })
}

/**
 * Extract the authenticated user id from a request when available.
 *
 * @param request - Express request with optional auth context.
 * @returns Authenticated user id or null.
 */
export function getAuthenticatedUserId(request: Request): number | null {
  const authUser = (request as AuthenticatedRequest).authUser
  return authUser?.sub ?? null
}

/**
 * Parse a bearer token from the authorization header value.
 *
 * @param headerValue - Raw header string.
 * @returns Bearer token or null.
 */
function extractBearerToken(headerValue: string): string | null {
  const [scheme, token] = headerValue.split(" ")
  return scheme === "Bearer" && token ? token : null
}
