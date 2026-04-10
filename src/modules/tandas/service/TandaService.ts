import { z } from 'zod';
import { Tanda, Participant } from '../domain/Tanda';
import { ITandaRepository } from '../ports/ITandaRepository';
import { IUserRepository } from '../../users/ports/IUserRepository';
import {
  ValidationError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from '../../../shared/exceptions/AppError';

const CreateTandaSchema = z.object({
  name: z.string().min(1),
  organizerId: z.string(),
  contributionAmount: z.number().positive(),
});

const JoinSchema = z.object({ userId: z.string() });
const StartSchema = z.object({ userId: z.string() });

/** Service containing all tanda business logic. */
export class TandaService {
  constructor(
    private readonly tandaRepo: ITandaRepository,
    private readonly userRepo: IUserRepository,
  ) {}

  /**
   * Retrieves a tanda by ID.
   * @param id - Tanda UUID.
   * @returns The tanda.
   */
  getTandaById(id: string): Tanda {
    const tanda = this.tandaRepo.findTandaById(id);
    if (!tanda) throw new NotFoundError(`Tanda ${id} not found`);
    return tanda;
  }

  /**
   * Creates a tanda and auto-joinsthe organizer as first participant.
   * @param raw - Unvalidated request body.
   * @returns The created tanda.
   */
  createTanda(raw: unknown): Tanda {
    const input = CreateTandaSchema.parse(raw);
    if (!this.userRepo.findById(input.organizerId)) {
      throw new NotFoundError(`User ${input.organizerId} not found`);
    }
    const tanda = this.tandaRepo.createTanda(input);
    this.tandaRepo.createParticipant({
      userId: input.organizerId,
      tandaId: tanda.id,
      role: 'organizer',
      rotationPosition: null,
      isDefaulter: false,
    });
    return tanda;
  }

  /**
   * Joins a user to a FORMING tanda.
   * @param tandaId - Target tanda id.
   * @param raw - Unvalidated request body containing userId.
   * @returns The created participant record.
   */
  joinTanda(tandaId: string, raw: unknown): Participant {
    const { userId } = JoinSchema.parse(raw);
    const tanda = this.tandaRepo.findTandaById(tandaId);
    if (!tanda) throw new NotFoundError(`Tanda ${tandaId} not found`);
    if (tanda.status !== 'forming') {
      throw new ValidationError('Can only join a tanda that is FORMING');
    }
    if (!this.userRepo.findById(userId)) {
      throw new NotFoundError(`User ${userId} not found`);
    }
    if (this.tandaRepo.findParticipant(userId, tandaId)) {
      throw new ConflictError('User is already a participant');
    }
    return this.tandaRepo.createParticipant({
      userId,
      tandaId,
      role: 'member',
      rotationPosition: null,
      isDefaulter: false,
    });
  }

  /**
   * Starts a tanda: validates ≥3 participants, randomizes rotation, transitions to ACTIVE.
   * @param tandaId - Target tanda id.
   * @param raw - Unvalidated request body containing userId (must be organizer).
   * @returns The updated tanda.
   */
  startTanda(tandaId: string, raw: unknown): Tanda {
    const { userId } = StartSchema.parse(raw);
    const tanda = this.tandaRepo.findTandaById(tandaId);
    if (!tanda) throw new NotFoundError(`Tanda ${tandaId} not found`);
    if (tanda.organizerId !== userId) throw new ForbiddenError('Only the organizer can start the tanda');

    const participants = this.tandaRepo.findParticipantsByTandaId(tandaId);
    if (participants.length < 3) {
      throw new ValidationError('A tanda needs at least 3 participants to start');
    }

    // Randomize rotation order
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    const positions = new Map(shuffled.map((p, i) => [p.id, i + 1]));
    this.tandaRepo.setRotationPositions(tandaId, positions);
    this.tandaRepo.updateTanda(tandaId, {
      status: 'active',
      currentRound: 1,
      totalRounds: participants.length,
    });

    return this.tandaRepo.findTandaById(tandaId)!;
  }

  /**
   * Returns all participants for a tanda.
   * @param tandaId - Target tanda id.
   * @returns Array of participant records.
   */
  getParticipants(tandaId: string): Participant[] {
    const tanda = this.tandaRepo.findTandaById(tandaId);
    if (!tanda) throw new NotFoundError(`Tanda ${tandaId} not found`);
    return this.tandaRepo.findParticipantsByTandaId(tandaId);
  }
}
