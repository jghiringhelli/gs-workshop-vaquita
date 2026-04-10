import { tandaRepository } from "../repositories/tandaRepository.js";
import { participantRepository } from "../repositories/participantRepository.js";
import { contributionRepository } from "../repositories/contributionRepository.js";
import { userRepository } from "../repositories/userRepository.js";
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "../errors/index.js";
import { config } from "../config/index.js";
import type { TandaRow } from "../repositories/tandaRepository.js";

export const tandaService = {
  createTanda(
    name: string,
    organizerId: number,
    contributionAmount: number
  ): TandaRow {
    const organizer = userRepository.findById(organizerId);
    if (!organizer) {
      throw new NotFoundError("Organizer user not found");
    }

    const tanda = tandaRepository.create(name, organizerId, contributionAmount);

    // Business rule #3: organizer auto-joins as first participant
    participantRepository.create(organizerId, tanda.id, "organizer");

    return tandaRepository.findById(tanda.id)!;
  },

  getTandas(userId?: number): TandaRow[] {
    if (userId) {
      return tandaRepository.findByUserId(userId);
    }
    return tandaRepository.findAll();
  },

  getTandaById(id: number): TandaRow {
    const tanda = tandaRepository.findById(id);
    if (!tanda) {
      throw new NotFoundError("Tanda not found");
    }
    return tanda;
  },

  startTanda(tandaId: number, userId: number): TandaRow {
    const tanda = tandaRepository.findById(tandaId);
    if (!tanda) {
      throw new NotFoundError("Tanda not found");
    }

    // Business rule #8: only organizer can start
    if (tanda.organizer_id !== userId) {
      throw new ForbiddenError("Only the organizer can start the tanda");
    }

    // Business rule #10: only FORMING → ACTIVE
    if (tanda.status !== "forming") {
      throw new ValidationError("Tanda can only be started from forming status");
    }

    // Business rule #1: at least 3 participants
    const participantCount = participantRepository.countByTanda(tandaId);
    if (participantCount < 3) {
      throw new ValidationError(
        "At least 3 participants are required to start a tanda"
      );
    }

    // Business rule #4: randomize rotation order
    const participants = participantRepository.findByTandaId(tandaId);
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    shuffled.forEach((p, index) => {
      participantRepository.updateRotationPosition(p.id, index + 1);
    });

    // Set total rounds = number of participants, current round = 1
    tandaRepository.updateTotalRounds(tandaId, participantCount);
    tandaRepository.updateRound(tandaId, 1);
    tandaRepository.updateStatus(tandaId, "active");

    return tandaRepository.findById(tandaId)!;
  },

  cancelTanda(tandaId: number, userId: number): TandaRow {
    const tanda = tandaRepository.findById(tandaId);
    if (!tanda) {
      throw new NotFoundError("Tanda not found");
    }

    // Business rule #8: only organizer
    if (tanda.organizer_id !== userId) {
      throw new ForbiddenError("Only the organizer can cancel the tanda");
    }

    // Business rule #10: FORMING or ACTIVE → CANCELLED
    if (tanda.status !== "forming" && tanda.status !== "active") {
      throw new ValidationError("Tanda cannot be cancelled from current status");
    }

    tandaRepository.updateStatus(tandaId, "cancelled");
    return tandaRepository.findById(tandaId)!;
  },

  advanceRound(tandaId: number, userId: number): TandaRow {
    const tanda = tandaRepository.findById(tandaId);
    if (!tanda) {
      throw new NotFoundError("Tanda not found");
    }

    // Business rule #8: only organizer
    if (tanda.organizer_id !== userId) {
      throw new ForbiddenError("Only the organizer can advance the round");
    }

    if (tanda.status !== "active") {
      throw new ValidationError("Tanda must be active to advance rounds");
    }

    // Mark pending contributions as missed for current round
    const pending = contributionRepository.findPendingByTandaAndRound(
      tandaId,
      tanda.current_round
    );
    for (const contribution of pending) {
      contributionRepository.updateStatus(contribution.id, "missed");

      // Business rule #7: 2 consecutive misses → defaulter
      const consecutiveMissed = contributionRepository.countConsecutiveMissed(
        contribution.participant_id,
        tanda.current_round
      );
      if (consecutiveMissed >= 2) {
        participantRepository.markAsDefaulter(contribution.participant_id);
      }
    }

    const nextRound = tanda.current_round + 1;

    // Business rule #9: auto-complete after last round
    if (nextRound > tanda.total_rounds) {
      tandaRepository.updateStatus(tandaId, "completed");
      return tandaRepository.findById(tandaId)!;
    }

    tandaRepository.updateRound(tandaId, nextRound);
    return tandaRepository.findById(tandaId)!;
  },
};
