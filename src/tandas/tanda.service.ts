import {
  ConflictError,
  DomainRuleError,
  ForbiddenError,
  NotFoundError,
} from "../errors/app-error";
import { TandaRepository } from "../repositories/tanda.repository";

import {
  type Contribution,
  type CreateTandaInput,
  type Participant,
  type ParticipantHistory,
  type RoundSummary,
  type Tanda,
} from "./tanda.types";

export type ShuffleParticipants = (participants: Participant[]) => Participant[];

interface TandaServiceDependencies {
  tandaRepository: TandaRepository;
  maxParticipants: number;
  latePenaltyPercent: number;
  shuffleParticipants?: ShuffleParticipants;
}

function defaultShuffleParticipants(participants: Participant[]): Participant[] {
  const shuffled = [...participants];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const current = shuffled[index];

    shuffled[index] = shuffled[randomIndex];
    shuffled[randomIndex] = current;
  }

  return shuffled;
}

function calculatePenalty(amount: number, penaltyPercent: number): number {
  return Math.round((amount * penaltyPercent) / 100);
}

function hasTwoConsecutiveMisses(contributions: Contribution[]): boolean {
  let missedStreak = 0;

  for (const contribution of contributions) {
    if (contribution.status === "missed") {
      missedStreak += 1;
      if (missedStreak >= 2) {
        return true;
      }
      continue;
    }

    missedStreak = 0;
  }

  return false;
}

export class TandaService {
  private readonly shuffleParticipants: ShuffleParticipants;

  constructor(private readonly dependencies: TandaServiceDependencies) {
    this.shuffleParticipants = dependencies.shuffleParticipants ?? defaultShuffleParticipants;
  }

  createTanda(input: CreateTandaInput): Tanda {
    if (!this.dependencies.tandaRepository.userExists(input.organizerId)) {
      throw new NotFoundError(`Organizer ${input.organizerId} was not found`);
    }

    return this.dependencies.tandaRepository.runInTransaction(() => {
      const tanda = this.dependencies.tandaRepository.createTanda(input);

      this.dependencies.tandaRepository.createParticipant({
        userId: input.organizerId,
        tandaId: tanda.id,
        role: "organizer",
        rotationPosition: null,
      });

      return this.dependencies.tandaRepository.findTandaById(tanda.id) as Tanda;
    });
  }

  listTandas(userId?: number): Tanda[] {
    return this.dependencies.tandaRepository.listTandas(userId);
  }

  getTandaById(tandaId: number): Tanda {
    const tanda = this.dependencies.tandaRepository.findTandaById(tandaId);

    if (!tanda) {
      throw new NotFoundError(`Tanda ${tandaId} was not found`);
    }

    return tanda;
  }

  listParticipants(tandaId: number): Participant[] {
    this.getTandaById(tandaId);

    const participants = this.dependencies.tandaRepository.listParticipantsByTandaId(tandaId);

    return participants.map((participant) => ({
      ...participant,
      isDefaulter: hasTwoConsecutiveMisses(
        this.dependencies.tandaRepository.listContributionsForParticipant(tandaId, participant.id),
      ),
    }));
  }

  joinTanda(tandaId: number, userId: number): Participant {
    return this.dependencies.tandaRepository.runInTransaction(() => {
      const tanda = this.getTandaById(tandaId);

      if (!this.dependencies.tandaRepository.userExists(userId)) {
        throw new NotFoundError(`User ${userId} was not found`);
      }

      if (tanda.status !== "forming") {
        throw new DomainRuleError("Only tandas in forming status can accept new participants");
      }

      if (this.dependencies.tandaRepository.findParticipantByUserAndTanda(tandaId, userId)) {
        throw new ConflictError(`User ${userId} is already a participant in tanda ${tandaId}`);
      }

      const participantCount = this.dependencies.tandaRepository.countParticipants(tandaId);

      if (participantCount >= this.dependencies.maxParticipants) {
        throw new DomainRuleError(
          `Tanda ${tandaId} already has the maximum of ${this.dependencies.maxParticipants} participants`,
        );
      }

      const participant = this.dependencies.tandaRepository.createParticipant({
        userId,
        tandaId,
        role: "member",
        rotationPosition: null,
      });

      this.dependencies.tandaRepository.updateTandaState({
        id: tanda.id,
        status: tanda.status,
        currentRound: tanda.currentRound,
        totalRounds: participantCount + 1,
      });

      return participant;
    });
  }

  startTanda(tandaId: number, actorUserId: number): Tanda {
    return this.dependencies.tandaRepository.runInTransaction(() => {
      const tanda = this.getTandaById(tandaId);

      if (tanda.organizerId !== actorUserId) {
        throw new ForbiddenError(`User ${actorUserId} is not allowed to start tanda ${tandaId}`);
      }

      if (tanda.status !== "forming") {
        throw new DomainRuleError("Only tandas in forming status can be started");
      }

      const participants = this.dependencies.tandaRepository.listParticipantsByTandaId(tandaId);

      if (participants.length < 3) {
        throw new DomainRuleError("A tanda needs at least 3 participants to start");
      }

      const shuffledParticipants = this.shuffleParticipants(participants);

      this.dependencies.tandaRepository.updateParticipantRotationPositions(
        shuffledParticipants.map((participant, index) => ({
          participantId: participant.id,
          rotationPosition: index + 1,
        })),
      );

      this.dependencies.tandaRepository.updateTandaState({
        id: tanda.id,
        status: "active",
        currentRound: 1,
        totalRounds: participants.length,
      });

      this.dependencies.tandaRepository.createPendingContributions(
        tanda.id,
        1,
        participants.map((participant) => participant.id),
        tanda.contributionAmount,
      );

      return this.dependencies.tandaRepository.findTandaById(tanda.id) as Tanda;
    });
  }

  cancelTanda(tandaId: number, actorUserId: number): Tanda {
    return this.dependencies.tandaRepository.runInTransaction(() => {
      const tanda = this.getTandaById(tandaId);

      if (tanda.organizerId !== actorUserId) {
        throw new ForbiddenError(`User ${actorUserId} is not allowed to cancel tanda ${tandaId}`);
      }

      if (tanda.status !== "forming" && tanda.status !== "active") {
        throw new DomainRuleError("Only tandas in forming or active status can be cancelled");
      }

      this.dependencies.tandaRepository.updateTandaState({
        id: tanda.id,
        status: "cancelled",
        currentRound: tanda.currentRound,
        totalRounds: tanda.totalRounds,
      });

      return this.dependencies.tandaRepository.findTandaById(tanda.id) as Tanda;
    });
  }

  recordContribution(tandaId: number, input: { participantId: number; isLate: boolean }): Contribution {
    return this.dependencies.tandaRepository.runInTransaction(() => {
      const tanda = this.getTandaById(tandaId);

      if (tanda.status !== "active") {
        throw new DomainRuleError("Contributions can only be recorded while a tanda is active");
      }

      const participant = this.dependencies.tandaRepository.findParticipantById(input.participantId);

      if (!participant || participant.tandaId !== tandaId) {
        throw new NotFoundError(`Participant ${input.participantId} was not found in tanda ${tandaId}`);
      }

      const contribution = this.dependencies.tandaRepository.findContributionByParticipantAndRound(
        participant.id,
        tanda.currentRound,
      );

      if (!contribution) {
        throw new NotFoundError(
          `Contribution for participant ${participant.id} in round ${tanda.currentRound} was not found`,
        );
      }

      if (contribution.status !== "pending") {
        throw new ConflictError(
          `Contribution for participant ${participant.id} in round ${tanda.currentRound} is already ${contribution.status}`,
        );
      }

      return this.dependencies.tandaRepository.updateContributionStatus({
        id: contribution.id,
        status: input.isLate ? "late" : "paid",
        penaltyAmount: input.isLate
          ? calculatePenalty(tanda.contributionAmount, this.dependencies.latePenaltyPercent)
          : 0,
      });
    });
  }

  getRoundSummary(tandaId: number, round: number): RoundSummary {
    const tanda = this.getTandaById(tandaId);

    if (round > tanda.totalRounds) {
      throw new NotFoundError(`Round ${round} was not found in tanda ${tandaId}`);
    }

    const recipient = this.dependencies.tandaRepository.findRecipientByRound(tandaId, round);
    const contributions = this.dependencies.tandaRepository.listContributionsForRound(tandaId, round);

    return {
      tandaId,
      round,
      recipientParticipantId: recipient?.id ?? null,
      contributions,
    };
  }

  advanceRound(tandaId: number, actorUserId: number): Tanda {
    return this.dependencies.tandaRepository.runInTransaction(() => {
      const tanda = this.getTandaById(tandaId);

      if (tanda.organizerId !== actorUserId) {
        throw new ForbiddenError(`User ${actorUserId} is not allowed to advance tanda ${tandaId}`);
      }

      if (tanda.status !== "active") {
        throw new DomainRuleError("Only active tandas can advance rounds");
      }

      this.dependencies.tandaRepository.markPendingContributionsAsMissed(tandaId, tanda.currentRound);

      if (tanda.currentRound >= tanda.totalRounds) {
        this.dependencies.tandaRepository.updateTandaState({
          id: tanda.id,
          status: "completed",
          currentRound: tanda.totalRounds,
          totalRounds: tanda.totalRounds,
        });

        return this.dependencies.tandaRepository.findTandaById(tanda.id) as Tanda;
      }

      const nextRound = tanda.currentRound + 1;
      const participants = this.dependencies.tandaRepository.listParticipantsByTandaId(tandaId);

      this.dependencies.tandaRepository.updateTandaState({
        id: tanda.id,
        status: "active",
        currentRound: nextRound,
        totalRounds: tanda.totalRounds,
      });

      this.dependencies.tandaRepository.createPendingContributions(
        tanda.id,
        nextRound,
        participants.map((participant) => participant.id),
        tanda.contributionAmount,
      );

      return this.dependencies.tandaRepository.findTandaById(tanda.id) as Tanda;
    });
  }

  getParticipantHistory(tandaId: number, participantId: number): ParticipantHistory {
    this.getTandaById(tandaId);

    const participant = this.dependencies.tandaRepository.findParticipantById(participantId);

    if (!participant || participant.tandaId !== tandaId) {
      throw new NotFoundError(`Participant ${participantId} was not found in tanda ${tandaId}`);
    }

    const contributions = this.dependencies.tandaRepository.listContributionsForParticipant(tandaId, participantId);

    return {
      tandaId,
      participantId,
      isDefaulter: hasTwoConsecutiveMisses(contributions),
      contributions,
    };
  }
}
