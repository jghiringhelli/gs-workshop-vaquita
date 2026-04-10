import { contributionRepository } from "../repositories/contributionRepository";
import { participantRepository } from "../repositories/participantRepository";
import { tandaRepository } from "../repositories/tandaRepository";
import { NotFoundError, ValidationError } from "../errors";
import { config } from "../config";

export const contributionService = {
  // Rules 5, 6, 7
  record(data: {
    tandaId: string;
    participantId: string;
    isLate?: boolean;
  }) {
    const tanda = tandaRepository.findById(data.tandaId);
    if (!tanda) throw new NotFoundError("Tanda", data.tandaId);

    // Rule 5: must be active to record contributions
    if (tanda.status !== "active") {
      throw new ValidationError(
        "Contributions can only be recorded when the tanda is active",
      );
    }

    const participant = participantRepository.findById(data.participantId);
    if (!participant || participant.tandaId !== data.tandaId) {
      throw new NotFoundError("Participant", data.participantId);
    }

    const alreadyRecorded = contributionRepository.findByParticipantAndRound(
      data.participantId,
      tanda.currentRound,
    );
    if (alreadyRecorded) {
      throw new ValidationError(
        `Contribution for participant in round ${tanda.currentRound} already recorded`,
      );
    }

    // Rule 6: late contributions incur 5% penalty
    const baseAmount = tanda.contributionAmount;
    const isLate = data.isLate ?? false;
    const amount = isLate
      ? baseAmount * (1 + config.latePenaltyRate)
      : baseAmount;
    const status = isLate ? "late" : "paid";

    const contribution = contributionRepository.create({
      tandaId: data.tandaId,
      participantId: data.participantId,
      round: tanda.currentRound,
      amount,
      status,
    });

    // Rule 7: flag as defaulter after MAX_CONSECUTIVE_MISSED missed contributions
    // (checking after recording paid/late resets the consecutive missed streak)
    const consecutiveMissed = contributionRepository.countConsecutiveMissed(
      data.participantId,
    );
    if (consecutiveMissed >= config.maxConsecutiveMissed) {
      participantRepository.markAsDefaulter(data.participantId);
    }

    return contribution;
  },

  recordMissed(data: { tandaId: string; participantId: string }) {
    const tanda = tandaRepository.findById(data.tandaId);
    if (!tanda) throw new NotFoundError("Tanda", data.tandaId);

    const participant = participantRepository.findById(data.participantId);
    if (!participant || participant.tandaId !== data.tandaId) {
      throw new NotFoundError("Participant", data.participantId);
    }

    const contribution = contributionRepository.create({
      tandaId: data.tandaId,
      participantId: data.participantId,
      round: tanda.currentRound,
      amount: 0,
      status: "missed",
    });

    // Rule 7: check consecutive missed contributions
    const consecutiveMissed = contributionRepository.countConsecutiveMissed(
      data.participantId,
    );
    if (consecutiveMissed >= config.maxConsecutiveMissed) {
      participantRepository.markAsDefaulter(data.participantId);
    }

    return contribution;
  },

  getParticipantHistory(tandaId: string, participantId: string) {
    const tanda = tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError("Tanda", tandaId);

    const participant = participantRepository.findById(participantId);
    if (!participant || participant.tandaId !== tandaId) {
      throw new NotFoundError("Participant", participantId);
    }

    return contributionRepository.getHistoryByParticipant(participantId);
  },
};
