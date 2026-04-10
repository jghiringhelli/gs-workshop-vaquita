/** Repository port interfaces — services depend on these, never on concrete classes. */

import type {
  User,
  Tanda,
  TandaStatus,
  Participant,
  ParticipantRole,
  Contribution,
  ContributionStatus,
} from './types.js';

export interface IUserRepository {
  /** Persist a new user and return the created record. */
  create(data: { email: string; name: string }): User;
  /** Return the user with the given id, or undefined. */
  findById(id: string): User | undefined;
  /** Return every user. */
  findAll(): User[];
}

export interface ITandaRepository {
  /** Persist a new tanda in FORMING status and return it. */
  create(data: { name: string; organizerId: string; contributionAmount: number }): Tanda;
  /** Return the tanda with the given id, or undefined. */
  findById(id: string): Tanda | undefined;
  /** Return every tanda. */
  findAll(): Tanda[];
  /** Return all tandas a user participates in. */
  findByUserId(userId: string): Tanda[];
  /** Overwrite status, currentRound, and totalRounds and return updated tanda. */
  update(id: string, data: { status: TandaStatus; currentRound: number; totalRounds: number }): Tanda;
}

export interface IParticipantRepository {
  /** Persist a new participant and return the created record. */
  create(data: { userId: string; tandaId: string; role: ParticipantRole }): Participant;
  /** Return the participant with the given id, or undefined. */
  findById(id: string): Participant | undefined;
  /** Return all participants for a tanda. */
  findByTandaId(tandaId: string): Participant[];
  /** Return the participant matching the (userId, tandaId) pair, or undefined. */
  findByUserAndTanda(userId: string, tandaId: string): Participant | undefined;
  /** Set the rotation_position for a participant. */
  updateRotationPosition(id: string, position: number): void;
  /** Count participants belonging to a tanda. */
  countByTandaId(tandaId: string): number;
}

export interface IContributionRepository {
  /** Persist a contribution record and return it. */
  create(data: {
    tandaId: string;
    participantId: string;
    round: number;
    amount: number;
    status: ContributionStatus;
  }): Contribution;
  /** Return the contribution for a participant in a specific round, or undefined. */
  findByParticipantAndRound(participantId: string, round: number): Contribution | undefined;
  /** Return all contributions recorded for a tanda in a given round. */
  findByTandaAndRound(tandaId: string, round: number): Contribution[];
  /** Return all contributions for a participant, ordered by round ASC. */
  findByParticipantId(participantId: string): Contribution[];
}
