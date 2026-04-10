import { afterEach, describe, expect, it } from "vitest"
import type { UserRecord } from "../../src/modules/users"
import {
  createDomainUser,
  createTandaDomainContext,
  type TandaDomainContext,
} from "../support/tanda-domain-fixtures"

const contexts: TandaDomainContext[] = []

afterEach(() => {
  while (contexts.length > 0) {
    contexts.pop()?.close()
  }
})

describe("Tanda repository", () => {
  it("ListTandas_NoUserFilter_ReturnsPagedResultsInDescendingOrder", () => {
    const context = createManagedContext()
    const firstOrganizer = createDomainUser(context, "Organizer")
    const secondOrganizer = createDomainUser(context, "Organizer")

    createPersistedTanda(context, firstOrganizer.user.id, "First tanda")
    createPersistedTanda(context, secondOrganizer.user.id, "Second tanda")

    const result = context.tandaRepository.listTandas({
      page: 1,
      pageSize: 10,
    })

    expect(result.total).toBe(2)
    expect(result.items.map((item) => item.name)).toEqual([
      "Second tanda",
      "First tanda",
    ])
  })

  it("AddParticipant_IsDefaulterTrue_PersistsDefaulterFlag", () => {
    const context = createManagedContext()
    const organizer = createDomainUser(context, "Organizer")
    const member = createDomainUser(context, "Member")
    const tanda = createPersistedTanda(context, organizer.user.id, "Defaulter tanda")

    const participant = context.tandaRepository.addParticipant({
      userId: member.user.id,
      tandaId: tanda.id,
      role: "member",
      rotationPosition: null,
      isDefaulter: true,
      joinedAt: new Date().toISOString(),
    })

    expect(context.tandaRepository.findParticipantById(participant.id)).toMatchObject({
      id: participant.id,
      isDefaulter: true,
    })
  })

  it("FindContribution_NoMatchingRecord_ReturnsNull", () => {
    const context = createManagedContext()

    expect(context.tandaRepository.findContribution(1, 1, 1)).toBeNull()
  })

  it("CountRecentMisses_NonMissedContributionEncountered_StopsCounting", () => {
    const context = createManagedContext()
    const organizer = createDomainUser(context, "Organizer")
    const member = createDomainUser(context, "Member")
    const tanda = createPersistedTanda(context, organizer.user.id, "Missed tanda")
    const participant = context.tandaRepository.addParticipant({
      userId: member.user.id,
      tandaId: tanda.id,
      role: "member",
      rotationPosition: 2,
      isDefaulter: false,
      joinedAt: new Date().toISOString(),
    })

    context.tandaRepository.createContribution({
      tandaId: tanda.id,
      participantId: participant.id,
      round: 1,
      amountMinor: 100_000,
      penaltyMinor: 0,
      status: "missed",
      recordedAt: new Date().toISOString(),
      paidAt: null,
    })
    context.tandaRepository.createContribution({
      tandaId: tanda.id,
      participantId: participant.id,
      round: 2,
      amountMinor: 100_000,
      penaltyMinor: 0,
      status: "paid",
      recordedAt: new Date().toISOString(),
      paidAt: new Date().toISOString(),
    })
    context.tandaRepository.createContribution({
      tandaId: tanda.id,
      participantId: participant.id,
      round: 3,
      amountMinor: 100_000,
      penaltyMinor: 0,
      status: "missed",
      recordedAt: new Date().toISOString(),
      paidAt: null,
    })

    expect(context.tandaRepository.countRecentMisses(participant.id, 3)).toBe(1)
  })
})

/**
 * Create and track a disposable test context.
 *
 * @returns Managed domain context.
 */
function createManagedContext(): TandaDomainContext {
  const context = createTandaDomainContext()
  contexts.push(context)
  return context
}

/**
 * Persist a tanda plus its organizer participant directly through repositories.
 *
 * @param context - Domain context.
 * @param organizerUserId - Organizer user id.
 * @param name - Tanda name.
 * @returns Persisted tanda record.
 */
function createPersistedTanda(
  context: TandaDomainContext,
  organizerUserId: number,
  name: string,
) {
  const createdAt = new Date().toISOString()
  const tanda = context.tandaRepository.createTanda({
    name,
    organizerUserId,
    contributionAmountMinor: 100_000,
    currencyCode: "MXN",
    status: "forming",
    currentRound: 0,
    totalRounds: 1,
    contributionWindowHours: context.config.contributionWindowHours,
    currentRoundStartedAt: null,
    createdAt,
  })

  context.tandaRepository.addParticipant({
    userId: organizerUserId,
    tandaId: tanda.id,
    role: "organizer",
    rotationPosition: 1,
    isDefaulter: false,
    joinedAt: createdAt,
  })

  return tanda
}
