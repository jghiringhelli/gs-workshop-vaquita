import type { RequestHandler } from "express";

/**
 * Apply a small set of default security headers to every response.
 */
export const securityHeadersMiddleware: RequestHandler = (_request, response, next): void => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  next();
};
