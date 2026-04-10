import type { NextFunction, Request, Response } from "express";

import { NotFoundError } from "../errors/app-error";

export function notFoundHandler(request: Request, _response: Response, next: NextFunction): void {
  next(new NotFoundError(`Route not found: ${request.method} ${request.originalUrl}`));
}