import type { AppConfig } from "../config/env";
import type { Participant, Tanda } from "../domain/models";
import { getDatabase } from "../db/database";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../errors/app-error";
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

export class TandaService {
  constructor(
    private readonly tandaRepository: TandaRepository,
    private readonly userRepository: UserRepository,
    private readonly participantRepository: ParticipantRepository,
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
}
