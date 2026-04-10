export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Tanda {
  id: string;
  name: string;
  organizerId: string;
  contributionAmount: number;
  status: 'forming' | 'active' | 'completed' | 'cancelled';
  currentRound: number;
  totalRounds: number;
}

export interface Participant {
  id: string;
  userId: string;
  tandaId: string;
  role: 'organizer' | 'member';
  rotationPosition: number | null;
}

export interface Contribution {
  id: string;
  tandaId: string;
  participantId: string;
  round: number;
  amount: number;
  status: 'pending' | 'paid' | 'late' | 'missed';
}