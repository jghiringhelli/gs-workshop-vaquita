import { afterEach, describe, expect, it, vi } from "vitest"
import {
  createDomainUser,
  createStartedTandaDomainFixture,
  createTandaDomainContext,
  getParticipantByUserId,
  type TandaDomainContext,
} from "../support/tanda-domain-fixtures"

const contexts: TandaDomainContext[] = []

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()

  while (contexts.length > 0) {
    contexts.pop()?.close()
  }
})

describe("Tanda service", () => {
  it("CreateTanda_AuthenticatedActorMismatch_ThrowsForbiddenError", () => {
    const context = createManagedContext()
    const organizer = createDomainUser(context, "Organizer")
    const otherUser = createDomainUser(context, "Other")

    expect(() =>
      context.tandaService.createTanda({
        name: "Mismatch tanda",
        organizerId: organizer.user.id,
        contributionAmount: 1000,
        requestedByUserId: otherUser.user.id,
      }),
    ).toThrowError("Authenticated user does not match the requested actor")
  })

  it("JoinTanda_ActiveTanda_ThrowsConflictError", () => {
    const context = createManagedContext()
    const fixture = createStartedTandaDomainFixture(context)
    const newcomer = createDomainUser(context, "Newcomer")

    expect(() =>
      context.tandaService.joinTanda({
        tandaId: fixture.tanda.id,
        userId: newcomer.user.id,
        requestedByUserId: newcomer.user.id,
      }),
    ).toThrowError("Only tandas in forming status can be joined")
  })

  it("JoinTanda_ParticipantLimitReached_ThrowsConflictError", () => {
    const context = createManagedContext({
      minParticipants: 2,
      maxParticipants: 2,
    })
    const organizer = createDomainUser(context, "Organizer")
    const memberOne = createDomainUser(context, "Member")
    const memberTwo = createDomainUser(context, "Member")
    const tanda = context.tandaService.createTanda({
      name: "Full tanda",
      organizerId: organizer.user.id,
      contributionAmount: 1000,
      requestedByUserId: organizer.user.id,
    })

    context.tandaService.joinTanda({
      tandaId: tanda.id,
      userId: memberOne.user.id,
      requestedByUserId: memberOne.user.id,
    })

    expect(() =>
      context.tandaService.joinTanda({
        tandaId: tanda.id,
        userId: memberTwo.user.id,
        requestedByUserId: memberTwo.user.id,
      }),
    ).toThrowError("This tanda has reached the participant limit")
  })

  it("StartTanda_NonOrganizer_ThrowsForbiddenError", () => {
    const context = createManagedContext()
    const organizer = createDomainUser(context, "Organizer")
    const memberOne = createDomainUser(context, "Member")
    const memberTwo = createDomainUser(context, "Member")
    const tanda = context.tandaService.createTanda({
      name: "Start tanda",
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

    expect(() =>
      context.tandaService.startTanda({
        tandaId: tanda.id,
        organizerId: memberOne.user.id,
        requestedByUserId: memberOne.user.id,
      }),
    ).toThrowError("Only the organizer can start this tanda")
  })

  it("StartTanda_AlreadyActive_ThrowsConflictError", () => {
    const context = createManagedContext()
    const fixture = createStartedTandaDomainFixture(context)

    expect(() =>
      context.tandaService.startTanda({
        tandaId: fixture.tanda.id,
        organizerId: fixture.organizer.user.id,
        requestedByUserId: fixture.organizer.user.id,
      }),
    ).toThrowError("Only tandas in forming status can be started")
  })

  it("CancelTanda_AlreadyCancelled_ThrowsConflictError", () => {
    const context = createManagedContext()
    const organizer = createDomainUser(context, "Organizer")
    const tanda = context.tandaService.createTanda({
      name: "Cancel tanda",
      organizerId: organizer.user.id,
      contributionAmount: 1000,
      requestedByUserId: organizer.user.id,
    })

    context.tandaService.cancelTanda({
      tandaId: tanda.id,
      organizerId: organizer.user.id,
      requestedByUserId: organizer.user.id,
    })

    expect(() =>
      context.tandaService.cancelTanda({
        tandaId: tanda.id,
        organizerId: organizer.user.id,
        requestedByUserId: organizer.user.id,
      }),
    ).toThrowError("Completed or cancelled tandas cannot be cancelled again")
  })

  it("CancelTanda_AlreadyCompleted_ThrowsConflictError", () => {
    const context = createManagedContext()
    const fixture = createStartedTandaDomainFixture(context)

    context.tandaRepository.completeTanda(
      fixture.tanda.id,
      new Date().toISOString(),
    )

    expect(() =>
      context.tandaService.cancelTanda({
        tandaId: fixture.tanda.id,
        organizerId: fixture.organizer.user.id,
        requestedByUserId: fixture.organizer.user.id,
      }),
    ).toThrowError("Completed or cancelled tandas cannot be cancelled again")
  })

  it("RecordContribution_FormingTanda_ThrowsValidationError", () => {
    const context = createManagedContext()
    const organizer = createDomainUser(context, "Organizer")
    const tanda = context.tandaService.createTanda({
      name: "Forming tanda",
      organizerId: organizer.user.id,
      contributionAmount: 1000,
      requestedByUserId: organizer.user.id,
    })
    const organizerParticipant = context.tandaRepository.findParticipantByUser(
      tanda.id,
      organizer.user.id,
    )

    expect(organizerParticipant).not.toBeNull()
    expect(() =>
      context.tandaService.recordContribution({
        tandaId: tanda.id,
        participantId: organizerParticipant?.id as number,
        amount: 1000,
        requestedByUserId: organizer.user.id,
      }),
    ).toThrowError("Contributions can only be recorded while the tanda is active")
  })

  it("RecordContribution_ParticipantFromDifferentTanda_ThrowsNotFoundError", () => {
    const context = createManagedContext()
    const firstFixture = createStartedTandaDomainFixture(context)
    const secondFixture = createStartedTandaDomainFixture(context)
    const foreignParticipant = getParticipantByUserId(
      secondFixture,
      secondFixture.organizer.user.id,
    )

    expect(() =>
      context.tandaService.recordContribution({
        tandaId: firstFixture.tanda.id,
        participantId: foreignParticipant.id,
        amount: firstFixture.tanda.contributionAmount,
      }),
    ).toThrowError(
      `Participant ${foreignParticipant.id} was not found in tanda ${firstFixture.tanda.id}`,
    )
  })

  it("RecordContribution_DuplicateContribution_ThrowsConflictError", () => {
    const context = createManagedContext()
    const fixture = createStartedTandaDomainFixture(context)
    const organizerParticipant = getParticipantByUserId(
      fixture,
      fixture.organizer.user.id,
    )

    context.tandaService.recordContribution({
      tandaId: fixture.tanda.id,
      participantId: organizerParticipant.id,
      amount: fixture.tanda.contributionAmount,
      requestedByUserId: fixture.organizer.user.id,
    })

    expect(() =>
      context.tandaService.recordContribution({
        tandaId: fixture.tanda.id,
        participantId: organizerParticipant.id,
        amount: fixture.tanda.contributionAmount,
        requestedByUserId: fixture.organizer.user.id,
      }),
    ).toThrowError(
      "This participant has already recorded a contribution for the current round",
    )
  })

  it("RecordContribution_ExpiredWindow_ReturnsLateContributionWithPenalty", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-10T12:00:00.000Z"))

    const context = createManagedContext()
    const fixture = createStartedTandaDomainFixture(context)
    const organizerParticipant = getParticipantByUserId(
      fixture,
      fixture.organizer.user.id,
    )

    vi.advanceTimersByTime(
      context.config.contributionWindowHours * 60 * 60 * 1000 + 1,
    )

    const contribution = context.tandaService.recordContribution({
      tandaId: fixture.tanda.id,
      participantId: organizerParticipant.id,
      amount: fixture.tanda.contributionAmount,
      requestedByUserId: fixture.organizer.user.id,
    })

    expect(contribution).toMatchObject({
      participantId: organizerParticipant.id,
      status: "late",
      penaltyAmount: 50,
    })
  })

  it("GetRoundSummary_FormingTanda_ReturnsNullRecipient", () => {
    const context = createManagedContext()
    const organizer = createDomainUser(context, "Organizer")
    const tanda = context.tandaService.createTanda({
      name: "Summary tanda",
      organizerId: organizer.user.id,
      contributionAmount: 1000,
      requestedByUserId: organizer.user.id,
    })

    const summary = context.tandaService.getRoundSummary(tanda.id, 1)

    expect(summary.recipient).toBeNull()
    expect(summary.pendingParticipantIds).toHaveLength(1)
  })

  it("AdvanceRound_CancelledTanda_ThrowsConflictError", () => {
    const context = createManagedContext()
    const organizer = createDomainUser(context, "Organizer")
    const tanda = context.tandaService.createTanda({
      name: "Advance cancel tanda",
      organizerId: organizer.user.id,
      contributionAmount: 1000,
      requestedByUserId: organizer.user.id,
    })

    context.tandaService.cancelTanda({
      tandaId: tanda.id,
      organizerId: organizer.user.id,
      requestedByUserId: organizer.user.id,
    })

    expect(() =>
      context.tandaService.advanceRound({
        tandaId: tanda.id,
        organizerId: organizer.user.id,
        requestedByUserId: organizer.user.id,
      }),
    ).toThrowError("Completed or cancelled tandas cannot be advanced")
  })

  it("AdvanceRound_FormingTanda_ThrowsValidationError", () => {
    const context = createManagedContext()
    const organizer = createDomainUser(context, "Organizer")
    const tanda = context.tandaService.createTanda({
      name: "Advance forming tanda",
      organizerId: organizer.user.id,
      contributionAmount: 1000,
      requestedByUserId: organizer.user.id,
    })

    expect(() =>
      context.tandaService.advanceRound({
        tandaId: tanda.id,
        organizerId: organizer.user.id,
        requestedByUserId: organizer.user.id,
      }),
    ).toThrowError("Only active tandas can advance rounds")
  })

  it("AdvanceRound_FinalRound_ReturnsCompletedTanda", () => {
    const context = createManagedContext()
    const fixture = createStartedTandaDomainFixture(context)

    context.tandaRepository.advanceTandaRound(
      fixture.tanda.id,
      fixture.tanda.totalRounds,
      new Date().toISOString(),
    )

    const result = context.tandaService.advanceRound({
      tandaId: fixture.tanda.id,
      organizerId: fixture.organizer.user.id,
      requestedByUserId: fixture.organizer.user.id,
    })

    expect(result.closedRound).toBe(fixture.tanda.totalRounds)
    expect(result.tanda).toMatchObject({
      id: fixture.tanda.id,
      status: "completed",
    })
    expect(result.tanda.completedAt).not.toBeNull()
  })

  it("AdvanceRound_ConsecutiveMisses_UpdatesParticipantAsDefaulter", () => {
    const context = createManagedContext()
    const fixture = createStartedTandaDomainFixture(context)
    const memberOneParticipant = getParticipantByUserId(
      fixture,
      fixture.memberOne.user.id,
    )

    context.tandaRepository.createContribution({
      tandaId: fixture.tanda.id,
      participantId: memberOneParticipant.id,
      round: 0,
      amountMinor: 100_000,
      penaltyMinor: 0,
      status: "missed",
      recordedAt: new Date().toISOString(),
      paidAt: null,
    })

    context.tandaService.advanceRound({
      tandaId: fixture.tanda.id,
      organizerId: fixture.organizer.user.id,
      requestedByUserId: fixture.organizer.user.id,
    })

    expect(
      context.tandaRepository.findParticipantById(memberOneParticipant.id),
    ).toMatchObject({
      id: memberOneParticipant.id,
      isDefaulter: true,
    })
  })

  it("GetParticipantHistory_DifferentAuthenticatedMember_ThrowsForbiddenError", () => {
    const context = createManagedContext()
    const fixture = createStartedTandaDomainFixture(context)
    const memberTwoParticipant = getParticipantByUserId(
      fixture,
      fixture.memberTwo.user.id,
    )

    expect(() =>
      context.tandaService.getParticipantHistory({
        tandaId: fixture.tanda.id,
        participantId: memberTwoParticipant.id,
        requestedByUserId: fixture.memberOne.user.id,
      }),
    ).toThrowError(
      "Authenticated user cannot read another participant's history",
    )
  })
})

/**
 * Create and track a disposable test context.
 *
 * @param overrides - Optional config overrides.
 * @returns Managed domain context.
 */
function createManagedContext(
  overrides: Partial<TandaDomainContext["config"]> = {},
): TandaDomainContext {
  const context = createTandaDomainContext(overrides)
  contexts.push(context)
  return context
}
