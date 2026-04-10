import crypto from 'crypto';
import { config } from '../config';
import { AuthenticationError } from '../errors/errors';

interface TokenPayload {
  userId: number;
  iat: number;
}

function base64UrlEncode(data: string): string {
  return Buffer.from(data).toString('base64url');
}

function base64UrlDecode(data: string): string {
  return Buffer.from(data, 'base64url').toString('utf-8');
}

export function signToken(userId: number): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64UrlEncode(JSON.stringify({ userId, iat: Math.floor(Date.now() / 1000) }));
  const signature = crypto
    .createHmac('sha256', config.JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
}

export function verifyToken(token: string): TokenPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new AuthenticationError('Invalid token format');
  }

  const [header, payload, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', config.JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  if (signature !== expectedSignature) {
    throw new AuthenticationError('Invalid token signature');
  }

  const decoded = JSON.parse(base64UrlDecode(payload)) as TokenPayload;
  if (!decoded.userId || typeof decoded.userId !== 'number') {
    throw new AuthenticationError('Invalid token payload');
  }

  return decoded;
}
