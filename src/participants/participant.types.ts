/** Role a participant holds within a tanda. */
export type ParticipantRole = 'organizer' | 'member';

/**
 * Raw database row — internal to the repository layer only.
 */
export interface ParticipantRow {
  id: string;
  user_id: string;
  tanda_id: string;
  role: ParticipantRole;
  rotation_position: number | null;
  created_at: string;
}

/**
 * Domain entity — canonical in-memory representation of a Participant.
 */
export interface Participant {
  id: string;
  userId: string;
  tandaId: string;
  role: ParticipantRole;
  /** Assigned randomly when the tanda transitions FORMING → ACTIVE. Null until then. */
  rotationPosition: number | null;
  createdAt: string;
}

/**
 * Input DTO for creating a participant record.
 * Used internally by services — not exposed directly at the API boundary.
 */
export interface CreateParticipantDTO {
  userId: string;
  tandaId: string;
  role: ParticipantRole;
  rotationPosition?: number;
}
