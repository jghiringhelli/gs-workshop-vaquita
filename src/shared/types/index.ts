import { Request } from 'express';

/** Authenticated user payload attached to requests by the auth middleware. */
export interface AuthUser {
  id: string;
  email: string;
}

/** Express Request extended with an optional authenticated user. */
export interface AuthRequest extends Request {
  user?: AuthUser;
}
