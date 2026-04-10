import type { AuthenticatedUser } from "../auth/auth.types";
import type { AppConfig } from "../config/env";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../errors/app-error";
import type { Contribution, CreateTandaInput, Participant, RotationAssignment, Tanda } from "./tanda.types";
import { TandasRepository } from "./tandas.repository";

export interface CreateTandaRequest {
  name: string;
  contributionAmount: number;
  organizerId?: number;
}

export interface RoundSummary {
  tandaId: number;
  round: number;
  recipient: Participant;
  contributions: Contribution[];
  totalCollected: number;
  expectedTotal: number;
  pendingCount: number;
}

export class TandasService {
  constructor(
    private readonly tandasRepository: TandasRepository,
    private readonly config: AppConfig,
  ) {}

  createTanda(authUser: AuthenticatedUser, input: CreateTandaRequest): Tanda {
    if (input.organizerId !== undefined && input.organizerId !== authUser.id) {
      throw new ForbiddenError("Authenticated user does not match organizerId");
    }

    const tandaInput: CreateTandaInput = {
      name: input.name,
      contributionAmount: input.contributionAmount,
      organizerId: authUser.id,
    };

    return this.tandasRepository.createTanda(tandaInput);
  }

  listTandas(authUser: AuthenticatedUser, requestedUserId?: number): Tanda[] {
    const userId = requestedUserId ?? authUser.id;

    if (userId !== authUser.id) {
      throw new ForbiddenError("You can only list tandas for the authenticated user");
    }

    return this.tandasRepository.listByUserId(userId);
  }

  getTanda(authUser: AuthenticatedUser, tandaId: number): Tanda {
    const tanda = this.requireTanda(tandaId);

    this.ensureParticipant(authUser.id, tandaId);

    return tanda;
  }

  joinTanda(authUser: AuthenticatedUser, tandaId: number): Participant {
    const tanda = this.requireTanda(tandaId);

    if (tanda.status !== "forming") {
      throw new BadRequestError("Only forming tandas can accept new participants");
    }

    if (this.tandasRepository.findParticipantByUserId(tandaId, authUser.id)) {
      throw new ConflictError("Authenticated user is already a participant in this tanda");
    }

    if (this.tandasRepository.countParticipants(tandaId) >= this.config.limits.maxParticipants) {
      throw new ConflictError(`Tanda ${tandaId} already has the maximum number of participants`);
    }

    return this.tandasRepository.addMember(tandaId, authUser.id);
  }

  startTanda(authUser: AuthenticatedUser, tandaId: number): Tanda {
    const tanda = this.requireTanda(tandaId);

    this.ensureOrganizer(authUser.id, tanda);

    if (tanda.status !== "forming") {
      throw new BadRequestError("Only forming tandas can be started");
    }

    const participants = this.tandasRepository.listParticipants(tandaId);

    if (participants.length < 3) {
      throw new BadRequestError("A tanda needs at least 3 participants to start");
    }

    const shuffledParticipants = shuffle([...participants]);
    const assignments: RotationAssignment[] = shuffledParticipants.map((participant, index) => ({
      participantId: participant.id,
      rotationPosition: index + 1,
    }));

    return this.tandasRepository.startTanda(tandaId, tanda.contributionAmount, assignments);
  }

  cancelTanda(authUser: AuthenticatedUser, tandaId: number): Tanda {
    const tanda = this.requireTanda(tandaId);

    this.ensureOrganizer(authUser.id, tanda);

    if (tanda.status !== "forming" && tanda.status !== "active") {
      throw new BadRequestError("Only forming or active tandas can be cancelled");
    }

    return this.tandasRepository.cancelTanda(tandaId);
  }

  listParticipants(authUser: AuthenticatedUser, tandaId: number): Participant[] {
    this.requireTanda(tandaId);
    this.ensureParticipant(authUser.id, tandaId);

    return this.tandasRepository.listParticipants(tandaId);
  }

  recordContribution(authUser: AuthenticatedUser, tandaId: number): Contribution {
    const tanda = this.requireTanda(tandaId);

    if (tanda.status !== "active" || tanda.currentRound <= 0) {
      throw new BadRequestError("Only active tandas can receive contributions");
    }

    const participant = this.ensureParticipant(authUser.id, tandaId);
    const contribution = this.tandasRepository.findContribution(tandaId, participant.id, tanda.currentRound);

    if (!contribution) {
      throw new NotFoundError(`Contribution for round ${tanda.currentRound} was not found`);
    }

    if (contribution.status !== "pending") {
      throw new ConflictError("Current round contribution has already been recorded");
    }

    const isLate = isContributionLate(tanda.currentRoundStartedAt, this.config.limits.contributionWindowDays);
    const penaltyAmount = isLate
      ? calculatePenalty(tanda.contributionAmount, this.config.penalties.lateContributionPercent)
      : 0;
    const totalAmount = roundMoney(tanda.contributionAmount + penaltyAmount);

    return this.tandasRepository.recordContribution(
      tandaId,
      participant.id,
      tanda.currentRound,
      isLate ? "late" : "paid",
      penaltyAmount,
      totalAmount,
    );
  }

  getRoundSummary(authUser: AuthenticatedUser, tandaId: number, round: number): RoundSummary {
    const tanda = this.requireTanda(tandaId);

    this.ensureParticipant(authUser.id, tandaId);

    if (round > tanda.totalRounds || round <= 0) {
      throw new NotFoundError(`Round ${round} was not found for tanda ${tandaId}`);
    }

    const participants = this.tandasRepository.listParticipants(tandaId);
    const recipient = participants.find((participant) => participant.rotationPosition === round);

    if (!recipient) {
      throw new NotFoundError(`Recipient for round ${round} was not found`);
    }

    const contributions = this.tandasRepository.listRoundContributions(tandaId, round);

    return {
      tandaId,
      round,
      recipient,
      contributions,
      totalCollected: roundMoney(
        contributions.reduce((total, contribution) => {
          if (contribution.status === "paid" || contribution.status === "late") {
            return total + contribution.totalAmount;
          }

          return total;
        }, 0),
      ),
      expectedTotal: roundMoney(tanda.contributionAmount * participants.length),
      pendingCount: contributions.filter((contribution) => contribution.status === "pending").length,
    };
  }

  advanceRound(authUser: AuthenticatedUser, tandaId: number): Tanda {
    const tanda = this.requireTanda(tandaId);

    this.ensureOrganizer(authUser.id, tanda);

    if (tanda.status !== "active" || tanda.currentRound <= 0) {
      throw new BadRequestError("Only active tandas can advance rounds");
    }

    return this.tandasRepository.advanceRound(tanda, this.tandasRepository.listParticipants(tandaId));
  }

  getParticipantHistory(authUser: AuthenticatedUser, tandaId: number, participantId: number): Contribution[] {
    this.requireTanda(tandaId);
    this.ensureParticipant(authUser.id, tandaId);

    const participant = this.tandasRepository.findParticipantById(participantId);

    if (!participant || participant.tandaId !== tandaId) {
      throw new NotFoundError(`Participant ${participantId} was not found in tanda ${tandaId}`);
    }

    return this.tandasRepository.listParticipantContributionHistory(tandaId, participantId);
  }

  private requireTanda(tandaId: number): Tanda {
    const tanda = this.tandasRepository.findById(tandaId);

    if (!tanda) {
      throw new NotFoundError(`Tanda ${tandaId} was not found`);
    }

    return tanda;
  }

  private ensureParticipant(userId: number, tandaId: number): Participant {
    const participant = this.tandasRepository.findParticipantByUserId(tandaId, userId);

    if (!participant) {
      throw new ForbiddenError("Only participants can access this tanda");
    }

    return participant;
  }

  private ensureOrganizer(userId: number, tanda: Tanda): void {
    if (tanda.organizerId !== userId) {
      throw new ForbiddenError("Only the organizer can perform this action");
    }
  }
}

function shuffle<T>(values: T[]): T[] {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const current = values[index];

    values[index] = values[randomIndex];
    values[randomIndex] = current;
  }

  return values;
}

function isContributionLate(currentRoundStartedAt: string | null, windowDays: number): boolean {
  if (!currentRoundStartedAt) {
    return false;
  }

  const startedAt = new Date(currentRoundStartedAt);
  const windowEndsAt = new Date(startedAt.getTime() + windowDays * 24 * 60 * 60 * 1000);

  return Date.now() > windowEndsAt.getTime();
}

function calculatePenalty(baseAmount: number, penaltyPercent: number): number {
  return roundMoney(baseAmount * (penaltyPercent / 100));
}

function roundMoney(amount: number): number {
  return Number(amount.toFixed(2));
}
