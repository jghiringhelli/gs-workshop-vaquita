/** Roles a user can hold within a tanda */
export type ParticipantRole = "organizer" | "member";

/** A user's membership in a tanda */
export interface Participant {
  readonly id: string;
  readonly userId: string;
  readonly tandaId: string;
  readonly role: ParticipantRole;
  /** Assigned when the tanda starts; null while still forming */
  readonly rotationPosition: number | null;
  readonly consecutiveMisses: number;
  /** True when consecutiveMisses has reached the configured threshold */
  readonly isDefaulter: boolean;
  readonly createdAt: string;
}

/** Response shape returned to consumers */
export interface ParticipantResponseDto {
  readonly id: string;
  readonly userId: string;
  readonly tandaId: string;
  readonly role: ParticipantRole;
  readonly rotationPosition: number | null;
  readonly consecutiveMisses: number;
  readonly isDefaulter: boolean;
  readonly createdAt: string;
}
