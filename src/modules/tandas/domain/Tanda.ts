/** Tanda lifecycle statuses. */
export type TandaStatus = 'forming' | 'active' | 'completed' | 'cancelled';

/** Participant roles. */
export type ParticipantRole = 'organizer' | 'member';

/** Contribution statuses. */
export type ContributionStatus = 'pending' | 'paid' | 'late' | 'missed';

/** Tanda domain entity. */
export interface Tanda {
  id: string;
  name: string;
  organizerId: string;
  contributionAmount: number;
  status: TandaStatus;
  currentRound: number;
  totalRounds: number;
}

/** Participant domain entity. */
export interface Participant {
  id: string;
  userId: string;
  tandaId: string;
  role: ParticipantRole;
  rotationPosition: number | null;
}

/** Contribution domain entity. */
export interface Contribution {
  id: string;
  tandaId: string;
  participantId: string;
  round: number;
  amount: number;
  status: ContributionStatus;
}

export interface CreateTandaInput {
  name: string;
  organizerId: string;
  contributionAmount: number;
}
