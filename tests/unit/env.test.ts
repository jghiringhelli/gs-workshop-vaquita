import { afterEach, describe, expect, it } from "vitest"
import { loadConfig } from "../../src/config/env"

const touchedEnvironmentVariables = [
  "APP_VERSION",
  "DATABASE_PATH",
  "PORT",
  "MIN_PARTICIPANTS",
  "MAX_PARTICIPANTS",
  "CONTRIBUTION_WINDOW_HOURS",
  "LATE_PENALTY_BASIS_POINTS",
  "DEFAULT_CURRENCY_CODE",
  "DEFAULT_PAGE_SIZE",
  "MAX_PAGE_SIZE",
  "SHUTDOWN_TIMEOUT_MS",
  "JWT_SECRET",
  "JWT_TTL_SECONDS",
  "RATE_LIMIT_WINDOW_MS",
  "RATE_LIMIT_MAX_REQUESTS",
  "REQUEST_ID_SEED",
] as const

const originalEnvironment = new Map(
  touchedEnvironmentVariables.map((name) => [name, process.env[name]]),
)

afterEach(() => {
  touchedEnvironmentVariables.forEach((name) => {
    const originalValue = originalEnvironment.get(name)

    if (originalValue === undefined) {
      delete process.env[name]
      return
    }

    process.env[name] = originalValue
  })
})

describe("Environment config", () => {
  it("LoadConfig_NoEnvironmentOverrides_ReturnsDefaultsAndGeneratedSecrets", () => {
    touchedEnvironmentVariables.forEach((name) => {
      delete process.env[name]
    })

    const config = loadConfig()

    expect(config).toMatchObject({
      appVersion: "1.0.0",
      databasePath: "./data/tanda.sqlite",
      port: 3000,
      minParticipants: 3,
      maxParticipants: 20,
      contributionWindowHours: 24,
      latePenaltyBasisPoints: 500,
      defaultCurrencyCode: "MXN",
      defaultPageSize: 20,
      maxPageSize: 100,
      shutdownTimeoutMs: 30_000,
      jwtTtlSeconds: 86_400,
      rateLimitWindowMs: 60_000,
      rateLimitMaxRequests: 120,
    })
    expect(config.jwtSecret.startsWith("dev-secret-")).toBe(true)
    expect(config.requestIdSeed.length).toBeGreaterThan(0)
  })

  it("LoadConfig_BlankEnvironmentOverrides_UsesFallbackValues", () => {
    process.env.DATABASE_PATH = "   "
    process.env.PORT = " "
    process.env.JWT_SECRET = ""
    process.env.DEFAULT_CURRENCY_CODE = "   "

    const config = loadConfig()

    expect(config.databasePath).toBe("./data/tanda.sqlite")
    expect(config.port).toBe(3000)
    expect(config.defaultCurrencyCode).toBe("MXN")
    expect(config.jwtSecret.startsWith("dev-secret-")).toBe(true)
  })

  it("LoadConfig_EnvironmentOverridesPresent_ReturnsParsedValues", () => {
    process.env.APP_VERSION = "2.0.0"
    process.env.DATABASE_PATH = "./tmp/app.sqlite"
    process.env.PORT = "4321"
    process.env.MIN_PARTICIPANTS = "4"
    process.env.MAX_PARTICIPANTS = "12"
    process.env.CONTRIBUTION_WINDOW_HOURS = "48"
    process.env.LATE_PENALTY_BASIS_POINTS = "700"
    process.env.DEFAULT_CURRENCY_CODE = "usd"
    process.env.DEFAULT_PAGE_SIZE = "25"
    process.env.MAX_PAGE_SIZE = "50"
    process.env.SHUTDOWN_TIMEOUT_MS = "9000"
    process.env.JWT_SECRET = "custom-secret"
    process.env.JWT_TTL_SECONDS = "7200"
    process.env.RATE_LIMIT_WINDOW_MS = "5000"
    process.env.RATE_LIMIT_MAX_REQUESTS = "99"
    process.env.REQUEST_ID_SEED = "custom-seed"

    const config = loadConfig()

    expect(config).toMatchObject({
      appVersion: "2.0.0",
      databasePath: "./tmp/app.sqlite",
      port: 4321,
      minParticipants: 4,
      maxParticipants: 12,
      contributionWindowHours: 48,
      latePenaltyBasisPoints: 700,
      defaultCurrencyCode: "usd",
      defaultPageSize: 25,
      maxPageSize: 50,
      shutdownTimeoutMs: 9000,
      jwtSecret: "custom-secret",
      jwtTtlSeconds: 7200,
      rateLimitWindowMs: 5000,
      rateLimitMaxRequests: 99,
      requestIdSeed: "custom-seed",
    })
  })

  it("LoadConfig_InvalidNumericEnvironment_ThrowsHelpfulError", () => {
    process.env.PORT = "not-a-number"

    expect(() => loadConfig()).toThrowError(
      "Environment variable PORT must be a valid number",
    )
  })
})
