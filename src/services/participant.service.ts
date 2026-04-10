import { v4 as uuidv4 } from 'uuid';
import { Participant, JoinTandaRequest } from '../models/participant';
import { ParticipantRepository } from '../repositories/participant.repository';
import { TandaRepository } from '../repositories/tanda.repository';
import { config } from '../config';

export class ParticipantService {
  constructor(
    private participantRepository: ParticipantRepository,
    private tandaRepository: TandaRepository
  ) {}

  /**
   * Join a user to a tanda
   * Business rules:
   * - Tanda must exist
   * - User cannot join twice
   * - Maximum participants limit
   * - Tanda must be in 'forming' status
   */
  joinTanda(tandaId: string, request: JoinTandaRequest): Participant {
    // Check if tanda exists and is still forming
    const tanda = this.tandaRepository.findById(tandaId);
    if (!tanda) {
      throw new Error('Tanda not found');
    }

    if (tanda.status !== 'forming') {
      throw new Error('Cannot join a tanda that is not in forming status');
    }

    // Check if user is already a participant
    const existing = this.participantRepository.findByTandaAndUser(tandaId, request.userId);
    if (existing) {
      throw new Error('User is already a participant in this tanda');
    }

    // Check max participants limit
    const count = this.participantRepository.countByTanda(tandaId);
    if (count >= config.MAX_PARTICIPANTS) {
      throw new Error(`Maximum participants limit (${config.MAX_PARTICIPANTS}) reached`);
    }

    // Create participant
    const participant: Participant = {
      id: uuidv4(),
      userId: request.userId,
      tandaId,
      role: 'member',
      rotationPosition: count, // Position increments with join order
    };

    return this.participantRepository.create(participant);
  }

  /**
   * Get all participants in a tanda
   */
  getTandaParticipants(tandaId: string): Participant[] {
    return this.participantRepository.findByTanda(tandaId);
  }

  /**
   * Get participant count for a tanda
   */
  getParticipantCount(tandaId: string): number {
    return this.participantRepository.countByTanda(tandaId);
  }
}
