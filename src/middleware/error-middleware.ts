import type { NextFunction, Request, Response } from "express";

import { AppError } from "../errors/app-error";

export function notFoundMiddleware(
  _req: Request,
  _res: Response,
  next: NextFunction
): void {
  next(new AppError("Route not found", 404, "NOT_FOUND"));
}

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });

    return;
  }

  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Unexpected server error",
    },
  });
}
