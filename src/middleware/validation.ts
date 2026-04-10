import { NextFunction, Request, Response } from "express";
import { AnyZodObject, ZodTypeAny } from "zod";

/**
 * Validates a request body against a Zod schema.
 * @param schema Zod schema for request body.
 * @returns Express middleware.
 */
export function validateBody(schema: ZodTypeAny) {
  return function validationMiddleware(request: Request, _response: Response, next: NextFunction): void {
    request.body = schema.parse(request.body);
    next();
  };
}

/**
 * Validates a request params object against a Zod schema.
 * @param schema Zod schema for params.
 * @returns Express middleware.
 */
export function validateParams(schema: AnyZodObject) {
  return function validationMiddleware(request: Request, _response: Response, next: NextFunction): void {
    request.params = schema.parse(request.params);
    next();
  };
}

/**
 * Validates a request query object against a Zod schema.
 * @param schema Zod schema for query values.
 * @returns Express middleware.
 */
export function validateQuery(schema: AnyZodObject) {
  return function validationMiddleware(request: Request, _response: Response, next: NextFunction): void {
    request.query = schema.parse(request.query);
    next();
  };
}
