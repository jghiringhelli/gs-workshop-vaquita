import type { User } from "../../users/domain/User";

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
  readonly participantCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly startedAt: string | null;
  readonly roundStartedAt: string | null;
  readonly completedAt: string | null;
  readonly cancelledAt: string | null;
}

export interface Participant {
  readonly id: number;
  readonly userId: number;
  readonly tandaId: number;
  readonly role: ParticipantRole;
  readonly rotationPosition: number | null;
  readonly isDefaulter: boolean;
  readonly joinedAt: string;
  readonly user: Pick<User, "id" | "email" | "name">;
}

export interface Contribution {
  readonly id: number | null;
  readonly tandaId: number;
  readonly participantId: number;
  readonly round: number;
  readonly amount: number;
  readonly status: ContributionStatus;
  readonly penaltyAmount: number;
  readonly recordedAt: string | null;
  readonly participant: Participant;
}

export interface TandaDetail extends Tanda {
  readonly participants: readonly Participant[];
}

export interface RoundSummary {
  readonly tandaId: number;
  readonly round: number;
  readonly status: TandaStatus;
  readonly recipient: Participant | null;
  readonly totalCollected: number;
  readonly expectedTotal: number;
  readonly contributions: readonly Contribution[];
}

export interface ParticipantHistory {
  readonly tandaId: number;
  readonly participant: Participant;
  readonly history: readonly Contribution[];
}

export interface NextRecipientPreview {
  readonly tandaId: number;
  readonly status: TandaStatus;
  readonly round: number | null;
  readonly recipient: Participant | null;
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
  readonly requesterUserId: number;
}

export interface CancelTandaInput {
  readonly tandaId: number;
  readonly requesterUserId: number;
}

export interface RecordContributionInput {
  readonly tandaId: number;
  readonly participantId: number;
  readonly amount: number;
}

export interface AdvanceRoundInput {
  readonly tandaId: number;
  readonly requesterUserId: number;
}
