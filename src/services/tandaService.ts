import { z } from 'zod';
import { TandaRepository } from '../repositories/tandaRepository';
import { ParticipantRepository } from '../repositories/participantRepository';
import { ContributionRepository } from '../repositories/contributionRepository';
import { UserRepository } from '../repositories/userRepository';
import { NotFoundError, ValidationError, ForbiddenError, ConflictError } from '../errors';
import { config } from '../config';

const CreateTandaSchema = z.object({
  name: z.string().min(1),
  organizerId: z.string().uuid(),
  contributionAmount: z.number().positive(),
});

const JoinTandaSchema = z.object({
  userId: z.string().uuid(),
});

const RecordContributionSchema = z.object({
  participantId: z.string().uuid(),
  amount: z.number().positive(),
});

export class TandaService {
  constructor(
    private tandaRepo: TandaRepository,
    private participantRepo: ParticipantRepository,
    private contributionRepo: ContributionRepository,
    private userRepo: UserRepository,
  ) {}

  createTanda(data: unknown) {
    const result = CreateTandaSchema.safeParse(data);
    if (!result.success) {
      throw new ValidationError(result.error.errors.map(e => e.message).join(', '));
    }
    const { name, organizerId, contributionAmount } = result.data;
    const organizer = this.userRepo.findById(organizerId);
    if (!organizer) throw new NotFoundError('Organizer user not found');
    const tanda = this.tandaRepo.create({ name, organizerId, contributionAmount });
    // Auto-add organizer as first participant
    this.participantRepo.create({ userId: organizerId, tandaId: tanda.id, role: 'organizer' });
    return tanda;
  }

  listTandas(userId?: string) {
    return this.tandaRepo.findAll(userId);
  }

  getTanda(id: string) {
    const tanda = this.tandaRepo.findById(id);
    if (!tanda) throw new NotFoundError('Tanda not found');
    return tanda;
  }

  joinTanda(tandaId: string, data: unknown) {
    const result = JoinTandaSchema.safeParse(data);
    if (!result.success) {
      throw new ValidationError(result.error.errors.map(e => e.message).join(', '));
    }
    const { userId } = result.data;
    const tanda = this.tandaRepo.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda not found');
    if (tanda.status !== 'forming') throw new ConflictError('Tanda is not in forming status');
    const count = this.participantRepo.countByTandaId(tandaId);
    if (count >= config.maxParticipants) throw new ConflictError('Tanda is full');
    const existing = this.participantRepo.findByUserAndTanda(userId, tandaId);
    if (existing) throw new ConflictError('User already joined this tanda');
    const user = this.userRepo.findById(userId);
    if (!user) throw new NotFoundError('User not found');
    return this.participantRepo.create({ userId, tandaId, role: 'member' });
  }

  startTanda(tandaId: string, organizerId: string) {
    const tanda = this.tandaRepo.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda not found');
    if (tanda.organizerId !== organizerId) throw new ForbiddenError('Only organizer can start the tanda');
    if (tanda.status !== 'forming') throw new ConflictError('Tanda is not in forming status');
    const participants = this.participantRepo.findByTandaId(tandaId);
    if (participants.length < 3) throw new ValidationError('At least 3 participants required to start');
    // Randomize rotation positions
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    shuffled.forEach((p, i) => {
      this.participantRepo.updateRotationPosition(p.id, i + 1);
    });
    const totalRounds = participants.length;
    this.tandaRepo.updateTotalRounds(tandaId, totalRounds);
    this.tandaRepo.updateStatus(tandaId, 'active');
    return this.tandaRepo.findById(tandaId);
  }

  cancelTanda(tandaId: string, organizerId: string) {
    const tanda = this.tandaRepo.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda not found');
    if (tanda.organizerId !== organizerId) throw new ForbiddenError('Only organizer can cancel the tanda');
    if (tanda.status === 'completed') throw new ConflictError('Cannot cancel a completed tanda');
    if (tanda.status === 'cancelled') throw new ConflictError('Tanda is already cancelled');
    this.tandaRepo.updateStatus(tandaId, 'cancelled');
    return this.tandaRepo.findById(tandaId);
  }

  listParticipants(tandaId: string) {
    const tanda = this.tandaRepo.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda not found');
    return this.participantRepo.findByTandaId(tandaId);
  }

  recordContribution(tandaId: string, data: unknown) {
    const result = RecordContributionSchema.safeParse(data);
    if (!result.success) {
      throw new ValidationError(result.error.errors.map(e => e.message).join(', '));
    }
    const { participantId, amount } = result.data;
    const tanda = this.tandaRepo.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda not found');
    if (tanda.status !== 'active') throw new ConflictError('Tanda is not active');
    const participant = this.participantRepo.findById(participantId);
    if (!participant || participant.tandaId !== tandaId) throw new NotFoundError('Participant not found in this tanda');
    const existing = this.contributionRepo.findByParticipantAndRound(participantId, tanda.currentRound);
    if (existing && (existing.status === 'paid' || existing.status === 'late')) {
      throw new ConflictError('Contribution already recorded for this round');
    }
    // Check if late (amount less than required)
    let finalAmount = amount;
    let status: 'paid' | 'late' = 'paid';
    if (amount < tanda.contributionAmount) {
      // Late payment — apply penalty
      finalAmount = amount * (1 + config.latePenaltyPct);
      status = 'late';
    }
    return this.contributionRepo.create({
      tandaId,
      participantId,
      round: tanda.currentRound,
      amount: finalAmount,
      status,
    });
  }

  getRoundSummary(tandaId: string, round: number) {
    const tanda = this.tandaRepo.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda not found');
    const contributions = this.contributionRepo.findByTandaAndRound(tandaId, round);
    // Who receives the pot in this round (participant with rotationPosition === round)
    const participants = this.participantRepo.findByTandaId(tandaId);
    const recipient = participants.find(p => p.rotationPosition === round) ?? null;
    return { round, contributions, recipient };
  }

  advanceRound(tandaId: string, organizerId: string) {
    const tanda = this.tandaRepo.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda not found');
    if (tanda.organizerId !== organizerId) throw new ForbiddenError('Only organizer can advance the round');
    if (tanda.status !== 'active') throw new ConflictError('Tanda is not active');
    const participants = this.participantRepo.findByTandaId(tandaId);
    // Mark unpaid contributions as missed
    for (const p of participants) {
      const existing = this.contributionRepo.findByParticipantAndRound(p.id, tanda.currentRound);
      if (!existing) {
        this.contributionRepo.create({
          tandaId,
          participantId: p.id,
          round: tanda.currentRound,
          amount: 0,
          status: 'missed',
        });
      }
      // Check consecutive missed → flag defaulter
      const missedCount = this.contributionRepo.getConsecutiveMissedCount(p.id, tanda.currentRound);
      if (missedCount >= 2) {
        this.participantRepo.updateDefaulterStatus(p.id, true);
      }
    }
    const nextRound = tanda.currentRound + 1;
    if (nextRound > tanda.totalRounds) {
      this.tandaRepo.updateStatus(tandaId, 'completed');
      this.tandaRepo.updateCurrentRound(tandaId, nextRound);
    } else {
      this.tandaRepo.updateCurrentRound(tandaId, nextRound);
    }
    return this.tandaRepo.findById(tandaId);
  }

  getParticipantHistory(tandaId: string, participantId: string) {
    const tanda = this.tandaRepo.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda not found');
    const participant = this.participantRepo.findById(participantId);
    if (!participant || participant.tandaId !== tandaId) throw new NotFoundError('Participant not found in this tanda');
    return this.contributionRepo.findByParticipant(participantId);
  }
}
