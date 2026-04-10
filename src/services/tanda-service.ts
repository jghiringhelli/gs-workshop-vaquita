import type { AppConfig } from "../config/env";
import type { Contribution, Participant, Tanda } from "../domain/models";
import { getDatabase } from "../db/database";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../errors/app-error";
import { ContributionRepository } from "../repositories/contribution-repository";
import { ParticipantRepository } from "../repositories/participant-repository";
import { TandaRepository } from "../repositories/tanda-repository";
import { UserRepository } from "../repositories/user-repository";

const MIN_PARTICIPANTS_TO_START = 3;

function shuffleParticipants(participants: Participant[]): Participant[] {
  const clone = [...participants];

  for (let index = clone.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const temp = clone[index];
    clone[index] = clone[swapIndex];
    clone[swapIndex] = temp;
  }

  return clone;
}

function hasTwoConsecutiveMissed(contributions: Contribution[]): boolean {
  if (contributions.length < 2) {
    return false;
  }

  const sorted = [...contributions].sort((a, b) => a.round - b.round);
  const last = sorted[sorted.length - 1];
  const previous = sorted[sorted.length - 2];

  return (
    last.status === "missed" &&
    previous.status === "missed" &&
    last.round === previous.round + 1
  );
}

export interface RoundSummary {
  tandaId: number;
  round: number;
  recipientParticipantId: number | null;
  expectedPotAmount: number;
  collectedAmount: number;
  contributions: Contribution[];
}

export class TandaService {
  constructor(
    private readonly tandaRepository: TandaRepository,
    private readonly userRepository: UserRepository,
    private readonly participantRepository: ParticipantRepository,
    private readonly contributionRepository: ContributionRepository,
    private readonly config: AppConfig
  ) {}

  createTanda(input: {
    name: string;
    organizerId: number;
    contributionAmount: number;
  }): Tanda {
    const organizer = this.userRepository.findById(input.organizerId);

    if (!organizer) {
      throw new NotFoundError("Organizer user not found");
    }

    const db = getDatabase();

    const createTransaction = db.transaction(() => {
      const tanda = this.tandaRepository.create(input);

      this.participantRepository.create({
        userId: input.organizerId,
        tandaId: tanda.id,
        role: "organizer",
        rotationPosition: 1,
      });

      this.tandaRepository.updateRoundState(tanda.id, 1, 1);

      return this.tandaRepository.findById(tanda.id) as Tanda;
    });

    return createTransaction();
  }

  listTandasForUser(userId: number): Tanda[] {
    const user = this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundError("User not found");
    }

    return this.tandaRepository.listByUser(userId);
  }

  getTandaById(id: number): Tanda {
    const tanda = this.tandaRepository.findById(id);

    if (!tanda) {
      throw new NotFoundError("Tanda not found");
    }

    return tanda;
  }

  joinTanda(input: { tandaId: number; userId: number }): Participant {
    const user = this.userRepository.findById(input.userId);

    if (!user) {
      throw new NotFoundError("User not found");
    }

    const tanda = this.tandaRepository.findById(input.tandaId);

    if (!tanda) {
      throw new NotFoundError("Tanda not found");
    }

    if (tanda.status !== "forming") {
      throw new ValidationError("Only tandas in forming status can be joined");
    }

    const existing = this.participantRepository.findByUserAndTanda(
      input.userId,
      input.tandaId
    );

    if (existing) {
      throw new ConflictError("User is already a participant in this tanda");
    }

    const totalParticipants = this.participantRepository.countByTanda(input.tandaId);

    if (totalParticipants >= this.config.maxParticipants) {
      throw new ValidationError("Maximum number of participants reached");
    }

    const participant = this.participantRepository.create({
      userId: input.userId,
      tandaId: input.tandaId,
      role: "member",
      rotationPosition: null,
    });

    this.tandaRepository.updateRoundState(
      input.tandaId,
      tanda.currentRound,
      totalParticipants + 1
    );

    return participant;
  }

  listParticipants(tandaId: number): Participant[] {
    const tanda = this.tandaRepository.findById(tandaId);

    if (!tanda) {
      throw new NotFoundError("Tanda not found");
    }

    return this.participantRepository.listByTanda(tandaId);
  }

  startTanda(input: { tandaId: number; organizerId: number }): Tanda {
    const tanda = this.tandaRepository.findById(input.tandaId);

    if (!tanda) {
      throw new NotFoundError("Tanda not found");
    }

    if (tanda.status !== "forming") {
      throw new ValidationError("Only tandas in forming status can be started");
    }

    if (tanda.organizerId !== input.organizerId) {
      throw new ForbiddenError("Only the organizer can start this tanda");
    }

    const participants = this.participantRepository.listByTanda(input.tandaId);

    if (participants.length < MIN_PARTICIPANTS_TO_START) {
      throw new ValidationError("At least 3 participants are required to start");
    }

    const db = getDatabase();

    const startTransaction = db.transaction(() => {
      const shuffled = shuffleParticipants(participants);

      this.participantRepository.clearRotationByTanda(input.tandaId);

      for (let index = 0; index < shuffled.length; index += 1) {
        this.participantRepository.updateRotationPosition(shuffled[index].id, index + 1);
      }

      this.tandaRepository.updateRoundState(input.tandaId, 1, shuffled.length);
      this.tandaRepository.updateStatus(input.tandaId, "active");

      return this.tandaRepository.findById(input.tandaId) as Tanda;
    });

    return startTransaction();
  }

  cancelTanda(input: { tandaId: number; organizerId: number }): Tanda {
    const tanda = this.tandaRepository.findById(input.tandaId);

    if (!tanda) {
      throw new NotFoundError("Tanda not found");
    }

    if (tanda.organizerId !== input.organizerId) {
      throw new ForbiddenError("Only the organizer can cancel this tanda");
    }

    if (tanda.status === "completed" || tanda.status === "cancelled") {
      throw new ValidationError("Only active or forming tandas can be cancelled");
    }

    this.tandaRepository.updateStatus(input.tandaId, "cancelled");
    return this.tandaRepository.findById(input.tandaId) as Tanda;
  }

  recordContribution(input: {
    tandaId: number;
    participantId: number;
    actorUserId: number;
    isLate?: boolean;
  }): Contribution {
    const tanda = this.tandaRepository.findById(input.tandaId);

    if (!tanda) {
      throw new NotFoundError("Tanda not found");
    }

    if (tanda.status !== "active") {
      throw new ValidationError("Contributions can only be recorded for active tandas");
    }

    const participant = this.participantRepository.findById(input.participantId);

    if (!participant || participant.tandaId !== input.tandaId) {
      throw new NotFoundError("Participant not found in this tanda");
    }

    if (participant.userId !== input.actorUserId) {
      throw new ForbiddenError(
        "Authenticated user cannot record contribution for another participant"
      );
    }

    const existing = this.contributionRepository.findByRoundAndParticipant(
      input.tandaId,
      input.participantId,
      tanda.currentRound
    );

    if (existing) {
      throw new ConflictError(
        "Contribution already recorded for this participant in current round"
      );
    }

    const isLate = input.isLate ?? false;
    const penaltyAmount = isLate
      ? Math.round((tanda.contributionAmount * this.config.latePenaltyPercent) / 100)
      : 0;

    return this.contributionRepository.create({
      tandaId: input.tandaId,
      participantId: input.participantId,
      round: tanda.currentRound,
      amount: tanda.contributionAmount,
      status: isLate ? "late" : "paid",
      penaltyAmount,
    });
  }

  getRoundSummary(input: { tandaId: number; round: number }): RoundSummary {
    const tanda = this.tandaRepository.findById(input.tandaId);

    if (!tanda) {
      throw new NotFoundError("Tanda not found");
    }

    if (input.round <= 0 || input.round > tanda.totalRounds) {
      throw new ValidationError("Round is outside configured tanda rounds");
    }

    const participants = this.participantRepository.listByTanda(input.tandaId);
    const contributions = this.contributionRepository.listByRound(
      input.tandaId,
      input.round
    );
    const recipient = participants.find(
      (participant) => participant.rotationPosition === input.round
    );

    const collectedAmount = contributions.reduce(
      (total, contribution) => total + contribution.amount + contribution.penaltyAmount,
      0
    );

    return {
      tandaId: input.tandaId,
      round: input.round,
      recipientParticipantId: recipient?.id ?? null,
      expectedPotAmount: tanda.contributionAmount * participants.length,
      collectedAmount,
      contributions,
    };
  }

  advanceRound(input: { tandaId: number; organizerId: number }): Tanda {
    const tanda = this.tandaRepository.findById(input.tandaId);

    if (!tanda) {
      throw new NotFoundError("Tanda not found");
    }

    if (tanda.status !== "active") {
      throw new ValidationError("Only active tandas can advance rounds");
    }

    if (tanda.organizerId !== input.organizerId) {
      throw new ForbiddenError("Only the organizer can advance rounds");
    }

    const participants = this.participantRepository.listByTanda(input.tandaId);
    const db = getDatabase();

    const advanceTransaction = db.transaction(() => {
      for (const participant of participants) {
        const contribution = this.contributionRepository.findByRoundAndParticipant(
          input.tandaId,
          participant.id,
          tanda.currentRound
        );

        if (!contribution) {
          this.contributionRepository.create({
            tandaId: input.tandaId,
            participantId: participant.id,
            round: tanda.currentRound,
            amount: tanda.contributionAmount,
            status: "missed",
            penaltyAmount: 0,
          });
        }

        const history = this.contributionRepository.listByParticipant(
          input.tandaId,
          participant.id
        );

        if (hasTwoConsecutiveMissed(history)) {
          this.participantRepository.setDefaulter(participant.id, true);
        }
      }

      if (tanda.currentRound >= tanda.totalRounds) {
        this.tandaRepository.updateStatus(input.tandaId, "completed");
        return this.tandaRepository.findById(input.tandaId) as Tanda;
      }

      this.tandaRepository.updateRoundState(
        input.tandaId,
        tanda.currentRound + 1,
        tanda.totalRounds
      );

      return this.tandaRepository.findById(input.tandaId) as Tanda;
    });

    return advanceTransaction();
  }

  getParticipantHistory(input: {
    tandaId: number;
    participantId: number;
  }): Contribution[] {
    const tanda = this.tandaRepository.findById(input.tandaId);

    if (!tanda) {
      throw new NotFoundError("Tanda not found");
    }

    const participant = this.participantRepository.findById(input.participantId);

    if (!participant || participant.tandaId !== input.tandaId) {
      throw new NotFoundError("Participant not found in this tanda");
    }

    return this.contributionRepository.listByParticipant(
      input.tandaId,
      input.participantId
    );
  }
}
