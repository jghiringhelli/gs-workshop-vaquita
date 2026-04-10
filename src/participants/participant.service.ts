import { IParticipantRepository } from './participant.repository.interface';
import { ITandaRepository } from '../tandas/tanda.repository.interface';
import { IUserRepository } from '../users/user.repository.interface';
import { ParticipantResponseDTO } from './participant.types';
import { toParticipantResponseDTO } from './participant.mapper';
import { NotFoundError, ConflictError } from '../errors/AppError';

/** Configuration values consumed by ParticipantService. */
export interface ParticipantServiceConfig {
  /** Maximum number of participants allowed per tanda (BR-2). From env config. */
  maxParticipants: number;
}

/**
 * Business logic for participant management.
 * Owns the join flow and the five guards that protect it.
 */
export class ParticipantService {
  /**
   * @param tandaRepository - For looking up tanda state before join
   * @param participantRepository - For duplicate checks, counting, and creating
   * @param userRepository - For verifying the joining user exists
   * @param config - Injected config; allows tests to set maxParticipants without env changes
   */
  constructor(
    private readonly tandaRepository: ITandaRepository,
    private readonly participantRepository: IParticipantRepository,
    private readonly userRepository: IUserRepository,
    private readonly config: ParticipantServiceConfig,
  ) {}

  /**
   * Joins a user to a tanda as a member, enforcing all business rules.
   *
   * Guards (in order):
   * 1. Tanda must exist.
   * 2. Tanda must be in FORMING status (BR-10).
   * 3. User must exist.
   * 4. User must not already be a participant (no double-join).
   * 5. Participant count must be below the configured maximum (BR-2).
   *
   * @param tandaId - Tanda UUID from the route parameter
   * @param userId - User UUID from the validated request body
   * @throws NotFoundError if the tanda or user does not exist
   * @throws ConflictError if the tanda is not forming, user is already joined, or tanda is full
   * @returns The created participant as a response DTO
   */
  joinTanda(tandaId: string, userId: string): ParticipantResponseDTO {
    const tanda = this.tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda', tandaId);

    if (tanda.status !== 'forming') {
      throw new ConflictError(
        `Cannot join tanda '${tandaId}': status is '${tanda.status}', expected 'forming'`,
      );
    }

    const user = this.userRepository.findById(userId);
    if (!user) throw new NotFoundError('User', userId);

    const existing = this.participantRepository.findByTandaAndUser(tandaId, userId);
    if (existing) {
      throw new ConflictError(
        `User '${userId}' is already a participant in tanda '${tandaId}'`,
      );
    }

    const participants = this.participantRepository.findByTandaId(tandaId);
    if (participants.length >= this.config.maxParticipants) {
      throw new ConflictError(
        `Tanda '${tandaId}' has reached the maximum of ${this.config.maxParticipants} participants`,
      );
    }

    const participant = this.participantRepository.create({
      userId,
      tandaId,
      role: 'member',
    });

    return toParticipantResponseDTO(participant);
  }

  /**
   * Returns all participants in a tanda.
   * @param tandaId - Tanda UUID
   * @throws NotFoundError if the tanda does not exist
   * @returns Array of participant response DTOs ordered by join date
   */
  listParticipants(tandaId: string): ParticipantResponseDTO[] {
    const tanda = this.tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda', tandaId);

    return this.participantRepository.findByTandaId(tandaId).map(toParticipantResponseDTO);
  }
}
