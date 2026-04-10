import { createHmac, timingSafeEqual } from "node:crypto"
import { UnauthorizedError } from "../errors/application-error"

/**
 * Authenticated user identity encoded inside the JWT payload.
 */
export interface AuthTokenPayload {
  readonly sub: number
  readonly email: string
  readonly name: string
  readonly iat: number
  readonly exp: number
}

/**
 * Sign a minimal HS256 JWT payload.
 *
 * @param payload - Token payload.
 * @param secret - Signing secret.
 * @returns Signed JWT token.
 */
export function signAuthToken(
  payload: AuthTokenPayload,
  secret: string,
): string {
  const headerSegment = encodeSegment({ alg: "HS256", typ: "JWT" })
  const payloadSegment = encodeSegment(payload)
  const signature = createSignature(headerSegment, payloadSegment, secret)

  return `${headerSegment}.${payloadSegment}.${signature}`
}

/**
 * Verify and decode a JWT token.
 *
 * @param token - Raw JWT token.
 * @param secret - Signing secret.
 * @returns Decoded payload.
 */
export function verifyAuthToken(
  token: string,
  secret: string,
): AuthTokenPayload {
  const [headerSegment, payloadSegment, providedSignature] = token.split(".")

  if (!headerSegment || !payloadSegment || !providedSignature) {
    throw new UnauthorizedError("Malformed bearer token")
  }

  const expectedSignature = createSignature(headerSegment, payloadSegment, secret)
  const expectedBuffer = Buffer.from(expectedSignature)
  const providedBuffer = Buffer.from(providedSignature)

  if (
    expectedBuffer.length !== providedBuffer.length ||
    !timingSafeEqual(expectedBuffer, providedBuffer)
  ) {
    throw new UnauthorizedError("Invalid bearer token signature")
  }

  const payload = JSON.parse(
    Buffer.from(payloadSegment, "base64url").toString("utf-8"),
  ) as Partial<AuthTokenPayload>

  if (
    typeof payload.sub !== "number" ||
    typeof payload.email !== "string" ||
    typeof payload.name !== "string" ||
    typeof payload.iat !== "number" ||
    typeof payload.exp !== "number"
  ) {
    throw new UnauthorizedError("Malformed bearer token payload")
  }

  if (payload.exp <= Math.floor(Date.now() / 1000)) {
    throw new UnauthorizedError("Bearer token has expired")
  }

  return payload as AuthTokenPayload
}

/**
 * Encode a JSON value as a base64url JWT segment.
 *
 * @param value - Serializable token data.
 * @returns Encoded segment.
 */
function encodeSegment(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf-8").toString("base64url")
}

/**
 * Create the HS256 signature for a token.
 *
 * @param headerSegment - Encoded header segment.
 * @param payloadSegment - Encoded payload segment.
 * @param secret - Signing secret.
 * @returns Encoded signature.
 */
function createSignature(
  headerSegment: string,
  payloadSegment: string,
  secret: string,
): string {
  return createHmac("sha256", secret)
    .update(`${headerSegment}.${payloadSegment}`)
    .digest("base64url")
}
