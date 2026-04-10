import { ConflictError, ForbiddenError, NotFoundError } from "../../errors/app-error";

import {
  ContributionRecord,
  ParticipantRecord,
  RoundSummary,
  TandaRecord,
  TandasRepository,
} from "./tandas.repository";

type CreateTandaInput = {
  name: string;
  organizerId: number;
  contributionAmount: number;
};

export class TandasService {
  public constructor(private readonly tandasRepository: TandasRepository) {}

  public createTanda(input: CreateTandaInput): TandaRecord {
    if (!this.tandasRepository.userExists(input.organizerId)) {
      throw new NotFoundError(`Organizer ${input.organizerId} was not found.`);
    }

    return this.tandasRepository.create(input);
  }

  public listTandasForUser(userId: number): TandaRecord[] {
    if (!this.tandasRepository.userExists(userId)) {
      throw new NotFoundError(`User ${userId} was not found.`);
    }

    return this.tandasRepository.findAllForUser(userId);
  }

  public getTandaById(id: number): TandaRecord {
    const tanda = this.tandasRepository.findById(id);

    if (!tanda) {
      throw new NotFoundError(`Tanda ${id} was not found.`);
    }

    return tanda;
  }

  public joinTanda(id: number, userId: number): ParticipantRecord {
    const tanda = this.tandasRepository.findById(id);
    if (!tanda) {
      throw new NotFoundError(`Tanda ${id} was not found.`);
    }

    if (!this.tandasRepository.userExists(userId)) {
      throw new NotFoundError(`User ${userId} was not found.`);
    }

    return this.tandasRepository.joinTanda(id, userId);
  }

  public listParticipants(id: number): ParticipantRecord[] {
    const tanda = this.tandasRepository.findById(id);
    if (!tanda) {
      throw new NotFoundError(`Tanda ${id} was not found.`);
    }

    return this.tandasRepository.listParticipants(id);
  }

  public startTanda(id: number, organizerId: number): TandaRecord {
    const tanda = this.requireOrganizerAction(id, organizerId);

    if (tanda.status !== "forming") {
      throw new ConflictError("Only tandas in forming status can be started.");
    }

    const participants = this.tandasRepository.listParticipants(id);
    if (participants.length < 3) {
      throw new ConflictError("A tanda needs at least 3 participants to start.");
    }

    const shuffledParticipants = shuffleParticipants(participants);
    return this.tandasRepository.startTanda(
      id,
      shuffledParticipants.map((participant) => participant.id),
    );
  }

  public cancelTanda(id: number, organizerId: number): TandaRecord {
    const tanda = this.requireOrganizerAction(id, organizerId);

    if (tanda.status !== "forming" && tanda.status !== "active") {
      throw new ConflictError("Only tandas in forming or active status can be cancelled.");
    }

    return this.tandasRepository.cancelTanda(id);
  }

  public advanceTanda(id: number, organizerId: number): TandaRecord {
    const tanda = this.requireOrganizerAction(id, organizerId);

    if (tanda.status !== "active") {
      throw new ConflictError("Only active tandas can advance rounds.");
    }

    return this.tandasRepository.advanceTanda(id);
  }

  public recordContribution(id: number, participantId: number, paidAt?: string): ContributionRecord {
    const tanda = this.tandasRepository.findStateById(id);
    if (!tanda) {
      throw new NotFoundError(`Tanda ${id} was not found.`);
    }

    if (tanda.status !== "active") {
      throw new ConflictError("Contributions can only be recorded for active tandas.");
    }

    const participant = this.tandasRepository.findParticipant(id, participantId);
    if (!participant) {
      throw new NotFoundError(`Participant ${participantId} was not found in tanda ${id}.`);
    }

    const normalizedPaidAt = paidAt ?? new Date().toISOString();
    return this.tandasRepository.recordContribution(id, participantId, normalizedPaidAt);
  }

  public getRoundSummary(id: number, round: number): RoundSummary {
    const tanda = this.tandasRepository.findById(id);
    if (!tanda) {
      throw new NotFoundError(`Tanda ${id} was not found.`);
    }

    if (round <= 0 || round > tanda.totalRounds) {
      throw new NotFoundError(`Round ${round} was not found for tanda ${id}.`);
    }

    return this.tandasRepository.getRoundSummary(id, round);
  }

  public getParticipantHistory(id: number, participantId: number): ContributionRecord[] {
    const tanda = this.tandasRepository.findById(id);
    if (!tanda) {
      throw new NotFoundError(`Tanda ${id} was not found.`);
    }

    const participant = this.tandasRepository.findParticipant(id, participantId);
    if (!participant) {
      throw new NotFoundError(`Participant ${participantId} was not found in tanda ${id}.`);
    }

    return this.tandasRepository.getParticipantHistory(id, participantId);
  }

  private requireOrganizerAction(id: number, organizerId: number): TandaRecord {
    const tanda = this.tandasRepository.findById(id);
    if (!tanda) {
      throw new NotFoundError(`Tanda ${id} was not found.`);
    }

    if (!this.tandasRepository.userExists(organizerId)) {
      throw new NotFoundError(`User ${organizerId} was not found.`);
    }

    if (tanda.organizerId !== organizerId) {
      throw new ForbiddenError("Only the organizer can perform this action.");
    }

    return tanda;
  }
}

export const tandasService = new TandasService(new TandasRepository());

function shuffleParticipants(participants: ParticipantRecord[]): ParticipantRecord[] {
  const shuffled = [...participants];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const current = shuffled[index];
    shuffled[index] = shuffled[randomIndex];
    shuffled[randomIndex] = current;
  }

  return shuffled;
}