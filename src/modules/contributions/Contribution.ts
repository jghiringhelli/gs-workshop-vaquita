export type ContributionStatus = 'pending' | 'paid' | 'late' | 'missed';

export interface Contribution {
  id: string;
  tandaId: string;
  participantId: string;
  round: number;
  amount: number;
  status: ContributionStatus;
  paidAt: string | null;
  createdAt: string;
}

export interface CreateContributionDto {
  tandaId: string;
  participantId: string;
  round: number;
  amount: number;
  status?: ContributionStatus;
  paidAt?: string | null;
}
