export type TandaStatus = 'forming' | 'active' | 'completed' | 'cancelled';
export type ParticipantRole = 'organizer' | 'member';
export type ContributionStatus = 'pending' | 'paid' | 'late' | 'missed';

/** Tanda domain entity. */
export interface Tanda {
  readonly id: string;
  readonly name: string;
  readonly organizerId: string;
  readonly contributionAmount: number;
  readonly status: TandaStatus;
  readonly currentRound: number;
  readonly totalRounds: number;
  readonly createdAt: string;
}

/** Participant domain entity. */
export interface Participant {
  readonly id: string;
  readonly userId: string;
  readonly tandaId: string;
  readonly role: ParticipantRole;
  readonly rotationPosition: number | null;
  readonly consecutiveMissed: number;
  readonly isDefaulter: boolean;
  readonly createdAt: string;
}

/** Contribution domain entity. */
export interface Contribution {
  readonly id: string;
  readonly tandaId: string;
  readonly participantId: string;
  readonly round: number;
  readonly amount: number;
  readonly status: ContributionStatus;
  readonly createdAt: string;
}

/** DTO for creating a tanda. */
export interface CreateTandaDto {
  readonly name: string;
  readonly organizerId: string;
  readonly contributionAmount: number;
}

/** DTO for joining a tanda. */
export interface JoinTandaDto {
  readonly userId: string;
}

/** DTO for recording a contribution. */
export interface RecordContributionDto {
  readonly participantId: string;
  readonly amount: number;
}

/** Tanda API response shape. */
export type TandaResponse = Tanda;

/** Participant API response shape. */
export type ParticipantResponse = Participant;

/** Contribution API response shape. */
export type ContributionResponse = Contribution;
