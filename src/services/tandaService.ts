import { tandaRepository, Tanda } from '../repositories/tandaRepository';
import { participantRepository } from '../repositories/participantRepository';
import { contributionRepository } from '../repositories/contributionRepository';
import { userRepository } from '../repositories/userRepository';
import { config } from '../config';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnprocessableError,
  ValidationError,
} from '../errors';

function getTandaOrThrow(id: string): Tanda {
  const tanda = tandaRepository.findById(id);
  if (!tanda) throw new NotFoundError('Tanda');
  return tanda;
}

export const tandaService = {
  createTanda(name: string, organizerId: string, contributionAmount: number) {
    if (!name || !organizerId || !contributionAmount) {
      throw new ValidationError('name, organizerId and contributionAmount are required');
    }
    if (contributionAmount <= 0) throw new ValidationError('contributionAmount must be positive');
    const user = userRepository.findById(organizerId);
    if (!user) throw new NotFoundError('Organizer user');

    const tanda = tandaRepository.create(name, organizerId, contributionAmount);
    participantRepository.create(organizerId, tanda.id, 'organizer');
    return tanda;
  },

  listTandas(userId?: string): Tanda[] {
    if (userId) return tandaRepository.findByUserId(userId);
    return tandaRepository.findAll();
  },

  getTandaById(id: string): Tanda {
    return getTandaOrThrow(id);
  },

  joinTanda(tandaId: string, userId: string) {
    const tanda = getTandaOrThrow(tandaId);
    if (tanda.status !== 'forming') throw new ConflictError('Tanda is not in forming status');

    const user = userRepository.findById(userId);
    if (!user) throw new NotFoundError('User');

    const existing = participantRepository.findByUserAndTanda(userId, tandaId);
    if (existing) throw new ConflictError('User is already a participant');

    const count = participantRepository.countByTanda(tandaId);
    if (count >= config.maxParticipants) {
      throw new ConflictError(`Tanda is full (max ${config.maxParticipants} participants)`);
    }

    return participantRepository.create(userId, tandaId, 'member');
  },

  startTanda(tandaId: string, requesterId: string) {
    const tanda = getTandaOrThrow(tandaId);
    if (tanda.status !== 'forming') throw new ConflictError('Tanda is not in forming status');
    if (tanda.organizer_id !== requesterId) throw new ForbiddenError('Only the organizer can start the tanda');

    const participants = participantRepository.findByTanda(tandaId);
    if (participants.length < config.minParticipants) {
      throw new ValidationError(`At least ${config.minParticipants} participants required to start`);
    }

    // Randomize rotation order
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    const positions = shuffled.map((p, i) => ({ id: p.id, position: i + 1 }));
    participantRepository.assignRotation(tandaId, positions);

    tandaRepository.setTotalRounds(tandaId, participants.length);
    tandaRepository.updateRound(tandaId, 1);
    tandaRepository.updateStatus(tandaId, 'active');

    return tandaRepository.findById(tandaId)!;
  },

  cancelTanda(tandaId: string, requesterId: string) {
    const tanda = getTandaOrThrow(tandaId);
    if (tanda.status === 'completed' || tanda.status === 'cancelled') {
      throw new ConflictError('Tanda is already completed or cancelled');
    }
    if (tanda.organizer_id !== requesterId) throw new ForbiddenError('Only the organizer can cancel the tanda');
    tandaRepository.updateStatus(tandaId, 'cancelled');
    return tandaRepository.findById(tandaId)!;
  },

  advanceRound(tandaId: string, requesterId: string) {
    const tanda = getTandaOrThrow(tandaId);
    if (tanda.status !== 'active') throw new UnprocessableError('Tanda is not active');
    if (tanda.organizer_id !== requesterId) throw new ForbiddenError('Only the organizer can advance rounds');

    const participants = participantRepository.findByTanda(tandaId);

    // Record missing contributions as missed
    for (const p of participants) {
      const existing = contributionRepository.findByParticipantAndRound(p.id, tanda.current_round);
      if (!existing) {
        contributionRepository.create(tandaId, p.id, tanda.current_round, 0, 'missed');
        participantRepository.incrementConsecutiveMisses(p.id);
        const updated = participantRepository.findById(p.id)!;
        if (updated.consecutive_misses >= config.consecutiveMissesThreshold) {
          participantRepository.flagDefaulter(p.id);
        }
      } else if (existing.status === 'paid' || existing.status === 'late') {
        participantRepository.resetConsecutiveMisses(p.id);
      }
    }

    const nextRound = tanda.current_round + 1;

    if (nextRound > tanda.total_rounds) {
      tandaRepository.updateStatus(tandaId, 'completed');
    } else {
      tandaRepository.updateRound(tandaId, nextRound);
    }

    return tandaRepository.findById(tandaId)!;
  },

  getParticipants(tandaId: string) {
    getTandaOrThrow(tandaId);
    return participantRepository.findByTanda(tandaId);
  },

  getStats(tandaId: string) {
    const tanda = getTandaOrThrow(tandaId);
    const participants = participantRepository.findByTanda(tandaId);
    const contributions = contributionRepository.findByTanda(tandaId);

    const paidContributions = contributions.filter(c => c.status === 'paid' || c.status === 'late');
    const totalCollected = paidContributions.reduce((sum, c) => sum + c.amount, 0);

    const totalExpected = tanda.total_rounds > 0
      ? tanda.current_round * participants.length * tanda.contribution_amount
      : 0;
    const totalPending = Math.max(0, totalExpected - totalCollected);

    const completionPercentage = tanda.total_rounds > 0
      ? Math.round((tanda.current_round - 1) / tanda.total_rounds * 100)
      : 0;

    const participantsSummary = participants.map(p => {
      const pContribs = contributions.filter(c => c.participant_id === p.id);
      const user = userRepository.findById(p.user_id);
      return {
        participantId: p.id,
        userId: p.user_id,
        name: user?.name ?? 'Unknown',
        role: p.role,
        rotationPosition: p.rotation_position,
        isDefaulter: Boolean(p.is_defaulter),
        paid: pContribs.filter(c => c.status === 'paid').length,
        late: pContribs.filter(c => c.status === 'late').length,
        missed: pContribs.filter(c => c.status === 'missed').length,
      };
    });

    return {
      totalRounds: tanda.total_rounds,
      currentRound: tanda.current_round,
      status: tanda.status,
      totalParticipants: participants.length,
      totalCollected,
      totalPending,
      completionPercentage,
      participantsSummary,
    };
  },
};
