import { describe, expect, it } from "vitest"
import {
  authorizationHeader,
  CreateTandaRequestBuilder,
  createStartedTandaFixture,
  createTestApiContext,
  createUserFixture,
  getParticipantIdByUserId,
  getRoundSummaryFixture,
  JoinTandaRequestBuilder,
  OrganizerCommandRequestBuilder,
  RecordContributionRequestBuilder,
} from "../support/api-test-fixtures"

describe("Tandas API", () => {
  it("POSTApiV1Tandas_ValidPayload_ReturnsCreatedTandaAndOrganizerParticipant", async () => {
    const { client } = createTestApiContext()
    const organizer = await createUserFixture(client)

    const response = await client
      .post("/api/v1/tandas")
      .set("Authorization", authorizationHeader(organizer.token))
      .send(
        new CreateTandaRequestBuilder()
          .withOrganizerId(organizer.user.id)
          .build(),
      )

    expect(response.status).toBe(201)
    expect(response.body.data).toMatchObject({
      id: 1,
      organizerId: organizer.user.id,
      name: "Tanda Enero",
      status: "forming",
      participantCount: 1,
      currentRecipient: null,
    })
  })

  it("POSTApiTandas_UnknownOrganizer_ReturnsNotFound", async () => {
    const { client } = createTestApiContext()

    const response = await client
      .post("/api/tandas")
      .send(
        new CreateTandaRequestBuilder()
          .withOrganizerId(999)
          .build(),
      )

    expect(response.status).toBe(404)
    expect(response.body.errors[0]).toMatchObject({
      code: "NOT_FOUND",
    })
  })

  it("GETApiTandas_FilteredByMembership_ReturnsMatchingTandas", async () => {
    const { client } = createTestApiContext()
    const organizer = await createUserFixture(client)

    await client
      .post("/api/tandas")
      .send(
        new CreateTandaRequestBuilder()
          .withOrganizerId(organizer.user.id)
          .build(),
      )

    const response = await client.get(`/api/tandas?userId=${organizer.user.id}`)

    expect(response.status).toBe(200)
    expect(response.body.data).toHaveLength(1)
    expect(response.body.data[0]).toMatchObject({
      organizerId: organizer.user.id,
      name: "Tanda Enero",
    })
  })

  it("GETApiTandas_AuthenticatedForDifferentUser_ReturnsForbidden", async () => {
    const { client } = createTestApiContext()
    const alice = await createUserFixture(client)
    const bob = await createUserFixture(client)

    const response = await client
      .get(`/api/tandas?userId=${bob.user.id}`)
      .set("Authorization", authorizationHeader(alice.token))

    expect(response.status).toBe(403)
    expect(response.body.errors[0]).toMatchObject({
      code: "FORBIDDEN",
    })
  })

  it("GETApiTandasById_ExistingTanda_ReturnsTandaDetails", async () => {
    const { client } = createTestApiContext()
    const organizer = await createUserFixture(client)
    const createResponse = await client
      .post("/api/tandas")
      .send(
        new CreateTandaRequestBuilder()
          .withOrganizerId(organizer.user.id)
          .build(),
      )

    const response = await client.get(`/api/tandas/${createResponse.body.data.id}`)

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({
      id: createResponse.body.data.id,
      organizerId: organizer.user.id,
      status: "forming",
    })
  })

  it("GETApiTandasById_MissingTanda_ReturnsNotFound", async () => {
    const { client } = createTestApiContext()

    const response = await client.get("/api/tandas/999")

    expect(response.status).toBe(404)
    expect(response.body.errors[0]).toMatchObject({
      code: "NOT_FOUND",
    })
  })

  it("POSTApiTandasJoin_ValidPayload_ReturnsJoinedParticipant", async () => {
    const { client } = createTestApiContext()
    const organizer = await createUserFixture(client)
    const member = await createUserFixture(client)
    const createResponse = await client
      .post("/api/tandas")
      .send(
        new CreateTandaRequestBuilder()
          .withOrganizerId(organizer.user.id)
          .build(),
      )

    const response = await client
      .post(`/api/tandas/${createResponse.body.data.id}/join`)
      .set("Authorization", authorizationHeader(member.token))
      .send(new JoinTandaRequestBuilder().withUserId(member.user.id).build())

    expect(response.status).toBe(200)
    expect(response.body.data.participant).toMatchObject({
      userId: member.user.id,
      role: "member",
    })
    expect(response.body.data.tanda).toMatchObject({
      participantCount: 2,
    })
  })

  it("POSTApiTandasJoin_DuplicateMember_ReturnsConflict", async () => {
    const { client } = createTestApiContext()
    const organizer = await createUserFixture(client)
    const member = await createUserFixture(client)
    const createResponse = await client
      .post("/api/tandas")
      .send(
        new CreateTandaRequestBuilder()
          .withOrganizerId(organizer.user.id)
          .build(),
      )

    await client
      .post(`/api/tandas/${createResponse.body.data.id}/join`)
      .set("Authorization", authorizationHeader(member.token))
      .send(new JoinTandaRequestBuilder().withUserId(member.user.id).build())
    const response = await client
      .post(`/api/tandas/${createResponse.body.data.id}/join`)
      .set("Authorization", authorizationHeader(member.token))
      .send(new JoinTandaRequestBuilder().withUserId(member.user.id).build())

    expect(response.status).toBe(409)
    expect(response.body.errors[0]).toMatchObject({
      code: "CONFLICT",
    })
  })

  it("POSTApiTandasStart_EnoughParticipants_ReturnsActiveTandaWithRotation", async () => {
    const { client } = createTestApiContext()
    const fixture = await createStartedTandaFixture(client)

    expect(fixture.tanda.status).toBe("active")
    expect(fixture.tanda.currentRound).toBe(1)
    expect(fixture.participants).toHaveLength(3)
    expect(
      fixture.participants
        .map((participant) => participant.rotationPosition)
        .sort(),
    ).toEqual([1, 2, 3])
  })

  it("POSTApiTandasStart_TooFewParticipants_ReturnsBadRequest", async () => {
    const { client } = createTestApiContext()
    const organizer = await createUserFixture(client)
    const member = await createUserFixture(client)
    const createResponse = await client
      .post("/api/tandas")
      .send(
        new CreateTandaRequestBuilder()
          .withOrganizerId(organizer.user.id)
          .build(),
      )

    await client
      .post(`/api/tandas/${createResponse.body.data.id}/join`)
      .set("Authorization", authorizationHeader(member.token))
      .send(new JoinTandaRequestBuilder().withUserId(member.user.id).build())

    const response = await client
      .post(`/api/tandas/${createResponse.body.data.id}/start`)
      .send(
        new OrganizerCommandRequestBuilder()
          .withOrganizerId(organizer.user.id)
          .build(),
      )

    expect(response.status).toBe(400)
    expect(response.body.errors[0]).toMatchObject({
      code: "BAD_REQUEST",
    })
  })

  it("POSTApiTandasCancel_OrganizerCancels_ReturnsCancelledTanda", async () => {
    const { client } = createTestApiContext()
    const organizer = await createUserFixture(client)
    const createResponse = await client
      .post("/api/tandas")
      .send(
        new CreateTandaRequestBuilder()
          .withOrganizerId(organizer.user.id)
          .build(),
      )

    const response = await client
      .post(`/api/tandas/${createResponse.body.data.id}/cancel`)
      .send(
        new OrganizerCommandRequestBuilder()
          .withOrganizerId(organizer.user.id)
          .build(),
      )

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({
      status: "cancelled",
    })
  })

  it("POSTApiTandasCancel_NonOrganizer_ReturnsForbidden", async () => {
    const { client } = createTestApiContext()
    const organizer = await createUserFixture(client)
    const member = await createUserFixture(client)
    const createResponse = await client
      .post("/api/tandas")
      .send(
        new CreateTandaRequestBuilder()
          .withOrganizerId(organizer.user.id)
          .build(),
      )

    const response = await client
      .post(`/api/tandas/${createResponse.body.data.id}/cancel`)
      .set("Authorization", authorizationHeader(member.token))
      .send(
        new OrganizerCommandRequestBuilder()
          .withOrganizerId(member.user.id)
          .build(),
      )

    expect(response.status).toBe(403)
    expect(response.body.errors[0]).toMatchObject({
      code: "FORBIDDEN",
    })
  })

  it("GETApiTandasParticipants_ExistingTanda_ReturnsParticipants", async () => {
    const { client } = createTestApiContext()
    const fixture = await createStartedTandaFixture(client)

    const response = await client.get(`/api/tandas/${fixture.tanda.id}/participants`)

    expect(response.status).toBe(200)
    expect(response.body.data).toHaveLength(3)
  })

  it("GETApiTandasParticipants_MissingTanda_ReturnsNotFound", async () => {
    const { client } = createTestApiContext()

    const response = await client.get("/api/tandas/999/participants")

    expect(response.status).toBe(404)
    expect(response.body.errors[0]).toMatchObject({
      code: "NOT_FOUND",
    })
  })

  it("POSTApiTandasContributions_ActiveTandaAndValidAmount_ReturnsCreatedContribution", async () => {
    const { client } = createTestApiContext()
    const fixture = await createStartedTandaFixture(client)
    const organizerParticipantId = getParticipantIdByUserId(
      fixture,
      fixture.organizer.user.id,
    )

    const response = await client
      .post(`/api/tandas/${fixture.tanda.id}/contributions`)
      .set("Authorization", authorizationHeader(fixture.organizer.token))
      .send(
        new RecordContributionRequestBuilder()
          .withParticipantId(organizerParticipantId)
          .withAmount(fixture.tanda.contributionAmount)
          .build(),
      )

    expect(response.status).toBe(201)
    expect(response.body.data).toMatchObject({
      participantId: organizerParticipantId,
      round: 1,
      amount: fixture.tanda.contributionAmount,
      status: "paid",
    })
  })

  it("POSTApiTandasContributions_WrongAmount_ReturnsBadRequest", async () => {
    const { client } = createTestApiContext()
    const fixture = await createStartedTandaFixture(client)
    const organizerParticipantId = getParticipantIdByUserId(
      fixture,
      fixture.organizer.user.id,
    )

    const response = await client
      .post(`/api/tandas/${fixture.tanda.id}/contributions`)
      .set("Authorization", authorizationHeader(fixture.organizer.token))
      .send(
        new RecordContributionRequestBuilder()
          .withParticipantId(organizerParticipantId)
          .withAmount(999)
          .build(),
      )

    expect(response.status).toBe(400)
    expect(response.body.errors[0]).toMatchObject({
      code: "BAD_REQUEST",
    })
  })

  it("GETApiTandasRounds_ExistingRound_ReturnsRoundSummary", async () => {
    const { client } = createTestApiContext()
    const fixture = await createStartedTandaFixture(client)

    const summary = await getRoundSummaryFixture(client, fixture.tanda.id, 1)

    expect(summary).toMatchObject({
      tandaId: fixture.tanda.id,
      round: 1,
      status: "active",
      totalExpectedAmount: 3000,
      totalCollectedAmount: 0,
    })
  })

  it("GETApiTandasRounds_InvalidRound_ReturnsNotFound", async () => {
    const { client } = createTestApiContext()
    const fixture = await createStartedTandaFixture(client)

    const response = await client.get(`/api/tandas/${fixture.tanda.id}/rounds/999`)

    expect(response.status).toBe(404)
    expect(response.body.errors[0]).toMatchObject({
      code: "NOT_FOUND",
    })
  })

  it("POSTApiTandasAdvance_ActiveTanda_ReturnsNextRoundAndMarksMissedMembers", async () => {
    const { client } = createTestApiContext()
    const fixture = await createStartedTandaFixture(client)
    const organizerParticipantId = getParticipantIdByUserId(
      fixture,
      fixture.organizer.user.id,
    )

    await client
      .post(`/api/tandas/${fixture.tanda.id}/contributions`)
      .set("Authorization", authorizationHeader(fixture.organizer.token))
      .send(
        new RecordContributionRequestBuilder()
          .withParticipantId(organizerParticipantId)
          .withAmount(fixture.tanda.contributionAmount)
          .build(),
      )

    const response = await client
      .post(`/api/tandas/${fixture.tanda.id}/advance`)
      .set("Authorization", authorizationHeader(fixture.organizer.token))
      .send(
        new OrganizerCommandRequestBuilder()
          .withOrganizerId(fixture.organizer.user.id)
          .build(),
      )

    const roundSummary = await getRoundSummaryFixture(client, fixture.tanda.id, 1)

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({
      closedRound: 1,
      tanda: {
        currentRound: 2,
        status: "active",
      },
    })
    expect(roundSummary.totalCollectedAmount).toBe(fixture.tanda.contributionAmount)
    expect(roundSummary.contributions.map((item) => item.status).sort()).toEqual([
      "missed",
      "missed",
      "paid",
    ])
  })

  it("POSTApiTandasAdvance_NonOrganizer_ReturnsForbidden", async () => {
    const { client } = createTestApiContext()
    const fixture = await createStartedTandaFixture(client)

    const response = await client
      .post(`/api/tandas/${fixture.tanda.id}/advance`)
      .set("Authorization", authorizationHeader(fixture.memberOne.token))
      .send(
        new OrganizerCommandRequestBuilder()
          .withOrganizerId(fixture.memberOne.user.id)
          .build(),
      )

    expect(response.status).toBe(403)
    expect(response.body.errors[0]).toMatchObject({
      code: "FORBIDDEN",
    })
  })

  it("GETApiTandasParticipantsHistory_ExistingParticipant_ReturnsContributionHistory", async () => {
    const { client } = createTestApiContext()
    const fixture = await createStartedTandaFixture(client)
    const organizerParticipantId = getParticipantIdByUserId(
      fixture,
      fixture.organizer.user.id,
    )

    await client
      .post(`/api/tandas/${fixture.tanda.id}/contributions`)
      .set("Authorization", authorizationHeader(fixture.organizer.token))
      .send(
        new RecordContributionRequestBuilder()
          .withParticipantId(organizerParticipantId)
          .withAmount(fixture.tanda.contributionAmount)
          .build(),
      )

    const response = await client
      .get(`/api/tandas/${fixture.tanda.id}/participants/${organizerParticipantId}/history`)
      .set("Authorization", authorizationHeader(fixture.organizer.token))

    expect(response.status).toBe(200)
    expect(response.body.data.participant).toMatchObject({
      id: organizerParticipantId,
      userId: fixture.organizer.user.id,
    })
    expect(response.body.data.contributions).toHaveLength(1)
  })

  it("GETApiTandasParticipantsHistory_MissingParticipant_ReturnsNotFound", async () => {
    const { client } = createTestApiContext()
    const fixture = await createStartedTandaFixture(client)

    const response = await client.get(
      `/api/tandas/${fixture.tanda.id}/participants/999/history`,
    )

    expect(response.status).toBe(404)
    expect(response.body.errors[0]).toMatchObject({
      code: "NOT_FOUND",
    })
  })
})
