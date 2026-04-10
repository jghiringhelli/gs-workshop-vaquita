export type ParticipantRole = 'organizer' | 'member';

export interface Participant {
  id: string;
  userId: string;
  tandaId: string;
  role: ParticipantRole;
  rotationPosition: number | null;
  createdAt: string;
}

export interface CreateParticipantDto {
  userId: string;
  tandaId: string;
  role: ParticipantRole;
}
