/**
 * Participant Service
 * Contains business logic for participant management
 */

import { Repositories } from '../types/index.js';
import { NotFoundError, BusinessRuleError } from '../errors/index.js';

export class ParticipantService {
  constructor(private repositories: Repositories) {}

  /**
   * Get participants in a tanda
   */
  getParticipants(tandaId: string) {
    const tanda = this.repositories.tandas.findById(tandaId);
    if (!tanda) {
      throw new NotFoundError('Tanda', tandaId);
    }

    return this.repositories.participants.findByTandaId(tandaId);
  }

  /**
   * Get participant details
   */
  getParticipant(participantId: string) {
    const participant = this.repositories.participants.findById(participantId);
    if (!participant) {
      throw new NotFoundError('Participant', participantId);
    }

    return participant;
  }

  /**
   * Deserialize participants with user information
   */
  async getParticipantsWithUserInfo(tandaId: string) {
    const participants = this.getParticipants(tandaId);

    return participants.map((participant) => {
      const user = this.repositories.users.findById(participant.userId);
      if (!user) {
        throw new NotFoundError('User', participant.userId);
      }

      return {
        ...participant,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      };
    });
  }
}
