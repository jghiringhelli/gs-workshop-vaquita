export type TandaStatus = 'forming' | 'active' | 'completed' | 'cancelled';

export interface Tanda {
  id: string;
  name: string;
  organizerId: string;
  contributionAmount: number;
  status: TandaStatus;
  currentRound: number;
  totalRounds: number;
  createdAt: string;
}

export interface CreateTandaDto {
  name: string;
  organizerId: string;
  contributionAmount: number;
}
