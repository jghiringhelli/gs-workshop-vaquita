import type { Express } from "express"
import request, { type SuperTest, type Test } from "supertest"
import { createApp } from "../../src/app"
import type { AppConfig } from "../../src/config/env"
import type {
  ContributionView,
  ParticipantView,
  RoundSummaryView,
  TandaView,
} from "../../src/modules/tandas"
import type { UserView } from "../../src/modules/users"

export interface TestApiContext {
  readonly app: Express
  readonly client: SuperTest<Test>
  readonly config: AppConfig
}

export interface CreatedUserFixture {
  readonly user: UserView
  readonly token: string
}

export interface StartedTandaFixture {
  readonly organizer: CreatedUserFixture
  readonly memberOne: CreatedUserFixture
  readonly memberTwo: CreatedUserFixture
  readonly tanda: TandaView
  readonly participants: ReadonlyArray<ParticipantView>
}

let uniqueUserSequence = 0

/**
 * Builder for create-user requests.
 */
export class CreateUserRequestBuilder {
  private email = "alice@example.com"
  private name = "Alice"

  /**
   * Override the user email.
   *
   * @param email - Email address.
   * @returns Builder for chaining.
   */
  public withEmail(email: string): CreateUserRequestBuilder {
    this.email = email
    return this
  }

  /**
   * Override the user display name.
   *
   * @param name - Display name.
   * @returns Builder for chaining.
   */
  public withName(name: string): CreateUserRequestBuilder {
    this.name = name
    return this
  }

  /**
   * Produce the request payload.
   *
   * @returns Request payload object.
   */
  public build(): { readonly email: string; readonly name: string } {
    return {
      email: this.email,
      name: this.name,
    }
  }
}

/**
 * Builder for create-tanda requests.
 */
export class CreateTandaRequestBuilder {
  private name = "Tanda Enero"
  private organizerId = 1
  private contributionAmount = 1000
  private currencyCode: string | undefined

  /**
   * Override the tanda name.
   *
   * @param name - Tanda name.
   * @returns Builder for chaining.
   */
  public withName(name: string): CreateTandaRequestBuilder {
    this.name = name
    return this
  }

  /**
   * Override the organizer id.
   *
   * @param organizerId - Organizer user id.
   * @returns Builder for chaining.
   */
  public withOrganizerId(organizerId: number): CreateTandaRequestBuilder {
    this.organizerId = organizerId
    return this
  }

  /**
   * Override the contribution amount.
   *
   * @param contributionAmount - Contribution amount in major units.
   * @returns Builder for chaining.
   */
  public withContributionAmount(
    contributionAmount: number,
  ): CreateTandaRequestBuilder {
    this.contributionAmount = contributionAmount
    return this
  }

  /**
   * Override the currency code.
   *
   * @param currencyCode - ISO-like currency code.
   * @returns Builder for chaining.
   */
  public withCurrencyCode(currencyCode: string): CreateTandaRequestBuilder {
    this.currencyCode = currencyCode
    return this
  }

  /**
   * Produce the request payload.
   *
   * @returns Request payload object.
   */
  public build(): {
    readonly name: string
    readonly organizerId: number
    readonly contributionAmount: number
    readonly currencyCode?: string
  } {
    return {
      name: this.name,
      organizerId: this.organizerId,
      contributionAmount: this.contributionAmount,
      currencyCode: this.currencyCode,
    }
  }
}

/**
 * Builder for join-tanda requests.
 */
export class JoinTandaRequestBuilder {
  private userId = 1

  /**
   * Override the joining user id.
   *
   * @param userId - User id to join.
   * @returns Builder for chaining.
   */
  public withUserId(userId: number): JoinTandaRequestBuilder {
    this.userId = userId
    return this
  }

  /**
   * Produce the request payload.
   *
   * @returns Request payload object.
   */
  public build(): { readonly userId: number } {
    return {
      userId: this.userId,
    }
  }
}

/**
 * Builder for organizer command requests.
 */
export class OrganizerCommandRequestBuilder {
  private organizerId = 1

  /**
   * Override the organizer id.
   *
   * @param organizerId - Organizer user id.
   * @returns Builder for chaining.
   */
  public withOrganizerId(organizerId: number): OrganizerCommandRequestBuilder {
    this.organizerId = organizerId
    return this
  }

  /**
   * Produce the request payload.
   *
   * @returns Request payload object.
   */
  public build(): { readonly organizerId: number } {
    return {
      organizerId: this.organizerId,
    }
  }
}

/**
 * Builder for contribution requests.
 */
export class RecordContributionRequestBuilder {
  private participantId = 1
  private amount = 1000

  /**
   * Override the participant id.
   *
   * @param participantId - Participant id.
   * @returns Builder for chaining.
   */
  public withParticipantId(
    participantId: number,
  ): RecordContributionRequestBuilder {
    this.participantId = participantId
    return this
  }

  /**
   * Override the contributed amount.
   *
   * @param amount - Amount in major units.
   * @returns Builder for chaining.
   */
  public withAmount(amount: number): RecordContributionRequestBuilder {
    this.amount = amount
    return this
  }

  /**
   * Produce the request payload.
   *
   * @returns Request payload object.
   */
  public build(): { readonly participantId: number; readonly amount: number } {
    return {
      participantId: this.participantId,
      amount: this.amount,
    }
  }
}

/**
 * Create an isolated test app and Supertest client.
 *
 * @param overrides - Optional config overrides.
 * @returns Isolated app context.
 */
export function createTestApiContext(
  overrides: Partial<AppConfig> = {},
): TestApiContext {
  const config: AppConfig = {
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
    rateLimitMaxRequests: 10_000,
    requestIdSeed: "test-seed",
    ...overrides,
  }

  const app = createApp(config)

  return {
    app,
    client: request(app),
    config,
  }
}

/**
 * Create a user through the public API and return the created fixture.
 *
 * @param client - Supertest client.
 * @param builder - Optional request builder.
 * @returns Created user fixture.
 */
export async function createUserFixture(
  client: SuperTest<Test>,
  builder = createUniqueUserRequestBuilder(),
): Promise<CreatedUserFixture> {
  const response = await client.post("/api/users").send(builder.build())

  if (response.status !== 201) {
    throw new Error(`Expected user creation to succeed but received ${response.status}`)
  }

  return response.body.data as CreatedUserFixture
}

/**
 * Create a unique builder for fixture users to avoid duplicate-email collisions.
 *
 * @returns Builder with a unique email and name.
 */
function createUniqueUserRequestBuilder(): CreateUserRequestBuilder {
  uniqueUserSequence += 1

  return new CreateUserRequestBuilder()
    .withEmail(`user-${uniqueUserSequence}@example.com`)
    .withName(`User ${uniqueUserSequence}`)
}

/**
 * Create, join, and start a tanda through the public API.
 *
 * @param client - Supertest client.
 * @returns Started tanda fixture.
 */
export async function createStartedTandaFixture(
  client: SuperTest<Test>,
): Promise<StartedTandaFixture> {
  const organizer = await createUserFixture(
    client,
    new CreateUserRequestBuilder()
      .withEmail("organizer@example.com")
      .withName("Organizer"),
  )
  const memberOne = await createUserFixture(
    client,
    new CreateUserRequestBuilder()
      .withEmail("member-one@example.com")
      .withName("Member One"),
  )
  const memberTwo = await createUserFixture(
    client,
    new CreateUserRequestBuilder()
      .withEmail("member-two@example.com")
      .withName("Member Two"),
  )

  const createResponse = await client
    .post("/api/tandas")
    .set("Authorization", authorizationHeader(organizer.token))
    .send(
      new CreateTandaRequestBuilder()
        .withOrganizerId(organizer.user.id)
        .build(),
    )

  if (createResponse.status !== 201) {
    throw new Error(`Expected tanda creation to succeed but received ${createResponse.status}`)
  }

  const createdTanda = createResponse.body.data as TandaView

  await client
    .post(`/api/tandas/${createdTanda.id}/join`)
    .set("Authorization", authorizationHeader(memberOne.token))
    .send(new JoinTandaRequestBuilder().withUserId(memberOne.user.id).build())

  await client
    .post(`/api/tandas/${createdTanda.id}/join`)
    .set("Authorization", authorizationHeader(memberTwo.token))
    .send(new JoinTandaRequestBuilder().withUserId(memberTwo.user.id).build())

  const startResponse = await client
    .post(`/api/tandas/${createdTanda.id}/start`)
    .set("Authorization", authorizationHeader(organizer.token))
    .send(
      new OrganizerCommandRequestBuilder()
        .withOrganizerId(organizer.user.id)
        .build(),
    )

  if (startResponse.status !== 200) {
    throw new Error(`Expected tanda start to succeed but received ${startResponse.status}`)
  }

  return {
    organizer,
    memberOne,
    memberTwo,
    tanda: startResponse.body.data.tanda as TandaView,
    participants: startResponse.body.data.participants as ParticipantView[],
  }
}

/**
 * Look up a participant id by user id inside a started tanda fixture.
 *
 * @param fixture - Started tanda fixture.
 * @param userId - User id to match.
 * @returns Matching participant id.
 */
export function getParticipantIdByUserId(
  fixture: StartedTandaFixture,
  userId: number,
): number {
  const participant = fixture.participants.find((item) => item.userId === userId)

  if (!participant) {
    throw new Error(`Participant for user ${userId} was not found`)
  }

  return participant.id
}

/**
 * Read a round summary via the public API.
 *
 * @param client - Supertest client.
 * @param tandaId - Tanda id.
 * @param round - Round number.
 * @returns Round summary payload.
 */
export async function getRoundSummaryFixture(
  client: SuperTest<Test>,
  tandaId: number,
  round: number,
): Promise<RoundSummaryView> {
  const response = await client.get(`/api/tandas/${tandaId}/rounds/${round}`)

  if (response.status !== 200) {
    throw new Error(`Expected round summary to succeed but received ${response.status}`)
  }

  return response.body.data as RoundSummaryView
}

/**
 * Build a standard bearer authorization header.
 *
 * @param token - JWT token.
 * @returns Bearer header value.
 */
export function authorizationHeader(token: string): string {
  return `Bearer ${token}`
}
