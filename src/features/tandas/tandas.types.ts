export type TandaStatus = "forming" | "active" | "completed" | "cancelled";
export type ParticipantRole = "organizer" | "member";
export type ContributionStatus = "pending" | "paid" | "late" | "missed";

export interface Tanda {
  readonly id: number;
  readonly name: string;
  readonly organizerId: number;
  readonly contributionAmount: number;
  readonly status: TandaStatus;
  readonly currentRound: number;
  readonly totalRounds: number;
  readonly createdAt: string;
}

export interface TandaParticipant {
  readonly id: number;
  readonly userId: number;
  readonly tandaId: number;
  readonly role: ParticipantRole;
  readonly rotationPosition: number | null;
  readonly createdAt: string;
}

export interface ContributionRecord {
  readonly id: number;
  readonly tandaId: number;
  readonly participantId: number;
  readonly round: number;
  readonly amount: number;
  readonly penaltyAmount: number;
  readonly status: ContributionStatus;
  readonly recordedAt: string;
}

export interface CreateTandaInput {
  readonly name: string;
  readonly organizerId: number;
  readonly contributionAmount: number;
}

export interface JoinTandaInput {
  readonly tandaId: number;
  readonly userId: number;
}

export interface StartTandaInput {
  readonly tandaId: number;
  readonly organizerId: number;
}

export interface AdvanceTandaInput {
  readonly tandaId: number;
  readonly organizerId: number;
}

export interface RecordContributionInput {
  readonly tandaId: number;
  readonly participantId: number;
  readonly amount: number;
  readonly round: number;
  readonly status: ContributionStatus;
}