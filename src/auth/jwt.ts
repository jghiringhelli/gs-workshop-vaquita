import { createHmac, timingSafeEqual } from "node:crypto";

import { UnauthorizedError } from "../errors/app-error";
import type { AuthTokenPayload } from "./auth.types";

export function signJwt(payload: AuthTokenPayload, secret: string): string {
  const encodedHeader = encode({ alg: "HS256", typ: "JWT" });
  const encodedPayload = encode(payload);
  const signature = sign(`${encodedHeader}.${encodedPayload}`, secret);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyJwt(token: string, secret: string): AuthTokenPayload {
  const parts = token.split(".");

  if (parts.length !== 3) {
    throw new UnauthorizedError("Invalid bearer token format");
  }

  const [encodedHeader, encodedPayload, actualSignature] = parts;
  const expectedSignature = sign(`${encodedHeader}.${encodedPayload}`, secret);

  if (!signaturesMatch(actualSignature, expectedSignature)) {
    throw new UnauthorizedError("Invalid bearer token signature");
  }

  const header = decode<{ alg?: string; typ?: string }>(encodedHeader);

  if (header.alg !== "HS256" || header.typ !== "JWT") {
    throw new UnauthorizedError("Unsupported bearer token format");
  }

  const payload = decode<AuthTokenPayload>(encodedPayload);
  const now = Math.floor(Date.now() / 1000);

  if (!Number.isInteger(payload.sub) || payload.sub <= 0) {
    throw new UnauthorizedError("Bearer token subject is invalid");
  }

  if (!Number.isInteger(payload.iat) || !Number.isInteger(payload.exp) || payload.exp <= payload.iat) {
    throw new UnauthorizedError("Bearer token timestamps are invalid");
  }

  if (payload.exp <= now) {
    throw new UnauthorizedError("Bearer token has expired");
  }

  return payload;
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decode<T>(value: string): T {
  try {
    const json = Buffer.from(value, "base64url").toString("utf8");

    return JSON.parse(json) as T;
  } catch {
    throw new UnauthorizedError("Bearer token is malformed");
  }
}

function signaturesMatch(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}
