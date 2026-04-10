import { ITandaRepository } from './tanda.repository.interface';
import { IParticipantRepository } from '../participants/participant.repository.interface';
import { IUserRepository } from '../users/user.repository.interface';
import { CreateTandaDTO, TandaResponseDTO } from './tanda.types';
import { toTandaResponseDTO } from './tanda.mapper';
import { NotFoundError, ForbiddenError, ConflictError } from '../errors/AppError';
import { shuffleArray } from './tanda.utils';

/** Configuration values consumed by TandaService. */
export interface TandaServiceConfig {
  /** Minimum number of participants required before a tanda can be started (BR-1). */
  minParticipantsToStart: number;
}

/**
 * Business logic for tanda lifecycle management.
 * Depends on port interfaces — concrete implementations injected at construction.
 */
export class TandaService {
  /**
   * @param tandaRepository - Persistence port for tandas
   * @param participantRepository - Persistence port for participants (auto-join on create)
   * @param userRepository - Used to verify the organizer exists before creating
   * @param config - Injected config; allows tests to control minParticipantsToStart
   */
  constructor(
    private readonly tandaRepository: ITandaRepository,
    private readonly participantRepository: IParticipantRepository,
    private readonly userRepository: IUserRepository,
    private readonly config: TandaServiceConfig,
  ) {}

  /**
   * Creates a new tanda and auto-joins the organizer as the first participant.
   *
   * Business rule BR-3: The organizer is automatically the first participant
   * with role 'organizer'.
   *
   * @param dto - Validated creation data
   * @throws NotFoundError if the organizerId does not reference an existing user
   * @returns The created tanda as a response DTO
   */
  createTanda(dto: CreateTandaDTO): TandaResponseDTO {
    const organizer = this.userRepository.findById(dto.organizerId);
    if (!organizer) throw new NotFoundError('User', dto.organizerId);

    const tanda = this.tandaRepository.create(dto);

    this.participantRepository.create({
      userId: dto.organizerId,
      tandaId: tanda.id,
      role: 'organizer',
    });

    return toTandaResponseDTO(tanda);
  }

  /**
   * Transitions a tanda from FORMING to ACTIVE.
   *
   * Guards (in order):
   * 1. Tanda must exist.
   * 2. Requester must be the organizer (BR-8).
   * 3. Tanda must be in FORMING status (BR-10).
   * 4. Participant count must meet the minimum required (BR-1).
   *
   * On success: randomises rotation positions (Fisher-Yates), sets totalRounds = N,
   * and atomically writes status + all rotation assignments in one transaction (BR-4).
   *
   * @param tandaId - Tanda UUID
   * @param requesterId - UUID of the user attempting to start (verified against organizerId)
   * @throws NotFoundError if the tanda does not exist
   * @throws ForbiddenError if the requester is not the organizer
   * @throws ConflictError if the tanda is not forming or has too few participants
   * @returns The updated tanda as a response DTO
   */
  startTanda(tandaId: string, requesterId: string): TandaResponseDTO {
    const tanda = this.tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda', tandaId);

    if (tanda.organizerId !== requesterId) {
      throw new ForbiddenError(`Only the organizer can start tanda '${tandaId}'`);
    }

    if (tanda.status !== 'forming') {
      throw new ConflictError(
        `Cannot start tanda '${tandaId}': status is '${tanda.status}', expected 'forming'`,
      );
    }

    const participants = this.participantRepository.findByTandaId(tandaId);
    if (participants.length < this.config.minParticipantsToStart) {
      throw new ConflictError(
        `Tanda '${tandaId}' needs at least ${this.config.minParticipantsToStart} participants to start, currently has ${participants.length}`,
      );
    }

    const shuffledIds = shuffleArray(participants.map((p) => p.id));
    const assignments = shuffledIds.map((participantId, idx) => ({
      participantId,
      rotationPosition: idx + 1,
    }));

    const updated = this.tandaRepository.startTanda(tandaId, {
      totalRounds: participants.length,
      assignments,
    });

    return toTandaResponseDTO(updated);
  }

  /**
   * Transitions a tanda to CANCELLED status.
   *
   * Guards (in order):
   * 1. Tanda must exist.
   * 2. Requester must be the organizer (BR-8).
   * 3. Tanda must be in FORMING or ACTIVE status (BR-10).
   *
   * @param tandaId - Tanda UUID
   * @param requesterId - UUID of the user attempting to cancel
   * @throws NotFoundError if the tanda does not exist
   * @throws ForbiddenError if the requester is not the organizer
   * @throws ConflictError if the tanda is already completed or cancelled
   * @returns The updated tanda as a response DTO
   */
  cancelTanda(tandaId: string, requesterId: string): TandaResponseDTO {
    const tanda = this.tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda', tandaId);

    if (tanda.organizerId !== requesterId) {
      throw new ForbiddenError(`Only the organizer can cancel tanda '${tandaId}'`);
    }

    if (tanda.status !== 'forming' && tanda.status !== 'active') {
      throw new ConflictError(
        `Cannot cancel tanda '${tandaId}': status is '${tanda.status}'`,
      );
    }

    const updated = this.tandaRepository.cancelTanda(tandaId);
    return toTandaResponseDTO(updated);
  }

  /**
   * Retrieves a single tanda by ID.
   * @param id - Tanda UUID
   * @throws NotFoundError if no tanda with that ID exists
   * @returns The tanda as a response DTO
   */
  getTandaById(id: string): TandaResponseDTO {
    const tanda = this.tandaRepository.findById(id);
    if (!tanda) throw new NotFoundError('Tanda', id);
    return toTandaResponseDTO(tanda);
  }

  /**
   * Returns all tandas in which the given user is a participant.
   * @param userId - User UUID to filter by
   * @returns Array of tanda response DTOs
   */
  listTandasForUser(userId: string): TandaResponseDTO[] {
    return this.tandaRepository.findByUserId(userId).map(toTandaResponseDTO);
  }
}
