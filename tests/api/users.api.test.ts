import { describe, expect, it } from "vitest"
import {
  CreateUserRequestBuilder,
  createTestApiContext,
} from "../support/api-test-fixtures"

describe("Users API", () => {
  it("GETHealth_ServiceBooted_ReturnsStatusOk", async () => {
    const { client } = createTestApiContext()

    const response = await client.get("/health")

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({
      status: "ok",
      version: "test",
    })
    expect(typeof response.body.data.uptimeSeconds).toBe("number")
    expect(response.body.errors).toEqual([])
  })

  it("POSTApiUsers_ValidPayload_ReturnsCreatedUserAndToken", async () => {
    const { client } = createTestApiContext()

    const response = await client
      .post("/api/users")
      .send(new CreateUserRequestBuilder().build())

    expect(response.status).toBe(201)
    expect(response.body.data.user).toMatchObject({
      id: 1,
      email: "alice@example.com",
      name: "Alice",
    })
    expect(typeof response.body.data.token).toBe("string")
    expect(response.body.errors).toEqual([])
  })

  it("POSTApiUsers_DuplicateEmail_ReturnsConflictError", async () => {
    const { client } = createTestApiContext()
    const requestBody = new CreateUserRequestBuilder().build()

    await client.post("/api/users").send(requestBody)
    const response = await client.post("/api/users").send(requestBody)

    expect(response.status).toBe(409)
    expect(response.body.errors[0]).toMatchObject({
      code: "CONFLICT",
    })
  })

  it("GETApiUsers_DefaultPagination_ReturnsCreatedUsers", async () => {
    const { client } = createTestApiContext()

    await client
      .post("/api/users")
      .send(
        new CreateUserRequestBuilder()
          .withEmail("alice@example.com")
          .withName("Alice")
          .build(),
      )
    await client
      .post("/api/users")
      .send(
        new CreateUserRequestBuilder()
          .withEmail("bob@example.com")
          .withName("Bob")
          .build(),
      )

    const response = await client.get("/api/users")

    expect(response.status).toBe(200)
    expect(response.body.data).toHaveLength(2)
    expect(response.body.meta).toMatchObject({
      total: 2,
      page: 1,
      pageSize: 20,
    })
  })

  it("GETApiUsers_InvalidPageQuery_ReturnsValidationError", async () => {
    const { client } = createTestApiContext()

    const response = await client.get("/api/users?page=0")

    expect(response.status).toBe(422)
    expect(response.body.errors[0]).toMatchObject({
      code: "VALIDATION_ERROR",
    })
  })

  it("GETApiUsersById_ExistingUser_ReturnsUser", async () => {
    const { client } = createTestApiContext()

    await client.post("/api/users").send(new CreateUserRequestBuilder().build())
    const response = await client.get("/api/users/1")

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({
      id: 1,
      email: "alice@example.com",
      name: "Alice",
    })
  })

  it("GETApiUsersById_MissingUser_ReturnsNotFound", async () => {
    const { client } = createTestApiContext()

    const response = await client.get("/api/users/999")

    expect(response.status).toBe(404)
    expect(response.body.errors[0]).toMatchObject({
      code: "NOT_FOUND",
    })
  })
})
