export type TandaStatus = "forming" | "active" | "completed" | "cancelled";
export type ParticipantRole = "organizer" | "member";
export type ContributionStatus = "pending" | "paid" | "late" | "missed";

export interface Tanda {
  id: number;
  name: string;
  organizerId: number;
  contributionAmount: number;
  status: TandaStatus;
  currentRound: number;
  totalRounds: number;
  currentRoundStartedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Participant {
  id: number;
  userId: number;
  tandaId: number;
  role: ParticipantRole;
  rotationPosition: number | null;
  consecutiveMissedContributions: number;
  isDefaulter: boolean;
  createdAt: string;
}

export interface Contribution {
  id: number;
  tandaId: number;
  participantId: number;
  round: number;
  baseAmount: number;
  penaltyAmount: number;
  totalAmount: number;
  status: ContributionStatus;
  paidAt: string | null;
  createdAt: string;
}

export interface CreateTandaInput {
  name: string;
  contributionAmount: number;
  organizerId: number;
}

export interface RotationAssignment {
  participantId: number;
  rotationPosition: number;
}

export interface TandaRow {
  id: number;
  name: string;
  organizer_id: number;
  contribution_amount: number;
  status: TandaStatus;
  current_round: number;
  total_rounds: number;
  current_round_started_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParticipantRow {
  id: number;
  user_id: number;
  tanda_id: number;
  role: ParticipantRole;
  rotation_position: number | null;
  consecutive_missed_contributions: number;
  is_defaulter: number;
  created_at: string;
}

export interface ContributionRow {
  id: number;
  tanda_id: number;
  participant_id: number;
  round: number;
  base_amount: number;
  penalty_amount: number;
  total_amount: number;
  status: ContributionStatus;
  paid_at: string | null;
  created_at: string;
}

export function mapTandaRow(row: TandaRow): Tanda {
  return {
    id: row.id,
    name: row.name,
    organizerId: row.organizer_id,
    contributionAmount: row.contribution_amount,
    status: row.status,
    currentRound: row.current_round,
    totalRounds: row.total_rounds,
    currentRoundStartedAt: row.current_round_started_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapParticipantRow(row: ParticipantRow): Participant {
  return {
    id: row.id,
    userId: row.user_id,
    tandaId: row.tanda_id,
    role: row.role,
    rotationPosition: row.rotation_position,
    consecutiveMissedContributions: row.consecutive_missed_contributions,
    isDefaulter: row.is_defaulter === 1,
    createdAt: row.created_at,
  };
}

export function mapContributionRow(row: ContributionRow): Contribution {
  return {
    id: row.id,
    tandaId: row.tanda_id,
    participantId: row.participant_id,
    round: row.round,
    baseAmount: row.base_amount,
    penaltyAmount: row.penalty_amount,
    totalAmount: row.total_amount,
    status: row.status,
    paidAt: row.paid_at,
    createdAt: row.created_at,
  };
}
