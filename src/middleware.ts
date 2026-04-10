import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import config from "./config";
import { AppError, UnauthorizedError } from "./errors";
import { AuthPayload } from "./types";

/**
 * Middleware functions
 */

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      auth?: AuthPayload;
    }
  }
}

/**
 * JWT authentication middleware
 * Extracts and validates JWT from Authorization header
 */
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("Missing or invalid authorization header");
    }

    const token = authHeader.slice(7); // Remove "Bearer " prefix
    const decoded = jwt.verify(token, config.jwt.secret) as AuthPayload;
    req.userId = decoded.userId;
    req.auth = decoded;
    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      res.status(error.statusCode).json({ error: error.message, code: error.code });
    } else {
      res
        .status(401)
        .json({ error: "Invalid token", code: "INVALID_TOKEN" });
    }
  }
};

/**
 * Generate JWT token for a user
 */
export const generateToken = (userId: string): string => {
  return jwt.sign(
    { userId },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn } as any
  );
};

/**
 * Error handling middleware
 * Converts AppError and other errors to appropriate HTTP responses
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
      ...(error instanceof Object && "details" in error && { details: (error as any).details }),
    });
  }

  // Handle validation errors from request parsing
  if (error instanceof SyntaxError && "body" in error) {
    return res.status(400).json({
      error: "Invalid JSON",
      code: "INVALID_JSON",
    });
  }

  // Generic error handling
  console.error("Unhandled error:", error);
  res.status(500).json({
    error: "Internal server error",
    code: "INTERNAL_ERROR",
  });
};

/**
 * Request logging middleware (optional, for debugging)
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `[${req.method}] ${req.path} - ${res.statusCode} (${duration}ms)`
    );
  });
  next();
};
