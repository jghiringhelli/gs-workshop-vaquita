import type Database from "better-sqlite3"
import { initializeDatabase } from "../../src/database"
import type { AppConfig } from "../../src/config/env"
import {
  SqliteTandaRepository,
  TandaService,
  type ParticipantView,
  type TandaView,
} from "../../src/modules/tandas"
import {
  SqliteUserRepository,
  UserService,
  type CreatedUserResult,
} from "../../src/modules/users"
import { createTestConfig } from "./test-config"

export interface TandaDomainContext {
  readonly config: AppConfig
  readonly database: Database.Database
  readonly userRepository: SqliteUserRepository
  readonly tandaRepository: SqliteTandaRepository
  readonly userService: UserService
  readonly tandaService: TandaService
  close(): void
}

export interface StartedTandaDomainFixture {
  readonly organizer: CreatedUserResult
  readonly memberOne: CreatedUserResult
  readonly memberTwo: CreatedUserResult
  readonly tanda: TandaView
  readonly participants: ReadonlyArray<ParticipantView>
}

let userSequence = 0

/**
 * Create a fully wired in-memory domain context for repository and service tests.
 *
 * @param overrides - Optional config overrides.
 * @returns Disposable domain context.
 */
export function createTandaDomainContext(
  overrides: Partial<AppConfig> = {},
): TandaDomainContext {
  const config = createTestConfig({
    databasePath: ":memory:",
    ...overrides,
  })
  const database = initializeDatabase(config)
  const userRepository = new SqliteUserRepository(database)
  const tandaRepository = new SqliteTandaRepository(database)
  const userService = new UserService(userRepository, config)
  const tandaService = new TandaService(tandaRepository, userRepository, config)

  return {
    config,
    database,
    userRepository,
    tandaRepository,
    userService,
    tandaService,
    close() {
      database.close()
    },
  }
}

/**
 * Create a unique test user through the user service.
 *
 * @param context - Domain context.
 * @param label - Human-readable label for the user.
 * @returns Created user result.
 */
export function createDomainUser(
  context: TandaDomainContext,
  label = "User",
): CreatedUserResult {
  userSequence += 1

  return context.userService.createUser({
    email: `domain-user-${userSequence}@example.com`,
    name: `${label} ${userSequence}`,
  })
}

/**
 * Create and start a standard 3-person tanda fixture.
 *
 * @param context - Domain context.
 * @returns Started tanda fixture.
 */
export function createStartedTandaDomainFixture(
  context: TandaDomainContext,
): StartedTandaDomainFixture {
  const organizer = createDomainUser(context, "Organizer")
  const memberOne = createDomainUser(context, "Member One")
  const memberTwo = createDomainUser(context, "Member Two")
  const tanda = context.tandaService.createTanda({
    name: "Domain Tanda",
    organizerId: organizer.user.id,
    contributionAmount: 1000,
    requestedByUserId: organizer.user.id,
  })

  context.tandaService.joinTanda({
    tandaId: tanda.id,
    userId: memberOne.user.id,
    requestedByUserId: memberOne.user.id,
  })
  context.tandaService.joinTanda({
    tandaId: tanda.id,
    userId: memberTwo.user.id,
    requestedByUserId: memberTwo.user.id,
  })

  const started = context.tandaService.startTanda({
    tandaId: tanda.id,
    organizerId: organizer.user.id,
    requestedByUserId: organizer.user.id,
  })

  return {
    organizer,
    memberOne,
    memberTwo,
    tanda: started.tanda,
    participants: started.participants,
  }
}

/**
 * Look up a participant by user id within a started tanda fixture.
 *
 * @param fixture - Started tanda fixture.
 * @param userId - User id to match.
 * @returns Matching participant.
 */
export function getParticipantByUserId(
  fixture: StartedTandaDomainFixture,
  userId: number,
): ParticipantView {
  const participant = fixture.participants.find((item) => item.userId === userId)

  if (!participant) {
    throw new Error(`Participant for user ${userId} was not found`)
  }

  return participant
}
