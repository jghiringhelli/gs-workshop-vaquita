import {
  Contribution,
  ContributionStatus,
  CreateContributionInput,
  CreateParticipantInput,
  CreateTandaInput,
  Participant,
  Tanda,
  TandaStatus,
} from "../domain/models";
import { env } from "../config/env";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../errors/app-error";
import { contributionRepository } from "../repositories/contribution-repository";
import { participantRepository } from "../repositories/participant-repository";
import { tandaRepository } from "../repositories/tanda-repository";
import { userRepository } from "../repositories/user-repository";

type TandaDetails = {
  tanda: Tanda;
  participants: Participant[];
};

type RoundSummary = {
  tandaId: number;
  round: number;
  expectedContributions: number;
  paidCount: number;
  lateCount: number;
  missedCount: number;
  totalCollected: number;
  winnerParticipantId: number | null;
  contributions: Contribution[];
};

type ParticipantHistory = {
  participant: Participant;
  contributions: Contribution[];
  isDefaulter: boolean;
};

function shuffleIds(ids: number[]): number[] {
  const copy = [...ids];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function assertOrganizer(tanda: Tanda, userId: number): void {
  if (tanda.organizerId !== userId) {
    throw new ForbiddenError("Only organizer can perform this action");
  }
}

function assertStatus(tanda: Tanda, expected: TandaStatus): void {
  if (tanda.status !== expected) {
    throw new ValidationError(`Tanda must be '${expected}'`);
  }
}

function validateCurrentRound(tanda: Tanda): void {
  if (tanda.currentRound <= 0) {
    throw new ValidationError("Tanda has not started a valid round yet");
  }
}

function isLate(roundStartedAt: Date): boolean {
  const msWindow = env.contributionWindowDays * 24 * 60 * 60 * 1000;
  return Date.now() - roundStartedAt.getTime() > msWindow;
}

function computeIsDefaulter(contributions: Contribution[]): boolean {
  const ordered = [...contributions].sort((a, b) => a.round - b.round);
  let streak = 0;
  for (const contribution of ordered) {
    if (contribution.status === "missed") {
      streak += 1;
      if (streak >= 2) {
        return true;
      }
    } else {
      streak = 0;
    }
  }
  return false;
}

export const tandaService = {
  create(input: CreateTandaInput): Tanda {
    const organizer = userRepository.findById(input.organizerId);
    if (!organizer) {
      throw new NotFoundError("Organizer user not found");
    }

    const tanda = tandaRepository.create(input);

    const organizerParticipant: CreateParticipantInput = {
      userId: input.organizerId,
      tandaId: tanda.id,
      role: "organizer",
      rotationPosition: null,
    };
    participantRepository.create(organizerParticipant);

    return tanda;
  },

  listForUser(userId: number): Tanda[] {
    const user = userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }
    return tandaRepository.listByUser(userId);
  },

  getById(id: number): TandaDetails {
    const tanda = tandaRepository.findById(id);
    if (!tanda) {
      throw new NotFoundError("Tanda not found");
    }
    return {
      tanda,
      participants: participantRepository.listByTandaOrdered(id),
    };
  },

  join(tandaId: number, userId: number): Participant {
    const tanda = tandaRepository.findById(tandaId);
    if (!tanda) {
      throw new NotFoundError("Tanda not found");
    }
    assertStatus(tanda, "forming");

    const user = userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const existing = participantRepository.findByUserAndTanda(userId, tandaId);
    if (existing) {
      throw new ConflictError("User already joined this tanda");
    }

    const count = participantRepository.countByTanda(tandaId);
    if (count >= env.maxParticipants) {
      throw new ValidationError("Maximum participants reached");
    }

    return participantRepository.create({
      userId,
      tandaId,
      role: "member",
      rotationPosition: null,
    });
  },

  start(tandaId: number, organizerId: number): Tanda {
    const tanda = tandaRepository.findById(tandaId);
    if (!tanda) {
      throw new NotFoundError("Tanda not found");
    }
    assertOrganizer(tanda, organizerId);
    assertStatus(tanda, "forming");

    const participants = participantRepository.listByTanda(tandaId);
    if (participants.length < env.minParticipantsToStart) {
      throw new ValidationError(`At least ${env.minParticipantsToStart} participants are required`);
    }

    const randomizedIds = shuffleIds(participants.map((p) => p.id));
    participantRepository.setRotationPositions(tandaId, randomizedIds);
    tandaRepository.activate(tandaId, participants.length);

    return tandaRepository.findById(tandaId) as Tanda;
  },

  cancel(tandaId: number, organizerId: number): Tanda {
    const tanda = tandaRepository.findById(tandaId);
    if (!tanda) {
      throw new NotFoundError("Tanda not found");
    }
    assertOrganizer(tanda, organizerId);

    if (tanda.status === "completed" || tanda.status === "cancelled") {
      throw new ValidationError("Tanda cannot be cancelled from current status");
    }

    tandaRepository.setStatus(tandaId, "cancelled");
    return tandaRepository.findById(tandaId) as Tanda;
  },

  listParticipants(tandaId: number): Participant[] {
    const tanda = tandaRepository.findById(tandaId);
    if (!tanda) {
      throw new NotFoundError("Tanda not found");
    }
    return participantRepository.listByTandaOrdered(tandaId);
  },

  recordContribution(
    tandaId: number,
    participantId: number,
    amount: number
  ): Contribution {
    const tanda = tandaRepository.findById(tandaId);
    if (!tanda) {
      throw new NotFoundError("Tanda not found");
    }
    assertStatus(tanda, "active");
    validateCurrentRound(tanda);

    const participant = participantRepository.findByIdAndTanda(participantId, tandaId);
    if (!participant) {
      throw new NotFoundError("Participant not found in tanda");
    }

    const duplicate = contributionRepository.findByParticipantAndRound(participantId, tanda.currentRound);
    if (duplicate) {
      throw new ConflictError("Contribution already recorded for this round");
    }

    const roundStartedAt = tandaRepository.getRoundStartedAt(tandaId);
    if (!roundStartedAt) {
      throw new ValidationError("Round start timestamp is missing");
    }

    const late = isLate(roundStartedAt);
    const status: ContributionStatus = late ? "late" : "paid";
    const adjustedAmount = late ? Number((amount * (1 + env.penaltyPercent)).toFixed(2)) : amount;

    const contributionInput: CreateContributionInput = {
      tandaId,
      participantId,
      round: tanda.currentRound,
      amount: adjustedAmount,
      status,
    };

    return contributionRepository.create(contributionInput);
  },

  getRoundSummary(tandaId: number, round: number): RoundSummary {
    const tanda = tandaRepository.findById(tandaId);
    if (!tanda) {
      throw new NotFoundError("Tanda not found");
    }

    const participants = participantRepository.listByTanda(tandaId);
    const contributions = contributionRepository.listByTandaAndRound(tandaId, round);

    const paidCount = contributions.filter((c) => c.status === "paid").length;
    const lateCount = contributions.filter((c) => c.status === "late").length;
    const missedCount = contributions.filter((c) => c.status === "missed").length;
    const totalCollected = contributions.reduce((sum, c) => sum + c.amount, 0);

    const winner = participants.find((p) => p.rotationPosition === round);

    return {
      tandaId,
      round,
      expectedContributions: participants.length,
      paidCount,
      lateCount,
      missedCount,
      totalCollected,
      winnerParticipantId: winner?.id ?? null,
      contributions,
    };
  },

  advance(tandaId: number, organizerId: number): Tanda {
    const tanda = tandaRepository.findById(tandaId);
    if (!tanda) {
      throw new NotFoundError("Tanda not found");
    }
    assertOrganizer(tanda, organizerId);
    assertStatus(tanda, "active");

    if (tanda.currentRound >= tanda.totalRounds) {
      tandaRepository.setStatus(tandaId, "completed");
      return tandaRepository.findById(tandaId) as Tanda;
    }

    const nextRound = tanda.currentRound + 1;
    const nextStatus: TandaStatus = nextRound > tanda.totalRounds ? "completed" : "active";
    tandaRepository.advanceRound(tandaId, nextRound, nextStatus);

    const updated = tandaRepository.findById(tandaId) as Tanda;
    if (updated.currentRound >= updated.totalRounds) {
      tandaRepository.setStatus(tandaId, "completed");
      return tandaRepository.findById(tandaId) as Tanda;
    }
    return updated;
  },

  getParticipantHistory(tandaId: number, participantId: number): ParticipantHistory {
    const tanda = tandaRepository.findById(tandaId);
    if (!tanda) {
      throw new NotFoundError("Tanda not found");
    }

    const participant = participantRepository.findByIdAndTanda(participantId, tandaId);
    if (!participant) {
      throw new NotFoundError("Participant not found in tanda");
    }

    const contributions = contributionRepository.listByParticipantInTanda(tandaId, participantId);
    return {
      participant,
      contributions,
      isDefaulter: computeIsDefaulter(contributions),
    };
  },
};
