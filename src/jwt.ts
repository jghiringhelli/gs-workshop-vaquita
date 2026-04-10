import { createHmac } from 'crypto';
import { config } from './config/env';
import { UnauthorizedError } from './errors/AppError';

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

export function signToken(payload: Record<string, unknown>): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const claims = base64url(JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600,
  }));
  const sig = base64url(createHmac('sha256', config.jwtSecret).update(`${header}.${claims}`).digest());
  return `${header}.${claims}.${sig}`;
}

export function verifyToken(token: string): { userId: string } {
  const parts = token.split('.');
  if (parts.length !== 3) throw new UnauthorizedError('Invalid token format');
  const [header, claims, sig] = parts;
  const expectedSig = base64url(createHmac('sha256', config.jwtSecret).update(`${header}.${claims}`).digest());
  if (sig !== expectedSig) throw new UnauthorizedError('Invalid token signature');
  const payload = JSON.parse(Buffer.from(claims, 'base64url').toString('utf8'));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) throw new UnauthorizedError('Token expired');
  return payload as { userId: string };
}
