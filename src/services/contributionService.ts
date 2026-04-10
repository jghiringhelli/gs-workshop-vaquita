import { contributionRepository } from "../repositories/contributionRepository.js";
import { participantRepository } from "../repositories/participantRepository.js";
import { tandaRepository } from "../repositories/tandaRepository.js";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from "../errors/index.js";
import { config } from "../config/index.js";
import type { ContributionRow } from "../repositories/contributionRepository.js";

export interface RoundSummary {
  round: number;
  tandaId: number;
  contributions: ContributionRow[];
  payoutRecipient: {
    participantId: number;
    userId: number;
    rotationPosition: number;
  } | null;
}

export const contributionService = {
  recordContribution(
    tandaId: number,
    participantId: number,
    amount: number,
    isLate = false
  ): ContributionRow {
    const tanda = tandaRepository.findById(tandaId);
    if (!tanda) {
      throw new NotFoundError("Tanda not found");
    }

    if (tanda.status !== "active") {
      throw new ValidationError("Tanda must be active to record contributions");
    }

    const participant = participantRepository.findById(participantId);
    if (!participant) {
      throw new NotFoundError("Participant not found");
    }

    if (participant.tanda_id !== tandaId) {
      throw new ValidationError("Participant does not belong to this tanda");
    }

    // Check for duplicate contribution in same round
    const existing = contributionRepository.findByParticipantAndRound(
      participantId,
      tanda.current_round
    );
    if (existing) {
      throw new ConflictError(
        "Contribution already recorded for this participant in the current round"
      );
    }

    // Business rule #6: late contributions incur penalty
    let finalAmount = amount;
    let status: ContributionRow["status"] = "paid";

    if (isLate) {
      finalAmount = amount * (1 + config.penaltyPct);
      status = "late";
    }

    return contributionRepository.create(
      tandaId,
      participantId,
      tanda.current_round,
      finalAmount,
      status
    );
  },

  getRoundSummary(tandaId: number, round: number): RoundSummary {
    const tanda = tandaRepository.findById(tandaId);
    if (!tanda) {
      throw new NotFoundError("Tanda not found");
    }

    if (round < 1 || round > tanda.total_rounds) {
      throw new ValidationError("Invalid round number");
    }

    const contributions = contributionRepository.findByTandaAndRound(
      tandaId,
      round
    );

    // The payout recipient is the participant whose rotationPosition == round
    const recipient = participantRepository.findByRotationPosition(
      tandaId,
      round
    );

    return {
      round,
      tandaId,
      contributions,
      payoutRecipient: recipient
        ? {
            participantId: recipient.id,
            userId: recipient.user_id,
            rotationPosition: recipient.rotation_position!,
          }
        : null,
    };
  },

  getParticipantHistory(
    tandaId: number,
    participantId: number
  ): ContributionRow[] {
    const tanda = tandaRepository.findById(tandaId);
    if (!tanda) {
      throw new NotFoundError("Tanda not found");
    }

    const participant = participantRepository.findById(participantId);
    if (!participant) {
      throw new NotFoundError("Participant not found");
    }

    if (participant.tanda_id !== tandaId) {
      throw new ValidationError("Participant does not belong to this tanda");
    }

    return contributionRepository.findByParticipant(participantId);
  },
};
