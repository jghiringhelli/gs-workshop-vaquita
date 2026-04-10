import { type ErrorRequestHandler, type RequestHandler } from "express";
import { ZodError } from "zod";

import { AppError } from "../errors/app-error";

function formatValidationIssues(error: ZodError): Array<Record<string, unknown>> {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
    code: issue.code,
  }));
}

function isJsonSyntaxError(error: unknown): error is SyntaxError & { body: string } {
  return error instanceof SyntaxError && "body" in error;
}

export const notFoundHandler: RequestHandler = (request, response) => {
  response.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: `Route ${request.method} ${request.originalUrl} was not found`,
    },
  });
};

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: formatValidationIssues(error),
      },
    });
    return;
  }

  if (isJsonSyntaxError(error)) {
    response.status(400).json({
      error: {
        code: "INVALID_JSON",
        message: "Request body contains invalid JSON",
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
      message: "An unexpected error occurred",
    },
  });
};
