import { ITandaRepository } from './tanda.repository.interface';
import { IParticipantRepository } from '../participants/participant.repository.interface';
import { IUserRepository } from '../users/user.repository.interface';
import { CreateTandaDTO, TandaResponseDTO } from './tanda.types';
import { toTandaResponseDTO } from './tanda.mapper';
import { NotFoundError } from '../errors/AppError';

/**
 * Business logic for tanda lifecycle management.
 * Depends on port interfaces — concrete implementations injected at construction.
 */
export class TandaService {
  /**
   * @param tandaRepository - Persistence port for tandas
   * @param participantRepository - Persistence port for participants (auto-join on create)
   * @param userRepository - Used to verify the organizer exists before creating
   */
  constructor(
    private readonly tandaRepository: ITandaRepository,
    private readonly participantRepository: IParticipantRepository,
    private readonly userRepository: IUserRepository,
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
