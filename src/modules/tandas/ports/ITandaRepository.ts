import { Tanda, Participant, CreateTandaInput } from '../domain/Tanda';

/** Port interface — all tanda/participant persistence must go through this. */
export interface ITandaRepository {
  /** Creates a new tanda. */
  createTanda(input: CreateTandaInput): Tanda;

  /** Finds a tanda by id. */
  findTandaById(id: string): Tanda | undefined;

  /** Updates a tanda's status and related fields. */
  updateTanda(id: string, updates: Partial<Pick<Tanda, 'status' | 'currentRound' | 'totalRounds'>>): void;

  /** Creates a participant record. */
  createParticipant(data: Omit<Participant, 'id'>): Participant;

  /** Finds all participants of a tanda. */
  findParticipantsByTandaId(tandaId: string): Participant[];

  /** Finds a participant by userId and tandaId. */
  findParticipant(userId: string, tandaId: string): Participant | undefined;

  /** Updates rotation positions for all participants of a tanda. */
  setRotationPositions(tandaId: string, positions: Map<string, number>): void;
}
