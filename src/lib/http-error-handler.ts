import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";

import { AppError, NotFoundError } from "./errors";

/**
 * Converts unmatched routes into a typed application error.
 * @param request Express request.
 * @param _response Express response.
 * @param next Express next callback.
 * @returns Nothing.
 */
export const notFoundHandler: RequestHandler = (request, _response, next): void => {
  next(new NotFoundError(`Route not found: ${request.method} ${request.originalUrl}`));
};

/**
 * Converts application and validation errors into HTTP responses.
 * @param error Unknown error thrown during request handling.
 * @param _request Express request.
 * @param response Express response.
 * @param _next Express next callback.
 * @returns Nothing.
 */
export const errorHandler: ErrorRequestHandler = (error, _request, response, _next): void => {
  if (error instanceof ZodError) {
    response.status(422).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed.",
        details: error.flatten(),
      },
    });
    return;
  }

  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
    return;
  }

  response.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred.",
    },
  });
};