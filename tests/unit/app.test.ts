import request from "supertest"
import { afterEach, describe, expect, it } from "vitest"
import { createApp } from "../../src/app"

const touchedEnvironmentVariables = [
  "APP_VERSION",
  "DATABASE_PATH",
  "JWT_SECRET",
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

describe("App wiring", () => {
  it("CreateApp_NoProvidedConfig_LoadsConfigurationFromEnvironment", async () => {
    process.env.APP_VERSION = "env-version"
    process.env.DATABASE_PATH = ":memory:"
    process.env.JWT_SECRET = "env-secret"
    process.env.REQUEST_ID_SEED = "env-seed"

    const app = createApp()
    const response = await request(app).get("/health")

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({
      status: "ok",
      version: "env-version",
    })
  })
})
