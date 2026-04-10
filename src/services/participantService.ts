import { participantRepository } from "../repositories/participantRepository.js";
import { tandaRepository } from "../repositories/tandaRepository.js";
import { userRepository } from "../repositories/userRepository.js";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from "../errors/index.js";
import { config } from "../config/index.js";
import type { ParticipantRow } from "../repositories/participantRepository.js";

export const participantService = {
  joinTanda(userId: number, tandaId: number): ParticipantRow {
    const user = userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const tanda = tandaRepository.findById(tandaId);
    if (!tanda) {
      throw new NotFoundError("Tanda not found");
    }

    // Can only join while forming
    if (tanda.status !== "forming") {
      throw new ValidationError("Can only join a tanda in forming status");
    }

    // No duplicate participants
    const existing = participantRepository.findByUserAndTanda(userId, tandaId);
    if (existing) {
      throw new ConflictError("User is already a participant in this tanda");
    }

    // Business rule #2: max participants
    const count = participantRepository.countByTanda(tandaId);
    if (count >= config.maxParticipants) {
      throw new ValidationError(
        `Maximum of ${config.maxParticipants} participants reached`
      );
    }

    return participantRepository.create(userId, tandaId, "member");
  },

  getParticipants(tandaId: number): ParticipantRow[] {
    const tanda = tandaRepository.findById(tandaId);
    if (!tanda) {
      throw new NotFoundError("Tanda not found");
    }
    return participantRepository.findByTandaId(tandaId);
  },
};
