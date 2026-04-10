import type { Tanda, TandaStatus } from "./tanda.types.js";

/**
 * Persistence contract for tanda data.
 */
export interface ITandaRepository {
  /** Persists a new tanda and returns it. */
  create(tanda: Tanda): Tanda;

  /** Returns a tanda by ID, or null if not found. */
  findById(id: string): Tanda | null;

  /** Returns all tandas where the given user is a participant. */
  findByUserId(userId: string): Tanda[];

  /** Updates mutable tanda fields and returns the updated record. */
  update(id: string, fields: Partial<Pick<Tanda, "status" | "currentRound" | "totalRounds">>): Tanda;
}
