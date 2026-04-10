import { tandaRepository } from "../repositories/tandaRepository";
import { participantRepository } from "../repositories/participantRepository";
import { userRepository } from "../repositories/userRepository";
import { contributionRepository } from "../repositories/contributionRepository";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../errors";
import { config } from "../config";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const tandaService = {
  // Rule 3: organizer auto-joins on creation
  create(data: {
    name: string;
    organizerId: string;
    contributionAmount: number;
  }) {
    const organizer = userRepository.findById(data.organizerId);
    if (!organizer) throw new NotFoundError("User", data.organizerId);

    const tanda = tandaRepository.create(data);

    participantRepository.create({
      userId: data.organizerId,
      tandaId: tanda.id,
      role: "organizer",
    });

    return tanda;
  },

  getById(id: string) {
    const tanda = tandaRepository.findById(id);
    if (!tanda) throw new NotFoundError("Tanda", id);
    return tanda;
  },

  listByUser(userId: string) {
    const user = userRepository.findById(userId);
    if (!user) throw new NotFoundError("User", userId);
    return tandaRepository.findByUserId(userId);
  },

  // Rules 2 & 10: max participants, must be forming, no duplicate join
  join(tandaId: string, userId: string) {
    const tanda = tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError("Tanda", tandaId);

    if (tanda.status !== "forming") {
      throw new ValidationError(
        "Can only join a tanda that is in 'forming' status",
      );
    }

    const user = userRepository.findById(userId);
    if (!user) throw new NotFoundError("User", userId);

    const existing = participantRepository.findByUserAndTanda(userId, tandaId);
    if (existing) {
      throw new ConflictError("User is already a participant in this tanda");
    }

    const count = participantRepository.countByTandaId(tandaId);
    if (count >= config.maxParticipants) {
      throw new ConflictError(
        `Tanda is full (max ${config.maxParticipants} participants)`,
      );
    }

    return participantRepository.create({ userId, tandaId, role: "member" });
  },

  // Rules 1, 4, 8, 10: min 3, organizer-only, randomize rotation, forming→active
  start(tandaId: string, requestingUserId: string) {
    const tanda = tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError("Tanda", tandaId);

    if (tanda.status !== "forming") {
      throw new ValidationError(
        "Can only start a tanda that is in 'forming' status",
      );
    }

    const requester = participantRepository.findByUserAndTanda(
      requestingUserId,
      tandaId,
    );
    if (!requester || requester.role !== "organizer") {
      throw new ForbiddenError("Only the organizer can start a tanda");
    }

    const participants = participantRepository.findByTandaId(tandaId);
    if (participants.length < config.minParticipants) {
      throw new ValidationError(
        `A tanda needs at least ${config.minParticipants} participants to start (currently ${participants.length})`,
      );
    }

    // Rule 4: randomize rotation order
    const shuffled = shuffle(participants);
    for (let i = 0; i < shuffled.length; i++) {
      participantRepository.updateRotationPosition(shuffled[i].id, i + 1);
    }

    const totalRounds = participants.length;
    tandaRepository.updateRound(tandaId, 1, totalRounds);
    tandaRepository.updateStatus(tandaId, "active");

    return tandaRepository.findById(tandaId)!;
  },

  // Rules 8, 10: organizer-only, forming/active → cancelled
  cancel(tandaId: string, requestingUserId: string) {
    const tanda = tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError("Tanda", tandaId);

    if (tanda.status === "completed" || tanda.status === "cancelled") {
      throw new ValidationError(
        `Cannot cancel a tanda with status '${tanda.status}'`,
      );
    }

    const requester = participantRepository.findByUserAndTanda(
      requestingUserId,
      tandaId,
    );
    if (!requester || requester.role !== "organizer") {
      throw new ForbiddenError("Only the organizer can cancel a tanda");
    }

    tandaRepository.updateStatus(tandaId, "cancelled");
    return tandaRepository.findById(tandaId)!;
  },

  listParticipants(tandaId: string) {
    const tanda = tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError("Tanda", tandaId);
    return participantRepository.findByTandaId(tandaId);
  },

  getRoundSummary(tandaId: string, round: number) {
    const tanda = tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError("Tanda", tandaId);

    if (round < 1 || round > tanda.totalRounds) {
      throw new NotFoundError(`Round ${round} in tanda`, tandaId);
    }

    const participants = participantRepository.findByTandaId(tandaId);
    const contributions = contributionRepository.findByTandaAndRound(
      tandaId,
      round,
    );

    return { round, tanda, participants, contributions };
  },

  // Rules 8, 9, 10: organizer-only, auto-complete after last round
  advanceRound(tandaId: string, requestingUserId: string) {
    const tanda = tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError("Tanda", tandaId);

    if (tanda.status !== "active") {
      throw new ValidationError(
        "Can only advance a tanda that is in 'active' status",
      );
    }

    const requester = participantRepository.findByUserAndTanda(
      requestingUserId,
      tandaId,
    );
    if (!requester || requester.role !== "organizer") {
      throw new ForbiddenError("Only the organizer can advance the round");
    }

    const nextRound = tanda.currentRound + 1;

    // Rule 9: auto-complete after last round
    if (nextRound > tanda.totalRounds) {
      tandaRepository.updateStatus(tandaId, "completed");
    } else {
      tandaRepository.advanceRound(tandaId, nextRound);
    }

    return tandaRepository.findById(tandaId)!;
  },
};
