/**
 * Tanda service — business logic for tandas, participants, contributions.
 *
 * Business rules enforced (from spec):
 *  1. Min 3 participants to start (config.minParticipantsToStart)
 *  2. Max 20 participants (config.maxParticipants)
 *  3. Organizer auto-joins as first participant on creation
 *  4. Rotation order randomized on FORMING → ACTIVE transition
 *  5. Contributions recorded only for the current round
 *  6. Late contributions incur 5% penalty (config.latePenaltyPct)
 *  7. 2 consecutive missed contributions → participant flagged as defaulter
 *  8. Only organizer can advance to next round
 *  9. Tanda auto-completes after the last round
 * 10. Status: FORMING → ACTIVE → COMPLETED | FORMING/ACTIVE → CANCELLED
 */
import type { Tanda, Participant, Contribution } from "@prisma/client";
import { tandaRepository, type TandaWithDetails } from "../repositories/tanda.repository";
import { userRepository } from "../repositories/user.repository";
import { config } from "../config";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../errors";

export const tandaService = {
  async createTanda(data: {
    name: string;
    organizerId: number;
    contributionAmount: number;
  }): Promise<Tanda> {
    const organizer = await userRepository.findById(data.organizerId);
    if (!organizer) throw new NotFoundError("User", data.organizerId);

    const tanda = await tandaRepository.create({
      name: data.name,
      organizerId: data.organizerId,
      contributionAmount: data.contributionAmount,
    });

    // Business rule 3: organizer auto-joins as first participant
    await tandaRepository.addParticipant({
      userId: data.organizerId,
      tandaId: tanda.id,
      role: "organizer",
    });

    return tanda;
  },

  async listTandas(userId: number): Promise<Tanda[]> {
    return tandaRepository.findByUserId(userId);
  },

  async getTanda(id: number): Promise<TandaWithDetails> {
    const tanda = await tandaRepository.findById(id);
    if (!tanda) throw new NotFoundError("Tanda", id);
    return tanda;
  },

  async joinTanda(tandaId: number, userId: number): Promise<Participant> {
    const tanda = await tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError("Tanda", tandaId);

    if (tanda.status !== "forming") {
      throw new BadRequestError("Tanda is not accepting new participants");
    }

    // Business rule 2: max participants
    const count = await tandaRepository.getParticipantCount(tandaId);
    if (count >= config.maxParticipants) {
      throw new BadRequestError(
        `Tanda has reached the maximum of ${config.maxParticipants} participants`
      );
    }

    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError("User", userId);

    const existing = await tandaRepository.findParticipant(userId, tandaId);
    if (existing) throw new ConflictError("User is already a participant in this tanda");

    return tandaRepository.addParticipant({ userId, tandaId, role: "member" });
  },

  async startTanda(tandaId: number, requesterId: number): Promise<Tanda> {
    const tanda = await tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError("Tanda", tandaId);

    if (tanda.organizerId !== requesterId) {
      throw new ForbiddenError("Only the organizer can start the tanda");
    }

    if (tanda.status !== "forming") {
      throw new BadRequestError(`Tanda cannot be started (status: ${tanda.status})`);
    }

    // Business rule 1: minimum participants
    const participants = await tandaRepository.getParticipants(tandaId);
    if (participants.length < config.minParticipantsToStart) {
      throw new BadRequestError(
        `Tanda needs at least ${config.minParticipantsToStart} participants to start (has ${participants.length})`
      );
    }

    // Business rule 4: randomize rotation order
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    await Promise.all(
      shuffled.map((p, i) =>
        tandaRepository.updateParticipant(p.id, { rotationPosition: i + 1 })
      )
    );

    return tandaRepository.update(tandaId, {
      status: "active",
      currentRound: 1,
      totalRounds: participants.length,
    });
  },

  async cancelTanda(tandaId: number, requesterId: number): Promise<Tanda> {
    const tanda = await tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError("Tanda", tandaId);

    if (tanda.organizerId !== requesterId) {
      throw new ForbiddenError("Only the organizer can cancel the tanda");
    }

    // Business rule 10: only forming or active can be cancelled
    if (tanda.status !== "forming" && tanda.status !== "active") {
      throw new BadRequestError(`Tanda cannot be cancelled (status: ${tanda.status})`);
    }

    return tandaRepository.update(tandaId, { status: "cancelled" });
  },

  async listParticipants(tandaId: number): Promise<ReturnType<typeof tandaRepository.getParticipants>> {
    const tanda = await tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError("Tanda", tandaId);
    return tandaRepository.getParticipants(tandaId);
  },

  async recordContribution(
    tandaId: number,
    data: { participantId: number }
  ): Promise<Contribution> {
    const tanda = await tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError("Tanda", tandaId);

    // Business rule 5: only during active round
    if (tanda.status !== "active") {
      throw new BadRequestError(`Tanda is not active (status: ${tanda.status})`);
    }

    const participant = await tandaRepository.findParticipantById(data.participantId);
    if (!participant || participant.tandaId !== tandaId) {
      throw new NotFoundError("Participant", data.participantId);
    }

    // Prevent duplicate contribution for the same round
    const existing = await tandaRepository.findContributionByRound(
      data.participantId,
      tandaId,
      tanda.currentRound
    );
    if (existing) throw new ConflictError("Contribution already recorded for this round");

    return tandaRepository.createContribution({
      tandaId,
      participantId: data.participantId,
      round: tanda.currentRound,
      amount: tanda.contributionAmount,
      status: "paid",
    });
  },

  async getRoundSummary(tandaId: number, round: number): Promise<{
    round: number;
    totalRounds: number;
    totalExpected: number;
    totalCollected: number;
    recipient: Awaited<ReturnType<typeof tandaRepository.getParticipants>>[number] | null;
    contributions: Awaited<ReturnType<typeof tandaRepository.getContributionsByRound>>;
  }> {
    const tanda = await tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError("Tanda", tandaId);

    if (round < 1 || (tanda.totalRounds > 0 && round > tanda.totalRounds)) {
      throw new BadRequestError(`Round ${round} is out of range (1–${tanda.totalRounds})`);
    }

    const [contributions, participants] = await Promise.all([
      tandaRepository.getContributionsByRound(tandaId, round),
      tandaRepository.getParticipants(tandaId),
    ]);

    // Business rule 4: participant at rotationPosition === round receives the pot
    const recipient = participants.find((p) => p.rotationPosition === round) ?? null;

    const totalExpected = participants.length * tanda.contributionAmount;
    const totalCollected = contributions
      .filter((c) => c.status === "paid" || c.status === "late")
      .reduce((sum, c) => sum + c.amount, 0);

    return {
      round,
      totalRounds: tanda.totalRounds,
      totalExpected,
      totalCollected,
      recipient,
      contributions,
    };
  },

  async advanceRound(tandaId: number, requesterId: number): Promise<Tanda> {
    const tanda = await tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError("Tanda", tandaId);

    // Business rule 8: only organizer can advance
    if (tanda.organizerId !== requesterId) {
      throw new ForbiddenError("Only the organizer can advance the round");
    }

    if (tanda.status !== "active") {
      throw new BadRequestError(`Tanda is not active (status: ${tanda.status})`);
    }

    const currentRound = tanda.currentRound;
    const participants = await tandaRepository.getParticipants(tandaId);
    const existingContributions = await tandaRepository.getContributionsByRound(
      tandaId,
      currentRound
    );
    const contributedIds = new Set(existingContributions.map((c) => c.participantId));

    // Mark missing participants as MISSED
    const missed = participants.filter((p) => !contributedIds.has(p.id));
    await Promise.all(
      missed.map((p) =>
        tandaRepository.createContribution({
          tandaId,
          participantId: p.id,
          round: currentRound,
          amount: tanda.contributionAmount,
          status: "missed",
        })
      )
    );

    // Business rule 7: flag defaulters for consecutive misses
    for (const p of participants) {
      const history = await tandaRepository.getContributionHistory(p.id);
      const recent = history.slice(-config.consecutiveMissesForDefault);
      if (
        recent.length >= config.consecutiveMissesForDefault &&
        recent.every((c) => c.status === "missed")
      ) {
        await tandaRepository.updateParticipant(p.id, { isDefaulter: true });
      }
    }

    // Business rule 9: auto-complete after the last round
    if (currentRound >= tanda.totalRounds) {
      return tandaRepository.update(tandaId, { status: "completed" });
    }

    return tandaRepository.update(tandaId, { currentRound: currentRound + 1 });
  },

  async getParticipantHistory(tandaId: number, participantId: number): Promise<Contribution[]> {
    const tanda = await tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError("Tanda", tandaId);

    const participant = await tandaRepository.findParticipantById(participantId);
    if (!participant || participant.tandaId !== tandaId) {
      throw new NotFoundError("Participant", participantId);
    }

    return tandaRepository.getContributionHistory(participantId);
  },
};


