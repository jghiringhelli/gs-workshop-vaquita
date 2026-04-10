export interface User {
  id: number;
  email: string;
  name: string;
  createdAt: string;
}

export interface Tanda {
  id: number;
  name: string;
  organizerId: number;
  contributionAmount: number;
  status: 'forming' | 'active' | 'completed' | 'cancelled';
  currentRound: number;
  totalRounds: number;
  createdAt: string;
}

export interface Participant {
  id: number;
  userId: number;
  tandaId: number;
  role: 'organizer' | 'member';
  rotationPosition: number | null;
  isDefaulter: boolean;
}

export interface Contribution {
  id: number;
  tandaId: number;
  participantId: number;
  round: number;
  amount: number;
  status: 'pending' | 'paid' | 'late' | 'missed';
  paidAt: string | null;
}
