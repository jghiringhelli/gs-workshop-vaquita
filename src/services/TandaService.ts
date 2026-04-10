import { v4 as uuidv4 } from 'uuid';
import { Tanda, Participant } from '../models';
import {
  ITandaRepository,
  IParticipantRepository,
  IUserRepository,
} from '../repositories/interfaces';
import { NotFoundError, ConflictError, ForbiddenError, BusinessRuleError } from '../errors';
import { config } from '../config/env';

export interface CreateTandaInput {
  name: string;
  organizerId: string;
  contributionAmount: number;
}

export class TandaService {
  constructor(
    private readonly tandaRepository: ITandaRepository,
    private readonly participantRepository: IParticipantRepository,
    private readonly userRepository: IUserRepository,
  ) {}

  createTanda(input: CreateTandaInput): Tanda {
    const organizer = this.userRepository.findById(input.organizerId);
    if (!organizer) throw new NotFoundError('User', input.organizerId);

    const tanda = this.tandaRepository.create({
      id: uuidv4(),
      name: input.name,
      organizerId: input.organizerId,
      contributionAmount: input.contributionAmount,
      status: 'forming',
      currentRound: 0,
      totalRounds: 0,
    });

    // Rule 3: organizer is automatically the first participant
    this.participantRepository.create({
      id: uuidv4(),
      userId: input.organizerId,
      tandaId: tanda.id,
      role: 'organizer',
      rotationPosition: null,
      isDefaulter: false,
      consecutiveMissed: 0,
    });

    return tanda;
  }

  getTanda(id: string): Tanda {
    const tanda = this.tandaRepository.findById(id);
    if (!tanda) throw new NotFoundError('Tanda', id);
    return tanda;
  }

  listTandas(userId: string): Tanda[] {
    return this.tandaRepository.findByUserId(userId);
  }

  joinTanda(tandaId: string, userId: string): Participant {
    const tanda = this.tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda', tandaId);

    const user = this.userRepository.findById(userId);
    if (!user) throw new NotFoundError('User', userId);

    if (tanda.status !== 'forming') {
      throw new BusinessRuleError('Cannot join a tanda that is not in forming status');
    }

    const existing = this.participantRepository.findByUserAndTanda(userId, tandaId);
    if (existing) throw new ConflictError('User is already a participant in this tanda');

    // Rule 2: max participants
    const count = this.participantRepository.countByTandaId(tandaId);
    if (count >= config.MAX_PARTICIPANTS) {
      throw new BusinessRuleError(
        `Tanda has reached maximum capacity of ${config.MAX_PARTICIPANTS} participants`,
      );
    }

    return this.participantRepository.create({
      id: uuidv4(),
      userId,
      tandaId,
      role: 'member',
      rotationPosition: null,
      isDefaulter: false,
      consecutiveMissed: 0,
    });
  }

  startTanda(tandaId: string, organizerId: string): Tanda {
    const tanda = this.tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda', tandaId);

    // Rule 8: only organizer can start
    if (tanda.organizerId !== organizerId) {
      throw new ForbiddenError('Only the organizer can start the tanda');
    }

    // Rule 10: valid transition
    if (tanda.status !== 'forming') {
      throw new BusinessRuleError(`Cannot start a tanda in '${tanda.status}' status`);
    }

    const participants = this.participantRepository.findByTandaId(tandaId);

    // Rule 1: minimum 3 participants
    if (participants.length < config.MIN_PARTICIPANTS_TO_START) {
      throw new BusinessRuleError(
        `Tanda needs at least ${config.MIN_PARTICIPANTS_TO_START} participants to start. Current: ${participants.length}`,
      );
    }

    // Rule 4: randomize rotation order on FORMING → ACTIVE
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    const rotationUpdates = shuffled.map((p, idx) => ({ id: p.id, rotationPosition: idx + 1 }));
    this.participantRepository.updateRotationPositions(rotationUpdates);

    return this.tandaRepository.update(tandaId, {
      status: 'active',
      currentRound: 1,
      totalRounds: participants.length,
    });
  }

  cancelTanda(tandaId: string, organizerId: string): Tanda {
    const tanda = this.tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda', tandaId);

    if (tanda.organizerId !== organizerId) {
      throw new ForbiddenError('Only the organizer can cancel the tanda');
    }

    // Rule 10: valid transitions — FORMING/ACTIVE → CANCELLED
    if (tanda.status === 'completed' || tanda.status === 'cancelled') {
      throw new BusinessRuleError(`Cannot cancel a tanda in '${tanda.status}' status`);
    }

    return this.tandaRepository.update(tandaId, { status: 'cancelled' });
  }

  listParticipants(tandaId: string): Participant[] {
    const tanda = this.tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda', tandaId);
    return this.participantRepository.findByTandaId(tandaId);
  }

  advanceRound(tandaId: string, organizerId: string): Tanda {
    const tanda = this.tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda', tandaId);

    // Rule 8: only organizer can advance
    if (tanda.organizerId !== organizerId) {
      throw new ForbiddenError('Only the organizer can advance the round');
    }

    if (tanda.status !== 'active') {
      throw new BusinessRuleError(`Cannot advance round for a tanda in '${tanda.status}' status`);
    }

    const nextRound = tanda.currentRound + 1;

    // Rule 9: auto-complete after last round
    if (nextRound > tanda.totalRounds) {
      return this.tandaRepository.update(tandaId, { status: 'completed' });
    }

    return this.tandaRepository.update(tandaId, { currentRound: nextRound });
  }
}
