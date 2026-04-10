import { AppConfig } from "../config";
import { Contribution, Participant, ParticipantView } from "../domain";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../errors";
import { TandaRepository } from "../repositories/tandaRepository";
import { UserRepository } from "../repositories/userRepository";

const hasTwoConsecutiveMisses = (history: Contribution[]): boolean =>
  history.some((entry, index) => entry.status === "missed" && history[index + 1]?.status === "missed");

export class TandaService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tandaRepository: TandaRepository,
    private readonly config: AppConfig,
    private readonly random: () => number = Math.random,
  ) {}

  createTanda(input: { name: string; organizerId: number; contributionAmount: number }) {
    const organizer = this.userRepository.findById(input.organizerId);
    if (!organizer) {
      throw new NotFoundError("Organizer not found.");
    }

    return this.tandaRepository.runInTransaction(() => {
      const tanda = this.tandaRepository.createTanda(input);
      this.tandaRepository.createParticipant({
        userId: input.organizerId,
        tandaId: tanda.id,
        role: "organizer",
      });
      return this.tandaRepository.updateTandaState({
        tandaId: tanda.id,
        totalRounds: this.tandaRepository.countParticipants(tanda.id),
      });
    });
  }

  listTandasForUser(userId: number) {
    return this.tandaRepository.listTandasForUser(userId);
  }

  getTandaById(tandaId: number) {
    return this.getExistingTanda(tandaId);
  }

  joinTanda(tandaId: number, userId: number) {
    const tanda = this.getExistingTanda(tandaId);
    if (tanda.status !== "forming") {
      throw new ConflictError("Only tandas in forming status can accept new participants.");
    }

    const user = this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found.");
    }

    if (this.tandaRepository.findParticipantByUser(tandaId, userId)) {
      throw new ConflictError("User is already part of this tanda.");
    }

    if (this.tandaRepository.countParticipants(tandaId) >= this.config.maxParticipants) {
      throw new ConflictError("This tanda already reached the maximum participant count.");
    }

    return this.tandaRepository.runInTransaction(() => {
      const participant = this.tandaRepository.createParticipant({
        userId,
        tandaId,
        role: "member",
      });

      this.tandaRepository.updateTandaState({
        tandaId,
        totalRounds: this.tandaRepository.countParticipants(tandaId),
      });

      return participant;
    });
  }

  startTanda(tandaId: number, requesterUserId: number) {
    const tanda = this.getExistingTanda(tandaId);
    if (tanda.status !== "forming") {
      throw new ConflictError("Only tandas in forming status can be started.");
    }

    this.assertOrganizer(tanda.organizerId, requesterUserId);

    const participants = this.tandaRepository.listParticipants(tandaId);
    if (participants.length < 3) {
      throw new ConflictError("A tanda needs at least 3 participants to start.");
    }

    return this.tandaRepository.runInTransaction(() => {
      const shuffledParticipantIds = this.shuffle(participants.map((participant) => participant.id));
      this.tandaRepository.assignRotationPositions(tandaId, shuffledParticipantIds);
      this.tandaRepository.createPendingContributions(tandaId, 1);
      return this.tandaRepository.updateTandaState({
        tandaId,
        status: "active",
        currentRound: 1,
        totalRounds: participants.length,
      });
    });
  }

  cancelTanda(tandaId: number, requesterUserId: number) {
    const tanda = this.getExistingTanda(tandaId);
    this.assertOrganizer(tanda.organizerId, requesterUserId);

    if (tanda.status === "completed" || tanda.status === "cancelled") {
      throw new ConflictError("This tanda can no longer be cancelled.");
    }

    return this.tandaRepository.updateTandaState({
      tandaId,
      status: "cancelled",
    });
  }

  listParticipants(tandaId: number): ParticipantView[] {
    this.getExistingTanda(tandaId);

    return this.tandaRepository.listParticipants(tandaId).map((participant) => ({
      ...participant,
      isDefaulter: this.isDefaulter(tandaId, participant.id),
    }));
  }

  recordContribution(input: {
    tandaId: number;
    participantId: number;
    amount: number;
    isLate: boolean;
  }) {
    const tanda = this.getExistingTanda(input.tandaId);
    if (tanda.status !== "active") {
      throw new ConflictError("Contributions can only be recorded on active tandas.");
    }

    const participant = this.getExistingParticipant(input.tandaId, input.participantId);
    const existingContribution = this.tandaRepository.findContribution(
      input.tandaId,
      participant.id,
      tanda.currentRound,
    );

    if (!existingContribution) {
      throw new ConflictError("The current round is not open for contributions.");
    }

    if (existingContribution.status === "paid" || existingContribution.status === "late") {
      throw new ConflictError("This participant already paid the current round.");
    }

    const penaltyAmount = input.isLate ? Math.ceil(tanda.contributionAmount * this.config.latePenaltyRate) : 0;
    const minimumAmount = tanda.contributionAmount + penaltyAmount;

    if (input.amount < minimumAmount) {
      throw new ValidationError(`Contribution must be at least ${minimumAmount} for this round.`);
    }

    return this.tandaRepository.updateContribution({
      contributionId: existingContribution.id,
      amount: input.amount,
      penaltyAmount,
      status: input.isLate ? "late" : "paid",
      paidAt: new Date().toISOString(),
    });
  }

  getRoundSummary(tandaId: number, round: number) {
    const tanda = this.getExistingTanda(tandaId);

    if (round < 1 || round > tanda.totalRounds) {
      throw new NotFoundError("Round not found.");
    }

    const recipient = this.tandaRepository.getRoundRecipient(tandaId, round);
    const contributions = this.tandaRepository.listRoundContributions(tandaId, round);

    return {
      tandaId,
      round,
      recipient,
      contributions,
      totalCollected: contributions.reduce((sum, contribution) => sum + contribution.amount, 0),
      outstandingCount: contributions.filter((contribution) => contribution.status === "pending").length,
    };
  }

  advanceTanda(tandaId: number, requesterUserId: number) {
    const tanda = this.getExistingTanda(tandaId);
    if (tanda.status !== "active") {
      throw new ConflictError("Only active tandas can advance rounds.");
    }

    this.assertOrganizer(tanda.organizerId, requesterUserId);

    return this.tandaRepository.runInTransaction(() => {
      this.tandaRepository.markPendingContributionsMissed(tandaId, tanda.currentRound);

      if (tanda.currentRound >= tanda.totalRounds) {
        return this.tandaRepository.updateTandaState({
          tandaId,
          status: "completed",
          currentRound: tanda.totalRounds,
        });
      }

      const nextRound = tanda.currentRound + 1;
      this.tandaRepository.createPendingContributions(tandaId, nextRound);
      return this.tandaRepository.updateTandaState({
        tandaId,
        currentRound: nextRound,
      });
    });
  }

  getParticipantHistory(tandaId: number, participantId: number) {
    this.getExistingTanda(tandaId);
    const participant = this.getExistingParticipant(tandaId, participantId);
    const contributions = this.tandaRepository.listParticipantHistory(tandaId, participantId);

    return {
      participant: {
        ...participant,
        isDefaulter: hasTwoConsecutiveMisses(contributions),
      },
      contributions,
    };
  }

  private getExistingTanda(tandaId: number) {
    const tanda = this.tandaRepository.findTandaById(tandaId);
    if (!tanda) {
      throw new NotFoundError("Tanda not found.");
    }

    return tanda;
  }

  private getExistingParticipant(tandaId: number, participantId: number): Participant {
    const participant = this.tandaRepository.findParticipantById(tandaId, participantId);
    if (!participant) {
      throw new NotFoundError("Participant not found.");
    }

    return participant;
  }

  private isDefaulter(tandaId: number, participantId: number): boolean {
    const history = this.tandaRepository.listParticipantHistory(tandaId, participantId);
    return hasTwoConsecutiveMisses(history);
  }

  private assertOrganizer(organizerId: number, requesterUserId: number): void {
    if (organizerId !== requesterUserId) {
      throw new ForbiddenError("Only the organizer can perform this action.");
    }
  }

  private shuffle(values: number[]): number[] {
    const copy = [...values];

    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(this.random() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }

    return copy;
  }
}
