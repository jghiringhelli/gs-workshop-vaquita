import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";

import {
  AppError,
  type ErrorResponseBody,
  InternalServerError,
  NotFoundError,
  UnprocessableEntityError,
} from "../errors/AppError";

function toErrorResponse(error: AppError): ErrorResponseBody {
  return {
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
    },
  };
}

/**
 * Convert unmatched routes into a consistent 404 response.
 */
export const notFoundHandler: RequestHandler = (request, _response, next): void => {
  next(new NotFoundError(`Route ${request.method} ${request.path} was not found`));
};

/**
 * Map application and validation errors to HTTP responses.
 */
export const errorHandler: ErrorRequestHandler = (error, _request, response, _next): void => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json(toErrorResponse(error));
    return;
  }

  if (error instanceof ZodError) {
    const validationError = new UnprocessableEntityError("Request validation failed", error.flatten());
    response.status(validationError.statusCode).json(toErrorResponse(validationError));
    return;
  }

  const internalError = new InternalServerError();
  response.status(internalError.statusCode).json(toErrorResponse(internalError));
};
