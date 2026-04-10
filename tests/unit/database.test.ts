import { existsSync, mkdtempSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { describe, expect, it } from "vitest"
import { initializeDatabase } from "../../src/database"
import { initializeDatabase as initializeDatabaseFromInfrastructure } from "../../src/infrastructure/database"
import { createTestConfig } from "../support/test-config"

describe("Database bootstrap", () => {
  it("InitializeDatabase_MemoryPath_CreatesExpectedSchemaTables", () => {
    const database = initializeDatabase(
      createTestConfig({
        databasePath: ":memory:",
      }),
    )

    const rows = database
      .prepare(
        `
          SELECT name
          FROM sqlite_master
          WHERE type = 'table'
          ORDER BY name ASC
        `,
      )
      .all() as Array<{ name: string }>

    expect(rows.map((row) => row.name)).toEqual(
      expect.arrayContaining([
        "contributions",
        "participants",
        "tandas",
        "users",
      ]),
    )

    database.close()
  })

  it("InitializeDatabase_FilePath_CreatesParentDirectoryAndDatabaseFile", () => {
    const tempDirectory = mkdtempSync(join(tmpdir(), "tanda-api-"))
    const databasePath = join(tempDirectory, "nested", "tanda.sqlite")
    const database = initializeDatabase(
      createTestConfig({
        databasePath,
      }),
    )

    database
      .prepare(
        `
          INSERT INTO users (email, name, created_at)
          VALUES (?, ?, ?)
        `,
      )
      .run("alice@example.com", "Alice", new Date().toISOString())
    database.close()

    expect(existsSync(databasePath)).toBe(true)
  })

  it("InitializeDatabase_InfrastructureShimImported_DelegatesToPrimaryInitializer", () => {
    expect(initializeDatabaseFromInfrastructure).toBe(initializeDatabase)
  })
})
