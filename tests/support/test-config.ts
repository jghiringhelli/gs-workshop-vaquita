import type { AppConfig } from "../../src/config/env"

/**
 * Build a complete app config for isolated unit and integration tests.
 *
 * @param overrides - Partial config overrides for the test case.
 * @returns Fully populated app config.
 */
export function createTestConfig(
  overrides: Partial<AppConfig> = {},
): AppConfig {
  return {
    appVersion: "test",
    databasePath: ":memory:",
    port: 3000,
    minParticipants: 3,
    maxParticipants: 20,
    contributionWindowHours: 24,
    latePenaltyBasisPoints: 500,
    defaultCurrencyCode: "MXN",
    defaultPageSize: 20,
    maxPageSize: 100,
    shutdownTimeoutMs: 1000,
    jwtSecret: "test-secret",
    jwtTtlSeconds: 3600,
    rateLimitWindowMs: 60_000,
    rateLimitMaxRequests: 100,
    requestIdSeed: "test-seed",
    ...overrides,
  }
}
