import { v4 as uuidv4 } from "uuid";
import { LATE_PENALTY_PCT, MAX_CONSECUTIVE_MISSES } from "../config/index.js";
import {
  ConflictError,
  NotFoundError,
  UnprocessableError,
  ValidationError,
} from "../errors/index.js";
import type { IParticipantRepository } from "../participants/participant.repository.js";
import type { ITandaRepository } from "../tandas/tanda.repository.js";
import type { IContributionRepository } from "./contribution.repository.js";
import type {
  ContributionResponseDto,
  RecordContributionDto,
  RoundSummaryDto,
} from "./contribution.types.js";

/** Handles recording contributions, penalties, and round summaries. */
export class ContributionService {
  constructor(
    private readonly contributionRepository: IContributionRepository,
    private readonly tandaRepository: ITandaRepository,
    private readonly participantRepository: IParticipantRepository
  ) {}

  /**
   * Records a contribution for the current round.
   * Applies a 5% late penalty if contributed outside the normal window (future extension point).
   * @param tandaId - The tanda to contribute to.
   * @param dto - The contribution payload.
   * @returns The recorded contribution as a response DTO.
   * @throws UnprocessableError if tanda is not ACTIVE.
   * @throws NotFoundError if the participant is not found.
   * @throws ValidationError if amount does not match the required contribution.
   * @throws ConflictError if the participant has already contributed this round.
   */
  recordContribution(tandaId: string, dto: RecordContributionDto): ContributionResponseDto {
    const tanda = this.tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError("Tanda", tandaId);

    if (tanda.status !== "active") {
      throw new UnprocessableError("Contributions can only be recorded for active tandas");
    }

    const participant = this.participantRepository.findById(dto.participantId);
    if (!participant) throw new NotFoundError("Participant", dto.participantId);

    if (participant.tandaId !== tandaId) {
      throw new ValidationError("Participant does not belong to this tanda");
    }

    const existing = this.contributionRepository.findByParticipantAndRound(
      dto.participantId,
      tanda.currentRound
    );
    if (existing) {
      throw new ConflictError("Participant has already contributed this round");
    }

    if (dto.amount < tanda.contributionAmount) {
      throw new ValidationError(
        `Contribution amount must be at least ${tanda.contributionAmount}`
      );
    }

    const penalty = Math.round(tanda.contributionAmount * LATE_PENALTY_PCT);
    const lateAmount = tanda.contributionAmount + penalty;
    // Determine status by amount: exact = paid on time, amount with penalty = late
    const status: "paid" | "late" = dto.amount >= lateAmount ? "late" : "paid";
    const finalAmount = dto.amount;

    const contribution = {
      id: uuidv4(),
      tandaId,
      participantId: dto.participantId,
      round: tanda.currentRound,
      amount: finalAmount,
      status: status as "paid" | "late",
      createdAt: new Date().toISOString(),
    };

    this.contributionRepository.create(contribution);

    if (status === "paid") {
      this.participantRepository.updateConsecutiveMisses(dto.participantId, 0);
    }

    return this.toResponseDto(contribution);
  }

  /**
   * Returns a summary of all contributions for a specific round.
   * @param tandaId - The tanda UUID.
   * @param round - The round number.
   * @returns The round summary DTO.
   */
  getRoundSummary(tandaId: string, round: number): RoundSummaryDto {
    const tanda = this.tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError("Tanda", tandaId);

    const contributions = this.contributionRepository
      .findByTandaAndRound(tandaId, round)
      .map((c) => this.toResponseDto(c));

    const totalPaid = contributions
      .filter((c) => c.status === "paid" || c.status === "late")
      .reduce((sum, c) => sum + c.amount, 0);

    const participants = this.participantRepository.findByTandaId(tandaId);
    const totalExpected = participants.length * tanda.contributionAmount;

    return { round, contributions, totalPaid, totalExpected };
  }

  /**
   * Returns the full contribution history for a single participant.
   * @param tandaId - The tanda UUID.
   * @param participantId - The participant UUID.
   * @returns Array of contribution response DTOs ordered by round.
   */
  getParticipantHistory(
    tandaId: string,
    participantId: string
  ): ContributionResponseDto[] {
    const tanda = this.tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError("Tanda", tandaId);

    const participant = this.participantRepository.findById(participantId);
    if (!participant) throw new NotFoundError("Participant", participantId);

    if (participant.tandaId !== tandaId) {
      throw new ValidationError("Participant does not belong to this tanda");
    }

    return this.contributionRepository
      .findByParticipantId(participantId)
      .map((c) => this.toResponseDto(c));
  }

  private toResponseDto(contribution: {
    id: string;
    tandaId: string;
    participantId: string;
    round: number;
    amount: number;
    status: string;
    createdAt: string;
  }): ContributionResponseDto {
    return {
      id: contribution.id,
      tandaId: contribution.tandaId,
      participantId: contribution.participantId,
      round: contribution.round,
      amount: contribution.amount,
      status: contribution.status as ContributionResponseDto["status"],
      createdAt: contribution.createdAt,
    };
  }
}
