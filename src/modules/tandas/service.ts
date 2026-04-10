import type { AppConfig } from "../../config/env"
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../../shared/errors/application-error"
import type { UserRepository } from "../users"
import type {
  ContributionRecord,
  ContributionView,
  CreateTandaInput,
  JoinTandaInput,
  ListTandasInput,
  OrganizerCommandInput,
  PaginatedResult,
  ParticipantHistoryInput,
  ParticipantView,
  ParticipantWithUserRecord,
  RecordContributionInput,
  RoundSummaryView,
  TandaRecord,
  TandaRepository,
  TandaView,
} from "./types"

/**
 * Application service for tanda workflows and business rules.
 */
export class TandaService {
  /**
   * Create a tanda service.
   *
   * @param tandaRepository - Tanda repository port.
   * @param userRepository - User repository port.
   * @param config - Application configuration.
   */
  public constructor(
    private readonly tandaRepository: TandaRepository,
    private readonly userRepository: UserRepository,
    private readonly config: AppConfig,
  ) {}

  /**
   * Create a new tanda and auto-join its organizer.
   *
   * @param input - Tanda creation input.
   * @returns Created tanda view.
   */
  public createTanda(input: CreateTandaInput): TandaView {
    ensureActorMatches(input.requestedByUserId, input.organizerId)
    this.getExistingUser(input.organizerId)

    const createdAt = new Date().toISOString()
    const createdTanda = this.tandaRepository.runInTransaction(() => {
      const tanda = this.tandaRepository.createTanda({
        name: input.name.trim(),
        organizerUserId: input.organizerId,
        contributionAmountMinor: toMinorUnits(input.contributionAmount),
        currencyCode: (input.currencyCode ?? this.config.defaultCurrencyCode).trim().toUpperCase(),
        status: "forming",
        currentRound: 0,
        totalRounds: 1,
        contributionWindowHours: this.config.contributionWindowHours,
        currentRoundStartedAt: null,
        createdAt,
      })

      this.tandaRepository.addParticipant({
        userId: input.organizerId,
        tandaId: tanda.id,
        role: "organizer",
        rotationPosition: null,
        isDefaulter: false,
        joinedAt: createdAt,
      })

      return tanda
    })

    return this.getTanda(createdTanda.id)
  }

  /**
   * List tandas with optional membership filtering.
   *
   * @param input - Query input.
   * @returns Paginated tanda views.
   */
  public listTandas(input: ListTandasInput): PaginatedResult<TandaView> {
    if (input.userId && input.requestedByUserId && input.requestedByUserId !== input.userId) {
      throw new ForbiddenError("Authenticated user cannot list another user's tandas")
    }

    const result = this.tandaRepository.listTandas(input)

    return {
      ...result,
      items: result.items.map((tanda) => mapTandaView(tanda, null)),
    }
  }

  /**
   * Fetch tanda details including its current round recipient when active.
   *
   * @param tandaId - Tanda id.
   * @returns Tanda view.
   */
  public getTanda(tandaId: number): TandaView {
    const tanda = this.getExistingTanda(tandaId)
    const participants = this.tandaRepository.listParticipants(tanda.id)

    return mapTandaView(tanda, participants)
  }

  /**
   * Join an existing forming tanda.
   *
   * @param input - Join input.
   * @returns Joined tanda view and participant view.
   */
  public joinTanda(input: JoinTandaInput): { readonly tanda: TandaView; readonly participant: ParticipantView } {
    ensureActorMatches(input.requestedByUserId, input.userId)
    const tanda = this.getExistingTanda(input.tandaId)
    this.getExistingUser(input.userId)

    if (tanda.status !== "forming") {
      throw new ConflictError("Only tandas in forming status can be joined")
    }

    if (this.tandaRepository.findParticipantByUser(tanda.id, input.userId)) {
      throw new ConflictError("User is already a participant in this tanda")
    }

    const participants = this.tandaRepository.listParticipants(tanda.id)

    if (participants.length >= this.config.maxParticipants) {
      throw new ConflictError("This tanda has reached the participant limit", {
        maxParticipants: this.config.maxParticipants,
      })
    }

    const participant = this.tandaRepository.runInTransaction(() => {
      const createdParticipant = this.tandaRepository.addParticipant({
        userId: input.userId,
        tandaId: tanda.id,
        role: "member",
        rotationPosition: null,
        isDefaulter: false,
        joinedAt: new Date().toISOString(),
      })

      this.tandaRepository.updateTandaTotalRounds(tanda.id, participants.length + 1)
      return this.tandaRepository.findParticipantById(createdParticipant.id) as ParticipantWithUserRecord
    })

    return {
      tanda: this.getTanda(tanda.id),
      participant: mapParticipantView(participant),
    }
  }

  /**
   * Start a tanda, randomize participant rotation, and lock the order.
   *
   * @param input - Organizer command input.
   * @returns Started tanda with participant views.
   */
  public startTanda(input: OrganizerCommandInput): { readonly tanda: TandaView; readonly participants: ReadonlyArray<ParticipantView> } {
    ensureActorMatches(input.requestedByUserId, input.organizerId)
    const tanda = this.getExistingTanda(input.tandaId)

    if (tanda.organizerUserId !== input.organizerId) {
      throw new ForbiddenError("Only the organizer can start this tanda")
    }

    if (tanda.status !== "forming") {
      throw new ConflictError("Only tandas in forming status can be started")
    }

    const participants = this.tandaRepository.listParticipants(tanda.id)

    if (participants.length < this.config.minParticipants) {
      throw new BadRequestError("At least three participants are required to start a tanda", {
        minParticipants: this.config.minParticipants,
      })
    }

    const shuffledParticipants = shuffleParticipants(participants)
    const startedAt = new Date().toISOString()

    this.tandaRepository.runInTransaction(() => {
      shuffledParticipants.forEach((participant, index) => {
        this.tandaRepository.updateParticipantRotation(participant.id, index + 1)
      })

      this.tandaRepository.activateTanda({
        tandaId: tanda.id,
        totalRounds: shuffledParticipants.length,
        currentRound: 1,
        currentRoundStartedAt: startedAt,
      })
    })

    return {
      tanda: this.getTanda(tanda.id),
      participants: this.tandaRepository.listParticipants(tanda.id).map(mapParticipantView),
    }
  }

  /**
   * Cancel a tanda before or during execution.
   *
   * @param input - Organizer command input.
   * @returns Updated tanda view.
   */
  public cancelTanda(input: OrganizerCommandInput): TandaView {
    ensureActorMatches(input.requestedByUserId, input.organizerId)
    const tanda = this.getExistingTanda(input.tandaId)

    if (tanda.organizerUserId !== input.organizerId) {
      throw new ForbiddenError("Only the organizer can cancel this tanda")
    }

    if (tanda.status === "completed" || tanda.status === "cancelled") {
      throw new ConflictError("Completed or cancelled tandas cannot be cancelled again")
    }

    this.tandaRepository.cancelTanda(tanda.id, new Date().toISOString())
    return this.getTanda(tanda.id)
  }

  /**
   * List all participants for a tanda.
   *
   * @param tandaId - Tanda id.
   * @returns Participant views.
   */
  public listParticipants(tandaId: number): ReadonlyArray<ParticipantView> {
    this.getExistingTanda(tandaId)
    return this.tandaRepository.listParticipants(tandaId).map(mapParticipantView)
  }

  /**
   * Record a contribution for the current round.
   *
   * @param input - Contribution command input.
   * @returns Recorded contribution view.
   */
  public recordContribution(input: RecordContributionInput): ContributionView {
    const tanda = this.getExistingTanda(input.tandaId)

    if (tanda.status !== "active" || !tanda.currentRoundStartedAt) {
      throw new ValidationError("Contributions can only be recorded while the tanda is active")
    }

    const participant = this.tandaRepository.findParticipantById(input.participantId)

    if (!participant || participant.tandaId !== tanda.id) {
      throw new NotFoundError(`Participant ${input.participantId} was not found in tanda ${tanda.id}`)
    }

    ensureActorMatches(input.requestedByUserId, participant.userId)

    if (this.tandaRepository.findContribution(tanda.id, participant.id, tanda.currentRound)) {
      throw new ConflictError("This participant has already recorded a contribution for the current round")
    }

    const amountMinor = toMinorUnits(input.amount)

    if (amountMinor !== tanda.contributionAmountMinor) {
      throw new BadRequestError("Contribution amount must match the tanda contribution amount", {
        expectedAmount: fromMinorUnits(tanda.contributionAmountMinor),
      })
    }

    const recordedAt = new Date().toISOString()
    const isLate = hasContributionWindowExpired(
      tanda.currentRoundStartedAt,
      tanda.contributionWindowHours,
    )

    const contribution = this.tandaRepository.createContribution({
      tandaId: tanda.id,
      participantId: participant.id,
      round: tanda.currentRound,
      amountMinor,
      penaltyMinor: isLate
        ? Math.round((amountMinor * this.config.latePenaltyBasisPoints) / 10_000)
        : 0,
      status: isLate ? "late" : "paid",
      recordedAt,
      paidAt: recordedAt,
    })

    return mapContributionView(contribution)
  }

  /**
   * Produce a round summary with collection totals and pending participants.
   *
   * @param tandaId - Tanda id.
   * @param round - Round number.
   * @returns Round summary.
   */
  public getRoundSummary(tandaId: number, round: number): RoundSummaryView {
    const tanda = this.getExistingTanda(tandaId)

    if (round < 1 || round > Math.max(tanda.totalRounds, 1)) {
      throw new NotFoundError(`Round ${round} does not exist for tanda ${tanda.id}`)
    }

    const participants = this.tandaRepository.listParticipants(tanda.id)
    const contributions = this.tandaRepository.listContributionsForRound(tanda.id, round)
    const contributionParticipantIds = new Set(contributions.map((item) => item.participantId))
    const recipient =
      participants.find((participant) => participant.rotationPosition === round) ?? null

    return {
      tandaId: tanda.id,
      round,
      status: tanda.status,
      recipient: recipient ? mapParticipantView(recipient) : null,
      totalExpectedAmount: fromMinorUnits(tanda.contributionAmountMinor * participants.length),
      totalCollectedAmount: fromMinorUnits(
        contributions.reduce((total, contribution) => total + contribution.amountMinor, 0),
      ),
      totalPenaltyAmount: fromMinorUnits(
        contributions.reduce((total, contribution) => total + contribution.penaltyMinor, 0),
      ),
      contributions: contributions.map(mapContributionView),
      pendingParticipantIds: participants
        .filter((participant) => !contributionParticipantIds.has(participant.id))
        .map((participant) => participant.id),
    }
  }

  /**
   * Advance the tanda to the next round and auto-complete after the last round.
   *
   * @param input - Organizer command input.
   * @returns Updated tanda view and the closed round number.
   */
  public advanceRound(input: OrganizerCommandInput): { readonly tanda: TandaView; readonly closedRound: number } {
    ensureActorMatches(input.requestedByUserId, input.organizerId)
    const tanda = this.getExistingTanda(input.tandaId)

    if (tanda.organizerUserId !== input.organizerId) {
      throw new ForbiddenError("Only the organizer can advance this tanda")
    }

    if (tanda.status === "completed" || tanda.status === "cancelled") {
      throw new ConflictError("Completed or cancelled tandas cannot be advanced")
    }

    if (tanda.status !== "active") {
      throw new ValidationError("Only active tandas can advance rounds")
    }

    const closedRound = tanda.currentRound
    const closedAt = new Date().toISOString()

    this.tandaRepository.runInTransaction(() => {
      const missingParticipants = this.tandaRepository.listParticipantsWithoutContribution(
        tanda.id,
        closedRound,
      )

      for (const participant of missingParticipants) {
        this.tandaRepository.createContribution({
          tandaId: tanda.id,
          participantId: participant.id,
          round: closedRound,
          amountMinor: tanda.contributionAmountMinor,
          penaltyMinor: 0,
          status: "missed",
          recordedAt: closedAt,
          paidAt: null,
        })

        if (this.tandaRepository.countRecentMisses(participant.id, 2) >= 2) {
          this.tandaRepository.setParticipantDefaulter(participant.id)
        }
      }

      if (closedRound >= tanda.totalRounds) {
        this.tandaRepository.completeTanda(tanda.id, closedAt)
        return
      }

      this.tandaRepository.advanceTandaRound(tanda.id, closedRound + 1, closedAt)
    })

    return {
      tanda: this.getTanda(tanda.id),
      closedRound,
    }
  }

  /**
   * Fetch contribution history for a participant.
   *
   * @param input - Participant history query.
   * @returns Participant view and contribution history.
   */
  public getParticipantHistory(input: ParticipantHistoryInput): {
    readonly participant: ParticipantView
    readonly contributions: ReadonlyArray<ContributionView>
  } {
    const tanda = this.getExistingTanda(input.tandaId)
    const participant = this.tandaRepository.findParticipantById(input.participantId)

    if (!participant || participant.tandaId !== tanda.id) {
      throw new NotFoundError(
        `Participant ${input.participantId} was not found in tanda ${tanda.id}`,
      )
    }

    if (
      input.requestedByUserId &&
      input.requestedByUserId !== participant.userId &&
      input.requestedByUserId !== tanda.organizerUserId
    ) {
      throw new ForbiddenError("Authenticated user cannot read another participant's history")
    }

    return {
      participant: mapParticipantView(participant),
      contributions: this.tandaRepository
        .listParticipantHistory(tanda.id, participant.id)
        .map(mapContributionView),
    }
  }

  /**
   * Ensure a user exists before referencing it in a tanda workflow.
   *
   * @param userId - User id.
   */
  private getExistingUser(userId: number): void {
    if (!this.userRepository.findById(userId)) {
      throw new NotFoundError(`User ${userId} was not found`)
    }
  }

  /**
   * Ensure a tanda exists and return its record.
   *
   * @param tandaId - Tanda id.
   * @returns Persisted tanda record.
   */
  private getExistingTanda(tandaId: number): TandaRecord {
    const tanda = this.tandaRepository.findTandaById(tandaId)

    if (!tanda) {
      throw new NotFoundError(`Tanda ${tandaId} was not found`)
    }

    return tanda
  }
}

/**
 * Ensure the optional authenticated actor matches the requested user id.
 *
 * @param requestedByUserId - Authenticated user id when present.
 * @param expectedUserId - Explicit user id from the request body or query.
 */
function ensureActorMatches(
  requestedByUserId: number | null | undefined,
  expectedUserId: number,
): void {
  if (requestedByUserId && requestedByUserId !== expectedUserId) {
    throw new ForbiddenError("Authenticated user does not match the requested actor")
  }
}

/**
 * Convert a persisted tanda record into its public API representation.
 *
 * @param tanda - Persisted tanda.
 * @param participants - Optional participant list used to derive the current recipient.
 * @returns Public tanda DTO.
 */
function mapTandaView(
  tanda: TandaRecord,
  participants: ReadonlyArray<ParticipantWithUserRecord> | null,
): TandaView {
  const recipient =
    participants?.find((participant) => participant.rotationPosition === tanda.currentRound) ??
    null

  return {
    id: tanda.id,
    name: tanda.name,
    organizerId: tanda.organizerUserId,
    contributionAmount: fromMinorUnits(tanda.contributionAmountMinor),
    currencyCode: tanda.currencyCode,
    status: tanda.status,
    currentRound: tanda.currentRound,
    totalRounds: tanda.totalRounds,
    participantCount: tanda.totalRounds,
    contributionWindowHours: tanda.contributionWindowHours,
    currentRoundStartedAt: tanda.currentRoundStartedAt,
    createdAt: tanda.createdAt,
    cancelledAt: tanda.cancelledAt,
    completedAt: tanda.completedAt,
    currentRecipient: recipient ? mapParticipantView(recipient) : null,
  }
}

/**
 * Convert a participant record into its public API representation.
 *
 * @param participant - Persisted participant with user details.
 * @returns Public participant DTO.
 */
function mapParticipantView(participant: ParticipantWithUserRecord): ParticipantView {
  return {
    id: participant.id,
    userId: participant.userId,
    name: participant.name,
    email: participant.email,
    role: participant.role,
    rotationPosition: participant.rotationPosition,
    isDefaulter: participant.isDefaulter,
    joinedAt: participant.joinedAt,
  }
}

/**
 * Convert a contribution record into its public API representation.
 *
 * @param contribution - Persisted contribution.
 * @returns Public contribution DTO.
 */
function mapContributionView(contribution: ContributionRecord): ContributionView {
  return {
    id: contribution.id,
    participantId: contribution.participantId,
    round: contribution.round,
    amount: fromMinorUnits(contribution.amountMinor),
    penaltyAmount: fromMinorUnits(contribution.penaltyMinor),
    status: contribution.status,
    recordedAt: contribution.recordedAt,
    paidAt: contribution.paidAt,
  }
}

/**
 * Convert an external money amount to integer minor units.
 *
 * @param amount - Decimal money amount.
 * @returns Integer minor units.
 */
function toMinorUnits(amount: number): number {
  return Math.round(amount * 100)
}

/**
 * Convert integer minor units back to a public money amount.
 *
 * @param amountMinor - Integer minor units.
 * @returns Decimal money amount.
 */
function fromMinorUnits(amountMinor: number): number {
  return amountMinor / 100
}

/**
 * Determine whether the contribution window has already expired.
 *
 * @param startedAt - ISO timestamp marking the round start.
 * @param contributionWindowHours - Allowed payment window.
 * @returns Whether the current contribution is late.
 */
function hasContributionWindowExpired(
  startedAt: string,
  contributionWindowHours: number,
): boolean {
  const deadline = new Date(startedAt).getTime() + contributionWindowHours * 60 * 60 * 1000
  return Date.now() > deadline
}

/**
 * Shuffle participants using Fisher-Yates to randomize the payout rotation.
 *
 * @param participants - Participants to randomize.
 * @returns New randomized participant array.
 */
function shuffleParticipants(
  participants: ReadonlyArray<ParticipantWithUserRecord>,
): Array<ParticipantWithUserRecord> {
  const shuffledParticipants = [...participants]

  for (let index = shuffledParticipants.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const currentParticipant = shuffledParticipants[index] as ParticipantWithUserRecord
    const swapParticipant = shuffledParticipants[swapIndex] as ParticipantWithUserRecord

    shuffledParticipants[index] = swapParticipant
    shuffledParticipants[swapIndex] = currentParticipant
  }

  return shuffledParticipants
}
