/**
 * Supported tanda lifecycle states.
 */
export type TandaStatus = "forming" | "active" | "completed" | "cancelled"

/**
 * Supported participant roles inside a tanda.
 */
export type ParticipantRole = "organizer" | "member"

/**
 * Supported contribution states.
 */
export type ContributionStatus = "paid" | "late" | "missed"

/**
 * Persisted tanda record.
 */
export interface TandaRecord {
  readonly id: number
  readonly name: string
  readonly organizerUserId: number
  readonly contributionAmountMinor: number
  readonly currencyCode: string
  readonly status: TandaStatus
  readonly currentRound: number
  readonly totalRounds: number
  readonly contributionWindowHours: number
  readonly currentRoundStartedAt: string | null
  readonly createdAt: string
  readonly cancelledAt: string | null
  readonly completedAt: string | null
}

/**
 * Persisted participant record.
 */
export interface ParticipantRecord {
  readonly id: number
  readonly userId: number
  readonly tandaId: number
  readonly role: ParticipantRole
  readonly rotationPosition: number | null
  readonly isDefaulter: boolean
  readonly joinedAt: string
}

/**
 * Persisted participant record enriched with user identity.
 */
export interface ParticipantWithUserRecord extends ParticipantRecord {
  readonly name: string
  readonly email: string
}

/**
 * Persisted contribution record.
 */
export interface ContributionRecord {
  readonly id: number
  readonly tandaId: number
  readonly participantId: number
  readonly round: number
  readonly amountMinor: number
  readonly penaltyMinor: number
  readonly status: ContributionStatus
  readonly recordedAt: string
  readonly paidAt: string | null
}

/**
 * Pagination request DTO.
 */
export interface PaginationInput {
  readonly page: number
  readonly pageSize: number
}

/**
 * Generic paginated response shape.
 */
export interface PaginatedResult<T> {
  readonly items: ReadonlyArray<T>
  readonly total: number
  readonly page: number
  readonly pageSize: number
}

/**
 * Tanda creation command input.
 */
export interface CreateTandaInput {
  readonly name: string
  readonly organizerId: number
  readonly contributionAmount: number
  readonly currencyCode?: string
  readonly requestedByUserId?: number | null
}

/**
 * Tanda list query input.
 */
export interface ListTandasInput extends PaginationInput {
  readonly userId?: number
  readonly requestedByUserId?: number | null
}

/**
 * Join command input.
 */
export interface JoinTandaInput {
  readonly tandaId: number
  readonly userId: number
  readonly requestedByUserId?: number | null
}

/**
 * Organizer command input.
 */
export interface OrganizerCommandInput {
  readonly tandaId: number
  readonly organizerId: number
  readonly requestedByUserId?: number | null
}

/**
 * Record contribution command input.
 */
export interface RecordContributionInput {
  readonly tandaId: number
  readonly participantId: number
  readonly amount: number
  readonly requestedByUserId?: number | null
}

/**
 * Participant history query input.
 */
export interface ParticipantHistoryInput {
  readonly tandaId: number
  readonly participantId: number
  readonly requestedByUserId?: number | null
}

/**
 * Public participant DTO.
 */
export interface ParticipantView {
  readonly id: number
  readonly userId: number
  readonly name: string
  readonly email: string
  readonly role: ParticipantRole
  readonly rotationPosition: number | null
  readonly isDefaulter: boolean
  readonly joinedAt: string
}

/**
 * Public contribution DTO.
 */
export interface ContributionView {
  readonly id: number
  readonly participantId: number
  readonly round: number
  readonly amount: number
  readonly penaltyAmount: number
  readonly status: ContributionStatus
  readonly recordedAt: string
  readonly paidAt: string | null
}

/**
 * Public tanda DTO.
 */
export interface TandaView {
  readonly id: number
  readonly name: string
  readonly organizerId: number
  readonly contributionAmount: number
  readonly currencyCode: string
  readonly status: TandaStatus
  readonly currentRound: number
  readonly totalRounds: number
  readonly participantCount: number
  readonly contributionWindowHours: number
  readonly currentRoundStartedAt: string | null
  readonly createdAt: string
  readonly cancelledAt: string | null
  readonly completedAt: string | null
  readonly currentRecipient: ParticipantView | null
}

/**
 * Round summary response DTO.
 */
export interface RoundSummaryView {
  readonly tandaId: number
  readonly round: number
  readonly status: TandaStatus
  readonly recipient: ParticipantView | null
  readonly totalExpectedAmount: number
  readonly totalCollectedAmount: number
  readonly totalPenaltyAmount: number
  readonly contributions: ReadonlyArray<ContributionView>
  readonly pendingParticipantIds: ReadonlyArray<number>
}

/**
 * Repository port for tanda persistence.
 */
export interface TandaRepository {
  runInTransaction<T>(operation: () => T): T
  createTanda(input: {
    readonly name: string
    readonly organizerUserId: number
    readonly contributionAmountMinor: number
    readonly currencyCode: string
    readonly status: TandaStatus
    readonly currentRound: number
    readonly totalRounds: number
    readonly contributionWindowHours: number
    readonly currentRoundStartedAt: string | null
    readonly createdAt: string
  }): TandaRecord
  updateTandaTotalRounds(tandaId: number, totalRounds: number): void
  findTandaById(id: number): TandaRecord | null
  listTandas(input: { readonly userId?: number } & PaginationInput): PaginatedResult<TandaRecord>
  addParticipant(input: {
    readonly userId: number
    readonly tandaId: number
    readonly role: ParticipantRole
    readonly rotationPosition: number | null
    readonly isDefaulter: boolean
    readonly joinedAt: string
  }): ParticipantRecord
  findParticipantById(id: number): ParticipantWithUserRecord | null
  findParticipantByUser(tandaId: number, userId: number): ParticipantWithUserRecord | null
  listParticipants(tandaId: number): ReadonlyArray<ParticipantWithUserRecord>
  updateParticipantRotation(participantId: number, rotationPosition: number): void
  activateTanda(input: {
    readonly tandaId: number
    readonly totalRounds: number
    readonly currentRound: number
    readonly currentRoundStartedAt: string
  }): void
  cancelTanda(tandaId: number, cancelledAt: string): void
  completeTanda(tandaId: number, completedAt: string): void
  advanceTandaRound(tandaId: number, nextRound: number, currentRoundStartedAt: string): void
  findContribution(tandaId: number, participantId: number, round: number): ContributionRecord | null
  createContribution(input: {
    readonly tandaId: number
    readonly participantId: number
    readonly round: number
    readonly amountMinor: number
    readonly penaltyMinor: number
    readonly status: ContributionStatus
    readonly recordedAt: string
    readonly paidAt: string | null
  }): ContributionRecord
  listContributionsForRound(tandaId: number, round: number): ReadonlyArray<ContributionRecord>
  listParticipantHistory(tandaId: number, participantId: number): ReadonlyArray<ContributionRecord>
  listParticipantsWithoutContribution(
    tandaId: number,
    round: number,
  ): ReadonlyArray<ParticipantWithUserRecord>
  countRecentMisses(participantId: number, limit: number): number
  setParticipantDefaulter(participantId: number): void
}
