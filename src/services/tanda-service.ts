import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../errors/app-error";
import type { AppConfig } from "../config/env";
import type { Tanda, Participant, Contribution } from "../domain/models";
import type { TandaRepository } from "../repositories/tanda-repository";
import type { UserRepository } from "../repositories/user-repository";
import type { ParticipantRepository } from "../repositories/participant-repository";
import type { ContributionRepository } from "../repositories/contribution-repository";
import { runInTransaction } from "../db/database";

export interface CreateTandaInput {
  name: string;
  organizerId: number;
  contributionAmount: number;
}

export interface ListTandasInput {
  userId: number;
}

/**
 * Service for tanda lifecycle and business rules.
 */
export class TandaService {
  constructor(
    private readonly tandaRepository: TandaRepository,
    private readonly userRepository: UserRepository,
    private readonly participantRepository: ParticipantRepository,
    private readonly contributionRepository: ContributionRepository,
    private readonly config: AppConfig,
  ) {}

  /**
   * Creates a tanda and auto-joins the organizer as first participant.
   * @param input - name, organizerId, contributionAmount
   * @returns created Tanda
   */
  createTanda(input: CreateTandaInput): Tanda {
    const organizer = this.userRepository.findById(input.organizerId);
    if (!organizer) throw new NotFoundError(`User ${input.organizerId} not found`);

    return runInTransaction(() => {
      const tanda = this.tandaRepository.create(
        input.name,
        input.organizerId,
        input.contributionAmount,
      );
      this.participantRepository.create(tanda.id, input.organizerId, "organizer");
      return tanda;
    });
  }

  /**
   * Returns all tandas for a given user.
   * @param userId - user id
   * @returns Tanda[]
   */
  listTandasForUser(userId: number): Tanda[] {
    const user = this.userRepository.findById(userId);
    if (!user) throw new NotFoundError(`User ${userId} not found`);
    return this.tandaRepository.findByUserId(userId);
  }

  /**
   * Returns a tanda by id, throwing 404 if not found.
   * @param id - tanda id
   * @returns Tanda
   */
  getTandaById(id: number): Tanda {
    const tanda = this.tandaRepository.findById(id);
    if (!tanda) throw new NotFoundError(`Tanda ${id} not found`);
    return tanda;
  }

  /**
   * Lists participants for a tanda.
   * @param tandaId - tanda id
   * @returns Participant[]
   */
  listParticipants(tandaId: number): Participant[] {
    this.getTandaById(tandaId);
    return this.participantRepository.findByTandaId(tandaId);
  }

  /**
   * Adds a user to a forming tanda.
   * @param tandaId - tanda id
   * @param userId - user id to add
   * @returns created Participant
   */
  joinTanda(input: { tandaId: number; userId: number }): Participant {
    const tanda = this.getTandaById(input.tandaId);
    if (tanda.status !== "forming") throw new ConflictError("Tanda is not open for joining");

    const user = this.userRepository.findById(input.userId);
    if (!user) throw new NotFoundError(`User ${input.userId} not found`);

    const existing = this.participantRepository.findByTandaAndUser(input.tandaId, input.userId);
    if (existing) throw new ConflictError("User already in this tanda");

    const current = this.participantRepository.findByTandaId(input.tandaId);
    if (current.length >= this.config.maxParticipants) {
      throw new ValidationError(`Tanda is full (max ${this.config.maxParticipants})`);
    }

    return this.participantRepository.create(input.tandaId, input.userId, "member");
  }

  /**
   * Starts a tanda: randomises rotation, transitions to ACTIVE. Organizer only.
   * @param tandaId - tanda id
   * @param organizerId - must be the organizer
   * @returns updated Tanda
   */
  startTanda(input: { tandaId: number; organizerId: number }): Tanda {
    const tanda = this.getTandaById(input.tandaId);
    if (tanda.organizerId !== input.organizerId) throw new ForbiddenError("Only organizer can start");
    if (tanda.status !== "forming") throw new ConflictError("Tanda is not in forming state");

    const participants = this.participantRepository.findByTandaId(input.tandaId);
    if (participants.length < 3) throw new ValidationError("Need at least 3 participants to start");

    return runInTransaction(() => {
      // Fisher-Yates shuffle for rotation order
      const shuffled = [...participants];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      shuffled.forEach((p, idx) => {
        this.participantRepository.update(p.id, { rotationPosition: idx + 1 });
      });

      return this.tandaRepository.update(input.tandaId, {
        status: "active",
        currentRound: 1,
        totalRounds: participants.length,
      })!;
    });
  }

  /**
   * Cancels a tanda. Organizer only. Cannot cancel a completed tanda.
   * @param tandaId - tanda id
   * @param organizerId - must be the organizer
   * @returns updated Tanda
   */
  cancelTanda(input: { tandaId: number; organizerId: number }): Tanda {
    const tanda = this.getTandaById(input.tandaId);
    if (tanda.organizerId !== input.organizerId) throw new ForbiddenError("Only organizer can cancel");
    if (tanda.status === "completed") throw new ConflictError("Cannot cancel a completed tanda");
    if (tanda.status === "cancelled") throw new ConflictError("Tanda is already cancelled");

    return this.tandaRepository.update(input.tandaId, { status: "cancelled" })!;
  }

  /**
   * Records a contribution for a participant in the current round.
   * @param tandaId - tanda id
   * @param participantId - participant id
   * @param actorUserId - authenticated user performing the action
   * @param isLate - whether the contribution is late (applies penalty)
   * @returns created Contribution
   */
  recordContribution(input: {
    tandaId: number;
    participantId: number;
    actorUserId: number;
    isLate?: boolean;
  }): Contribution {
    const tanda = this.getTandaById(input.tandaId);
    if (tanda.status !== "active") throw new ConflictError("Tanda is not active");

    const participant = this.participantRepository.findById(input.participantId);
    if (!participant || participant.tandaId !== input.tandaId) {
      throw new NotFoundError("Participant not found in this tanda");
    }
    if (participant.userId !== input.actorUserId) {
      throw new ForbiddenError("Can only record your own contribution");
    }

    const existing = this.contributionRepository.findByParticipantAndRound(
      input.participantId,
      tanda.currentRound,
    );
    if (existing) throw new ConflictError("Already contributed this round");

    const status = input.isLate ? "late" : "paid";
    const penalty = input.isLate
      ? Math.round(tanda.contributionAmount * (this.config.latePenaltyPercent / 100))
      : 0;
    const amount = tanda.contributionAmount + penalty;

    return this.contributionRepository.create(
      input.tandaId,
      input.participantId,
      tanda.currentRound,
      amount,
      status,
    );
  }

  /**
   * Returns a summary of contributions for a given round.
   * @param tandaId - tanda id
   * @param round - round number
   * @returns object with round number, contributions and totals
   */
  getRoundSummary(input: { tandaId: number; round: number }) {
    const tanda = this.getTandaById(input.tandaId);
    if (input.round < 1 || input.round > tanda.totalRounds) {
      throw new ValidationError(`Round ${input.round} does not exist`);
    }
    const contributions = this.contributionRepository.findByTandaAndRound(
      input.tandaId,
      input.round,
    );
    return { round: input.round, tandaId: input.tandaId, contributions };
  }

  /**
   * Advances to the next round. Auto-records missed contributions. Organizer only.
   * Flags defaulters (2 consecutive misses). Auto-completes after last round.
   * @param tandaId - tanda id
   * @param organizerId - must be the organizer
   * @returns updated Tanda
   */
  advanceRound(input: { tandaId: number; organizerId: number }): Tanda {
    const tanda = this.getTandaById(input.tandaId);
    if (tanda.organizerId !== input.organizerId) throw new ForbiddenError("Only organizer can advance");
    if (tanda.status !== "active") throw new ConflictError("Tanda is not active");

    return runInTransaction(() => {
      const participants = this.participantRepository.findByTandaId(input.tandaId);

      // Auto-record missed contributions and update defaulter state
      for (const p of participants) {
        const contribution = this.contributionRepository.findByParticipantAndRound(
          p.id,
          tanda.currentRound,
        );
        if (!contribution) {
          this.contributionRepository.create(
            input.tandaId,
            p.id,
            tanda.currentRound,
            tanda.contributionAmount,
            "missed",
          );
          const newMisses = p.consecutiveMisses + 1;
          this.participantRepository.update(p.id, {
            consecutiveMisses: newMisses,
            isDefaulter: newMisses >= 2,
          });
        } else {
          // Reset streak on paid/late
          if (contribution.status !== "missed") {
            this.participantRepository.update(p.id, { consecutiveMisses: 0 });
          }
        }
      }

      const isLastRound = tanda.currentRound >= tanda.totalRounds;
      if (isLastRound) {
        return this.tandaRepository.update(input.tandaId, { status: "completed" })!;
      }

      return this.tandaRepository.update(input.tandaId, {
        currentRound: tanda.currentRound + 1,
      })!;
    });
  }

  /**
   * Returns contribution history for a specific participant.
   * @param tandaId - tanda id
   * @param participantId - participant id
   * @returns Contribution[]
   */
  getParticipantHistory(input: { tandaId: number; participantId: number }): Contribution[] {
    this.getTandaById(input.tandaId);
    const participant = this.participantRepository.findById(input.participantId);
    if (!participant || participant.tandaId !== input.tandaId) {
      throw new NotFoundError("Participant not found in this tanda");
    }
    return this.contributionRepository.findByParticipantId(input.participantId);
  }
}
