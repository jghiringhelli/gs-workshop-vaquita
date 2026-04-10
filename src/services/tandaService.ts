import { tandaRepository } from "../repositories/tandaRepository";
import { participantRepository } from "../repositories/participantRepository";
import { contributionRepository } from "../repositories/contributionRepository";
import { userRepository } from "../repositories/userRepository";
import { Tanda, Participant, Contribution } from "../types";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from "../errors";
import { config } from "../config";

export const tandaService = {
  createTanda(
    name: string,
    organizerId: number,
    contributionAmount: number,
  ): Tanda {
    const organizer = userRepository.findById(organizerId);
    if (!organizer) {
      throw new NotFoundError(`User with id ${organizerId} not found`);
    }
    const tanda = tandaRepository.create(name, organizerId, contributionAmount);
    participantRepository.create(organizerId, tanda.id, "organizer");
    return tanda;
  },

  getTandaById(id: number): Tanda {
    const tanda = tandaRepository.findById(id);
    if (!tanda) {
      throw new NotFoundError(`Tanda with id ${id} not found`);
    }
    return tanda;
  },

  listTandasForUser(userId: number): Tanda[] {
    const user = userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError(`User with id ${userId} not found`);
    }
    return tandaRepository.findByUserId(userId);
  },

  joinTanda(tandaId: number, userId: number): Participant {
    const tanda = tandaRepository.findById(tandaId);
    if (!tanda) {
      throw new NotFoundError(`Tanda with id ${tandaId} not found`);
    }
    if (tanda.status !== "forming") {
      throw new BadRequestError(
        "Can only join a tanda that is in forming status",
      );
    }
    const user = userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError(`User with id ${userId} not found`);
    }
    const existing = participantRepository.findByUserAndTanda(userId, tandaId);
    if (existing) {
      throw new ConflictError("User is already a participant in this tanda");
    }
    const count = participantRepository.countByTandaId(tandaId);
    if (count >= config.maxParticipants) {
      throw new BadRequestError(
        `Tanda has reached the maximum of ${config.maxParticipants} participants`,
      );
    }
    return participantRepository.create(userId, tandaId, "member");
  },

  startTanda(tandaId: number, organizerId: number): Tanda {
    const tanda = tandaRepository.findById(tandaId);
    if (!tanda) {
      throw new NotFoundError(`Tanda with id ${tandaId} not found`);
    }
    if (tanda.organizerId !== organizerId) {
      throw new ForbiddenError("Only the organizer can start the tanda");
    }
    if (tanda.status !== "forming") {
      throw new BadRequestError(
        "Tanda can only be started from forming status",
      );
    }
    const participants = participantRepository.findByTandaId(tandaId);
    if (participants.length < config.minParticipants) {
      throw new BadRequestError(
        `At least ${config.minParticipants} participants are required to start`,
      );
    }

    // Randomize rotation order
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    shuffled.forEach((p, index) => {
      participantRepository.updateRotationPosition(p.id, index + 1);
    });

    tandaRepository.setTotalRounds(tandaId, participants.length);
    tandaRepository.setCurrentRound(tandaId, 1);
    tandaRepository.updateStatus(tandaId, "active");

    return tandaRepository.findById(tandaId)!;
  },

  cancelTanda(tandaId: number, organizerId: number): Tanda {
    const tanda = tandaRepository.findById(tandaId);
    if (!tanda) {
      throw new NotFoundError(`Tanda with id ${tandaId} not found`);
    }
    if (tanda.organizerId !== organizerId) {
      throw new ForbiddenError("Only the organizer can cancel the tanda");
    }
    if (tanda.status === "completed" || tanda.status === "cancelled") {
      throw new BadRequestError("Tanda is already completed or cancelled");
    }
    tandaRepository.updateStatus(tandaId, "cancelled");
    return tandaRepository.findById(tandaId)!;
  },

  getParticipants(tandaId: number): Participant[] {
    const tanda = tandaRepository.findById(tandaId);
    if (!tanda) {
      throw new NotFoundError(`Tanda with id ${tandaId} not found`);
    }
    return participantRepository.findByTandaId(tandaId);
  },

  recordContribution(
    tandaId: number,
    participantId: number,
    amount: number,
    status: "paid" | "late",
  ): Contribution {
    const tanda = tandaRepository.findById(tandaId);
    if (!tanda) {
      throw new NotFoundError(`Tanda with id ${tandaId} not found`);
    }
    if (tanda.status !== "active") {
      throw new BadRequestError(
        "Contributions can only be recorded for active tandas",
      );
    }
    const participant = participantRepository.findById(participantId);
    if (!participant) {
      throw new NotFoundError(`Participant with id ${participantId} not found`);
    }
    if (participant.tandaId !== tandaId) {
      throw new BadRequestError("Participant does not belong to this tanda");
    }
    const existing = contributionRepository.findByParticipantAndRound(
      participantId,
      tanda.currentRound,
    );
    if (existing) {
      throw new ConflictError("Contribution already recorded for this round");
    }

    let finalAmount = amount;
    if (status === "late") {
      finalAmount = amount * (1 + config.latePenaltyRate);
    }

    return contributionRepository.create(
      tandaId,
      participantId,
      tanda.currentRound,
      finalAmount,
      status,
    );
  },

  getRoundSummary(
    tandaId: number,
    round: number,
  ): {
    round: number;
    contributions: Contribution[];
    recipient: Participant | null;
  } {
    const tanda = tandaRepository.findById(tandaId);
    if (!tanda) {
      throw new NotFoundError(`Tanda with id ${tandaId} not found`);
    }
    if (round < 1 || round > tanda.totalRounds) {
      throw new BadRequestError(
        `Invalid round number. Must be between 1 and ${tanda.totalRounds}`,
      );
    }
    const contributions = contributionRepository.findByTandaAndRound(
      tandaId,
      round,
    );
    const participants = participantRepository.findByTandaId(tandaId);
    const recipient =
      participants.find((p) => p.rotationPosition === round) ?? null;
    return { round, contributions, recipient };
  },

  advanceRound(tandaId: number, organizerId: number): Tanda {
    const tanda = tandaRepository.findById(tandaId);
    if (!tanda) {
      throw new NotFoundError(`Tanda with id ${tandaId} not found`);
    }
    if (tanda.organizerId !== organizerId) {
      throw new ForbiddenError("Only the organizer can advance the round");
    }
    if (tanda.status !== "active") {
      throw new BadRequestError("Can only advance rounds for active tandas");
    }

    // Flag missed contributions
    const participants = participantRepository.findByTandaId(tandaId);
    for (const p of participants) {
      const contribution = contributionRepository.findByParticipantAndRound(
        p.id,
        tanda.currentRound,
      );
      if (!contribution) {
        contributionRepository.create(
          tandaId,
          p.id,
          tanda.currentRound,
          0,
          "missed",
        );
      }
    }

    const nextRound = tanda.currentRound + 1;
    if (nextRound > tanda.totalRounds) {
      tandaRepository.updateStatus(tandaId, "completed");
      return tandaRepository.findById(tandaId)!;
    }

    tandaRepository.setCurrentRound(tandaId, nextRound);
    return tandaRepository.findById(tandaId)!;
  },

  getParticipantHistory(
    tandaId: number,
    participantId: number,
  ): Contribution[] {
    const tanda = tandaRepository.findById(tandaId);
    if (!tanda) {
      throw new NotFoundError(`Tanda with id ${tandaId} not found`);
    }
    const participant = participantRepository.findById(participantId);
    if (!participant) {
      throw new NotFoundError(`Participant with id ${participantId} not found`);
    }
    if (participant.tandaId !== tandaId) {
      throw new BadRequestError("Participant does not belong to this tanda");
    }
    return contributionRepository.findByParticipant(participantId);
  },
};
