import { describe, expect, it } from "vitest"
import {
  signAuthToken,
  verifyAuthToken,
  type AuthTokenPayload,
} from "../../src/shared/auth/jwt"

const testSecret = "jwt-test-secret"

describe("JWT auth", () => {
  it("SignAuthToken_ValidPayload_ProducesVerifiableToken", () => {
    const payload = buildPayload()

    const token = signAuthToken(payload, testSecret)

    expect(verifyAuthToken(token, testSecret)).toEqual(payload)
  })

  it("VerifyAuthToken_MalformedTokenSegments_ThrowsUnauthorizedError", () => {
    expect(() => verifyAuthToken("not-a-jwt", testSecret)).toThrowError(
      "Malformed bearer token",
    )
  })

  it("VerifyAuthToken_TamperedSignature_ThrowsUnauthorizedError", () => {
    const token = signAuthToken(buildPayload(), testSecret)
    const segments = token.split(".")
    const signature = segments[2] as string
    segments[2] = `${signature.slice(0, -1)}${signature.endsWith("a") ? "b" : "a"}`

    expect(() => verifyAuthToken(segments.join("."), testSecret)).toThrowError(
      "Invalid bearer token signature",
    )
  })

  it("VerifyAuthToken_MalformedPayload_ThrowsUnauthorizedError", () => {
    const malformedToken = signAuthToken(
      {
        email: "alice@example.com",
        name: "Alice",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      } as unknown as AuthTokenPayload,
      testSecret,
    )

    expect(() => verifyAuthToken(malformedToken, testSecret)).toThrowError(
      "Malformed bearer token payload",
    )
  })

  it("VerifyAuthToken_ExpiredPayload_ThrowsUnauthorizedError", () => {
    const expiredToken = signAuthToken(buildPayload(-60), testSecret)

    expect(() => verifyAuthToken(expiredToken, testSecret)).toThrowError(
      "Bearer token has expired",
    )
  })
})

/**
 * Build a valid auth payload with a configurable expiration offset.
 *
 * @param expirationOffsetSeconds - Seconds from now until token expiration.
 * @returns JWT payload.
 */
function buildPayload(expirationOffsetSeconds = 3600): AuthTokenPayload {
  const issuedAt = Math.floor(Date.now() / 1000)

  return {
    sub: 42,
    email: "alice@example.com",
    name: "Alice",
    iat: issuedAt,
    exp: issuedAt + expirationOffsetSeconds,
  }
}
