export type TandaStatus = 'forming' | 'active' | 'completed' | 'cancelled';
export type ParticipantRole = 'organizer' | 'member';
export type ContributionStatus = 'pending' | 'paid' | 'late' | 'missed';

export interface User {
  id: number;
  email: string;
  name: string;
  created_at: string;
}

export interface Tanda {
  id: number;
  name: string;
  organizer_id: number;
  contribution_amount: number;
  status: TandaStatus;
  current_round: number;
  total_rounds: number;
  created_at: string;
}

export interface Participant {
  id: number;
  user_id: number;
  tanda_id: number;
  role: ParticipantRole;
  rotation_position: number | null;
  created_at: string;
}

export interface Contribution {
  id: number;
  tanda_id: number;
  participant_id: number;
  round: number;
  amount: number;
  status: ContributionStatus;
  created_at: string;
}
