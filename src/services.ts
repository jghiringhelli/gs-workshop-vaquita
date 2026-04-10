import {
  userRepository,
  tandaRepository,
  participantRepository,
  contributionRepository,
} from "./repositories";
import {
  User,
  Tanda,
  Participant,
  Contribution,
  TandaStatus,
  Round,
} from "./types";
import {
  NotFoundError,
  ForbiddenError,
  InvalidStateError,
  InvalidOperationError,
  ConflictError,
} from "./errors";
import config from "./config";


/**
 * Service layer - business logic, orchestration, rule enforcement
 */

// ============= USER SERVICE =============
export const userService = {
  createUser(email: string, name: string): User {
    // Check if user already exists
    if (userRepository.getByEmail(email)) {
      throw new ConflictError(`User with email ${email} already exists`);
    }
    return userRepository.create(email, name);
  },

  getUserById(id: string): User {
    const user = userRepository.getById(id);
    if (!user) {
      throw new NotFoundError("User", id);
    }
    return user;
  },

  getUserByEmail(email: string): User {
    const user = userRepository.getByEmail(email);
    if (!user) {
      throw new NotFoundError("User", email);
    }
    return user;
  },

  listUsers(): User[] {
    return userRepository.list();
  },
};

// ============= TANDA SERVICE =============
export const tandaService = {
  createTanda(
    name: string,
    organizerId: string,
    contributionAmount: number,
    totalRounds: number = 0
  ): Tanda {
    // Verify organizer exists
    if (!userRepository.getById(organizerId)) {
      throw new NotFoundError("User", organizerId);
    }

    // Create tanda
    const tanda = tandaRepository.create(
      name,
      organizerId,
      contributionAmount,
      totalRounds
    );

    // Auto-join organizer as first participant
    participantRepository.create(organizerId, tanda.id, "organizer", 0);

    return tanda;
  },

  getTandaById(id: string): Tanda {
    const tanda = tandaRepository.getById(id);
    if (!tanda) {
      throw new NotFoundError("Tanda", id);
    }
    return tanda;
  },

  getTandasForUser(userId: string): Tanda[] {
    // Verify user exists
    if (!userRepository.getById(userId)) {
      throw new NotFoundError("User", userId);
    }
    return tandaRepository.listByUserId(userId);
  },

  getAllTandas(): Tanda[] {
    return tandaRepository.list();
  },

  joinTanda(tandaId: string, userId: string): Participant {
    const tanda = tandaRepository.getById(tandaId);
    if (!tanda) {
      throw new NotFoundError("Tanda", tandaId);
    }

    // Verify user exists
    if (!userRepository.getById(userId)) {
      throw new NotFoundError("User", userId);
    }

    // Check if already a member
    if (participantRepository.getByUserAndTanda(userId, tandaId)) {
      throw new ConflictError("User is already a member of this tanda");
    }

    // Check if tanda is still in forming state
    if (tanda.status !== "forming") {
      throw new InvalidStateError("Tanda is not in forming state");
    }

    // Get current participant count
    const participants = participantRepository.listByTandaId(tandaId);
    if (participants.length >= config.tanda.maxParticipants) {
      throw new InvalidOperationError("Tanda is at maximum capacity");
    }

    // Add participant
    return participantRepository.create(userId, tandaId, "member");
  },

  startTanda(tandaId: string, organizerId: string): Tanda {
    const tanda = tandaRepository.getById(tandaId);
    if (!tanda) {
      throw new NotFoundError("Tanda", tandaId);
    }

    // Verify organizer
    if (tanda.organizerId !== organizerId) {
      throw new ForbiddenError("Only the organizer can start the tanda");
    }

    // Check state
    if (tanda.status !== "forming") {
      throw new InvalidStateError("Tanda is not in forming state");
    }

    // Check minimum participants
    const participants = participantRepository.listByTandaId(tandaId);
    if (participants.length < config.tanda.minParticipants) {
      throw new InvalidOperationError(
        `Minimum ${config.tanda.minParticipants} participants required to start`
      );
    }

    // Set total rounds to number of participants if not set
    if (tanda.totalRounds === 0) {
      tandaRepository.updateTotalRounds(tandaId, participants.length);
    }

    // Randomize rotation order
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    shuffled.forEach((p, index) => {
      participantRepository.updateRotationPosition(p.id, index);
    });

    // Initialize contributions for first round
    participants.forEach((p) => {
      contributionRepository.create(
        tandaId,
        p.id,
        1,
        tanda.contributionAmount,
        "pending"
      );
    });

    // Update status
    tandaRepository.updateStatus(tandaId, "active");

    return tandaRepository.getById(tandaId)!;
  },

  cancelTanda(tandaId: string, organizerId: string): Tanda {
    const tanda = tandaRepository.getById(tandaId);
    if (!tanda) {
      throw new NotFoundError("Tanda", tandaId);
    }

    // Verify organizer
    if (tanda.organizerId !== organizerId) {
      throw new ForbiddenError("Only the organizer can cancel the tanda");
    }

    // Check if already completed or cancelled
    if (tanda.status === "completed" || tanda.status === "cancelled") {
      throw new InvalidStateError(
        `Cannot cancel a ${tanda.status} tanda`
      );
    }

    tandaRepository.updateStatus(tandaId, "cancelled");
    return tandaRepository.getById(tandaId)!;
  },

  advanceToNextRound(tandaId: string, organizerId: string): Tanda {
    const tanda = tandaRepository.getById(tandaId);
    if (!tanda) {
      throw new NotFoundError("Tanda", tandaId);
    }

    // Verify organizer
    if (tanda.organizerId !== organizerId) {
      throw new ForbiddenError(
        "Only the organizer can advance the tanda"
      );
    }

    // Check state
    if (tanda.status !== "active") {
      throw new InvalidStateError("Tanda is not active");
    }

    // Check if already at final round
    if (tanda.currentRound >= tanda.totalRounds) {
      throw new InvalidOperationError(
        "Tanda has completed all rounds"
      );
    }

    // Advance round
    tandaRepository.advanceRound(tandaId);

    // Initialize contributions for next round
    const participants = participantRepository.listByTandaId(tandaId);
    const nextRound = tanda.currentRound + 1;
    participants.forEach((p) => {
      contributionRepository.create(
        tandaId,
        p.id,
        nextRound,
        tanda.contributionAmount,
        "pending"
      );
    });

    // Check if this was the last round and auto-complete
    if (nextRound > tanda.totalRounds) {
      tandaRepository.updateStatus(tandaId, "completed");
    }

    return tandaRepository.getById(tandaId)!;
  },
};

// ============= PARTICIPANT SERVICE =============
export const participantService = {
  getParticipantById(id: string): Participant {
    const participant = participantRepository.getById(id);
    if (!participant) {
      throw new NotFoundError("Participant", id);
    }
    return participant;
  },

  getParticipantsByTandasId(tandaId: string): Participant[] {
    // Verify tanda exists
    if (!tandaRepository.getById(tandaId)) {
      throw new NotFoundError("Tanda", tandaId);
    }
    return participantRepository.listByTandaId(tandaId);
  },

  getParticipantHistory(
    participantId: string
  ): Array<Contribution & { roundNumber: number }> {
    // Verify participant exists
    if (!participantRepository.getById(participantId)) {
      throw new NotFoundError("Participant", participantId);
    }

    const contributions = contributionRepository.getHistoryByParticipant(
      participantId
    );
    return contributions.map((c) => ({
      ...c,
      roundNumber: c.round,
    }));
  },
};

// ============= CONTRIBUTION SERVICE =============
export const contributionService = {
  recordContribution(
    tandaId: string,
    participantId: string,
    amount: number
  ): Contribution {
    const tanda = tandaRepository.getById(tandaId);
    if (!tanda) {
      throw new NotFoundError("Tanda", tandaId);
    }

    const participant = participantRepository.getById(participantId);
    if (!participant) {
      throw new NotFoundError("Participant", participantId);
    }

    // Check if participant belongs to tanda
    if (participant.tandaId !== tandaId) {
      throw new ForbiddenError("Participant does not belong to this tanda");
    }

    // Check tanda status
    if (tanda.status !== "active") {
      throw new InvalidStateError("Tanda is not active");
    }

    // Get or create contribution record for current round
    let contribution = contributionRepository.getByParticipantAndRound(
      participantId,
      tandaId,
      tanda.currentRound
    );

    if (!contribution) {
      throw new NotFoundError(
        "Contribution record for current round"
      );
    }

    // Update status to paid
    const now = new Date().toISOString();
    contributionRepository.updateStatus(
      contribution.id,
      "paid",
      now
    );

    return contributionRepository.getById(contribution.id)!;
  },

  getRoundSummary(tandaId: string, round: number): Round {
    const tanda = tandaRepository.getById(tandaId);
    if (!tanda) {
      throw new NotFoundError("Tanda", tandaId);
    }

    const participants = participantRepository.listByTandaId(tandaId);
    const contributions = contributionRepository.getByRound(tandaId, round);

    // Find recipient (participant with this rotation position)
    const recipient = participants.find((p) => p.rotationPosition === round % participants.length);

    let totalPaid = 0;
    let totalLate = 0;
    let totalMissed = 0;

    contributions.forEach((c) => {
      if (c.status === "paid") totalPaid += c.amount;
      else if (c.status === "late") totalLate += c.amount * (1 + config.tanda.lateFeePercent);
      else if (c.status === "missed") totalMissed += 0;
    });

    return {
      tandaId,
      round,
      recipientParticipantId: recipient?.id || "",
      startedAt: new Date().toISOString(),
      completedAt: null,
      totalCollected: totalPaid + totalLate,
      totalPending: tanda.contributionAmount * participants.length - totalPaid - totalLate,
      totalPaid,
      totalLate,
      totalMissed,
    };
  },
};
