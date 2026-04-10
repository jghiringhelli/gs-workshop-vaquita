import { v4 as uuidv4 } from "uuid";
import { MAX_CONSECUTIVE_MISSES, MAX_PARTICIPANTS, MIN_PARTICIPANTS } from "../config/index.js";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnprocessableError,
} from "../errors/index.js";
import type { IContributionRepository } from "../contributions/contribution.repository.js";
import type { IParticipantRepository } from "../participants/participant.repository.js";
import type { Participant, ParticipantResponseDto } from "../participants/participant.types.js";
import type { IUserRepository } from "../users/user.repository.js";
import type { ITandaRepository } from "./tanda.repository.js";
import type { CreateTandaDto, Tanda, TandaResponseDto } from "./tanda.types.js";

/** Orchestrates all tanda lifecycle operations. */
export class TandaService {
  constructor(
    private readonly tandaRepository: ITandaRepository,
    private readonly participantRepository: IParticipantRepository,
    private readonly userRepository: IUserRepository,
    private readonly contributionRepository: IContributionRepository
  ) {}

  /**
   * Creates a tanda and auto-joins the organizer as the first participant.
   * @param dto - The tanda creation payload.
   * @returns The created tanda as a response DTO.
   * @throws NotFoundError if the organizer user does not exist.
   */
  create(dto: CreateTandaDto): TandaResponseDto {
    const organizer = this.userRepository.findById(dto.organizerId);
    if (!organizer) throw new NotFoundError("User", dto.organizerId);

    const now = new Date().toISOString();
    const tanda: Tanda = {
      id: uuidv4(),
      name: dto.name.trim(),
      organizerId: dto.organizerId,
      contributionAmount: dto.contributionAmount,
      status: "forming",
      currentRound: 1,
      totalRounds: 0,
      createdAt: now,
    };

    this.tandaRepository.create(tanda);

    const organizerParticipant: Participant = {
      id: uuidv4(),
      userId: dto.organizerId,
      tandaId: tanda.id,
      role: "organizer",
      rotationPosition: null,
      consecutiveMisses: 0,
      isDefaulter: false,
      createdAt: now,
    };
    this.participantRepository.create(organizerParticipant);

    return this.toResponseDto(tanda);
  }

  /**
   * Returns a tanda by ID.
   * @param tandaId - The tanda UUID.
   * @throws NotFoundError if not found.
   */
  findById(tandaId: string): TandaResponseDto {
    const tanda = this.tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError("Tanda", tandaId);
    return this.toResponseDto(tanda);
  }

  /**
   * Returns all tandas in which the given user is a participant.
   * @param userId - The user UUID.
   */
  listByUser(userId: string): TandaResponseDto[] {
    return this.tandaRepository
      .findByUserId(userId)
      .map((t) => this.toResponseDto(t));
  }

  /**
   * Joins a user to a tanda. Tanda must be in FORMING status.
   * @param tandaId - The tanda to join.
   * @param userId - The user joining.
   * @throws NotFoundError if tanda or user does not exist.
   * @throws ConflictError if user is already a participant or tanda is full.
   * @throws UnprocessableError if tanda is not in FORMING status.
   */
  join(tandaId: string, userId: string): ParticipantResponseDto {
    const tanda = this.tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError("Tanda", tandaId);

    const user = this.userRepository.findById(userId);
    if (!user) throw new NotFoundError("User", userId);

    if (tanda.status !== "forming") {
      throw new UnprocessableError("Tanda is not accepting new members");
    }

    const existing = this.participantRepository.findByUserAndTanda(userId, tandaId);
    if (existing) throw new ConflictError("User is already a participant in this tanda");

    const participants = this.participantRepository.findByTandaId(tandaId);
    if (participants.length >= MAX_PARTICIPANTS) {
      throw new ConflictError(`Tanda has reached the maximum of ${MAX_PARTICIPANTS} participants`);
    }

    const participant: Participant = {
      id: uuidv4(),
      userId,
      tandaId,
      role: "member",
      rotationPosition: null,
      consecutiveMisses: 0,
      isDefaulter: false,
      createdAt: new Date().toISOString(),
    };

    this.participantRepository.create(participant);
    return this.toParticipantDto(participant);
  }

  /**
   * Starts a tanda: randomizes rotation order and transitions to ACTIVE.
   * @param tandaId - The tanda to start.
   * @param callerId - The user requesting the start (must be organizer).
   * @throws ForbiddenError if caller is not the organizer.
   * @throws UnprocessableError if fewer than MIN_PARTICIPANTS have joined.
   * @throws ConflictError if tanda is not in FORMING status.
   */
  start(tandaId: string, callerId: string): TandaResponseDto {
    const tanda = this.tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError("Tanda", tandaId);

    if (tanda.organizerId !== callerId) {
      throw new ForbiddenError("Only the organizer can start the tanda");
    }
    if (tanda.status !== "forming") {
      throw new ConflictError(`Tanda cannot be started from status '${tanda.status}'`);
    }

    const participants = this.participantRepository.findByTandaId(tandaId);
    if (participants.length < MIN_PARTICIPANTS) {
      throw new UnprocessableError(
        `At least ${MIN_PARTICIPANTS} participants are required to start`
      );
    }

    const shuffled = this.shuffleArray(participants.map((p) => p.id));
    const positions = new Map(shuffled.map((id, idx) => [id, idx + 1]));
    this.participantRepository.assignRotationPositions(tandaId, positions);

    const updated = this.tandaRepository.update(tandaId, {
      status: "active",
      totalRounds: participants.length,
    });

    return this.toResponseDto(updated);
  }

  /**
   * Cancels a tanda. Only the organizer can cancel.
   * @param tandaId - The tanda to cancel.
   * @param callerId - The user requesting cancellation.
   * @throws ForbiddenError if caller is not the organizer.
   * @throws ConflictError if tanda is already completed.
   */
  cancel(tandaId: string, callerId: string): TandaResponseDto {
    const tanda = this.tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError("Tanda", tandaId);

    if (tanda.organizerId !== callerId) {
      throw new ForbiddenError("Only the organizer can cancel the tanda");
    }
    if (tanda.status === "completed") {
      throw new ConflictError("A completed tanda cannot be cancelled");
    }
    if (tanda.status === "cancelled") {
      throw new ConflictError("Tanda is already cancelled");
    }

    const updated = this.tandaRepository.update(tandaId, { status: "cancelled" });
    return this.toResponseDto(updated);
  }

  /**
   * Advances the tanda to the next round. Auto-completes after the last round.
   * Records missed contributions for all participants who did not pay in the closing round,
   * and increments their consecutiveMisses counter. Participants with
   * consecutiveMisses >= MAX_CONSECUTIVE_MISSES are exposed as defaulters via isDefaulter.
   * @param tandaId - The tanda to advance.
   * @param callerId - The user requesting the advance (must be organizer).
   * @throws ForbiddenError if caller is not the organizer.
   * @throws ConflictError if tanda is not ACTIVE.
   */
  advance(tandaId: string, callerId: string): TandaResponseDto {
    const tanda = this.tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError("Tanda", tandaId);

    if (tanda.organizerId !== callerId) {
      throw new ForbiddenError("Only the organizer can advance the tanda");
    }
    if (tanda.status !== "active") {
      throw new ConflictError(`Tanda cannot be advanced from status '${tanda.status}'`);
    }

    const participants = this.participantRepository.findByTandaId(tandaId);
    const participantIds = participants.map((p) => p.id);

    // Record missed contributions for non-payers in the closing round
    this.contributionRepository.createMissedForRound(tandaId, tanda.currentRound, participantIds);

    // Increment consecutiveMisses for each participant who missed this round
    const closingRoundContributions = this.contributionRepository.findByTandaAndRound(
      tandaId,
      tanda.currentRound
    );
    const missedIds = new Set(
      closingRoundContributions
        .filter((c) => c.status === "missed")
        .map((c) => c.participantId)
    );

    for (const participant of participants) {
      if (missedIds.has(participant.id)) {
        this.participantRepository.updateConsecutiveMisses(
          participant.id,
          participant.consecutiveMisses + 1
        );
      }
    }

    const isLastRound = tanda.currentRound >= tanda.totalRounds;
    const updated = this.tandaRepository.update(tandaId, {
      currentRound: tanda.currentRound + 1,
      status: isLastRound ? "completed" : "active",
    });

    return this.toResponseDto(updated);
  }

  /**
   * Lists all participants in a tanda.
   * @param tandaId - The tanda UUID.
   * @returns Array of participant response DTOs.
   */
  listParticipants(tandaId: string): ParticipantResponseDto[] {
    const tanda = this.tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError("Tanda", tandaId);

    return this.participantRepository
      .findByTandaId(tandaId)
      .map((p) => this.toParticipantDto(p));
  }

  private shuffleArray<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
    }
    return copy;
  }

  private toResponseDto(tanda: Tanda): TandaResponseDto {
    return {
      id: tanda.id,
      name: tanda.name,
      organizerId: tanda.organizerId,
      contributionAmount: tanda.contributionAmount,
      status: tanda.status,
      currentRound: tanda.currentRound,
      totalRounds: tanda.totalRounds,
      createdAt: tanda.createdAt,
    };
  }

  private toParticipantDto(participant: Participant): ParticipantResponseDto {
    return {
      id: participant.id,
      userId: participant.userId,
      tandaId: participant.tandaId,
      role: participant.role,
      rotationPosition: participant.rotationPosition,
      consecutiveMisses: participant.consecutiveMisses,
      isDefaulter: participant.isDefaulter,
      createdAt: participant.createdAt,
    };
  }
}
