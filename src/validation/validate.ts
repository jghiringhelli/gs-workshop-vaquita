import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ZodTypeAny } from "zod";

export function validateBody(schema: ZodTypeAny): RequestHandler {
  return (request: Request, _response: Response, next: NextFunction) => {
    request.body = schema.parse(request.body);
    next();
  };
}

export function validateQuery(schema: ZodTypeAny): RequestHandler {
  return (request: Request, _response: Response, next: NextFunction) => {
    request.query = schema.parse(request.query);
    next();
  };
}

export function validateParams(schema: ZodTypeAny): RequestHandler {
  return (request: Request, _response: Response, next: NextFunction) => {
    request.params = schema.parse(request.params);
    next();
  };
}