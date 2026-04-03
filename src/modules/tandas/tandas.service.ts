import { config } from '../../shared/config';
import {
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../shared/exceptions';
import { TandasRepository, TandaRow } from './tandas.repository';
import { ParticipantsRepository, ParticipantRow } from './participants.repository';
import { ContributionsRepository, ContributionRow } from './contributions.repository';
import { CreateTandaDto, RecordContributionDto } from './tandas.schema';

/** Shuffles an array in-place using Fisher-Yates and returns it. */
const shuffleInPlace = <T>(arr: T[]): T[] => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export interface RoundSummary {
  round: number;
  tanda: TandaRow;
  recipientParticipant: ParticipantRow | null;
  contributions: ContributionRow[];
  totalCollected: number;
  expectedTotal: number;
}

/**
 * Service layer for all tanda operations.
 * Orchestrates repositories; contains all business rules.
 */
export const createTandasService = (
  tandasRepo: TandasRepository,
  participantsRepo: ParticipantsRepository,
  contributionsRepo: ContributionsRepository,
) => ({
  /** Create a new tanda and auto-enroll the organizer as participant. */
  create(dto: CreateTandaDto, organizerId: string): TandaRow {
    const tanda = tandasRepo.insert({
      name: dto.name,
      organizerId,
      contributionAmount: dto.contributionAmount,
      totalRounds: dto.totalRounds,
    });
    participantsRepo.insert({ userId: organizerId, tandaId: tanda.id, role: 'organizer' });
    return tanda;
  },

  /** Return tandas filtered by userId (participant), or all tandas if no userId. */
  list(userId?: string): TandaRow[] {
    if (userId) return tandasRepo.findByUserId(userId);
    return tandasRepo.findAll();
  },

  /** Return a tanda by id or throw. */
  getById(id: string): TandaRow {
    const tanda = tandasRepo.findById(id);
    if (!tanda) throw new NotFoundError('Tanda', id);
    return tanda;
  },

  /** Join a tanda (must be FORMING and not already a member). */
  join(tandaId: string, userId: string): ParticipantRow {
    const tanda = tandasRepo.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda', tandaId);
    if (tanda.status !== 'forming') {
      throw new BusinessRuleError('Can only join a tanda in FORMING status');
    }

    const existing = participantsRepo.findByTandaAndUser(tandaId, userId);
    if (existing) throw new ConflictError('User is already a participant in this tanda');

    const current = participantsRepo.findByTandaId(tandaId);
    if (current.length >= config.maxParticipants) {
      throw new BusinessRuleError(`Tanda has reached the maximum of ${config.maxParticipants} participants`);
    }

    return participantsRepo.insert({ userId, tandaId, role: 'member' });
  },

  /**
   * Start a tanda (organizer only).
   * Requires >= 3 participants. Randomizes rotation order.
   */
  start(tandaId: string, requesterId: string): TandaRow {
    const tanda = tandasRepo.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda', tandaId);
    if (tanda.organizer_id !== requesterId) {
      throw new ForbiddenError('Only the organizer can start the tanda');
    }
    if (tanda.status !== 'forming') {
      throw new BusinessRuleError('Only a FORMING tanda can be started');
    }

    const participants = participantsRepo.findByTandaId(tandaId);
    if (participants.length < 3) {
      throw new BusinessRuleError('A tanda needs at least 3 participants to start');
    }

    // Randomize rotation order
    const shuffled = shuffleInPlace([...participants]);
    const assignments = shuffled.map((p, i) => ({ id: p.id, position: i + 1 }));
    participantsRepo.assignRotations(assignments);

    tandasRepo.advanceRound(tandaId, 1, 'active');
    return tandasRepo.findById(tandaId)!;
  },

  /** Cancel a tanda (organizer only, FORMING or ACTIVE). */
  cancel(tandaId: string, requesterId: string): TandaRow {
    const tanda = tandasRepo.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda', tandaId);
    if (tanda.organizer_id !== requesterId) {
      throw new ForbiddenError('Only the organizer can cancel the tanda');
    }
    if (tanda.status === 'completed' || tanda.status === 'cancelled') {
      throw new BusinessRuleError(`Cannot cancel a tanda in ${tanda.status} status`);
    }

    tandasRepo.updateStatus(tandaId, 'cancelled');
    return tandasRepo.findById(tandaId)!;
  },

  /** List participants in a tanda. */
  listParticipants(tandaId: string): ParticipantRow[] {
    const tanda = tandasRepo.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda', tandaId);
    return participantsRepo.findByTandaId(tandaId);
  },

  /**
   * Record a contribution for the current round.
   * Only active tandas accept contributions. Each participant may contribute once per round.
   */
  recordContribution(tandaId: string, userId: string, dto: RecordContributionDto): ContributionRow {
    const tanda = tandasRepo.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda', tandaId);
    if (tanda.status !== 'active') {
      throw new BusinessRuleError('Contributions can only be recorded for an ACTIVE tanda');
    }

    const participant = participantsRepo.findByTandaAndUser(tandaId, userId);
    if (!participant) throw new BusinessRuleError('User is not a participant in this tanda');

    const round = tanda.current_round;
    const existing = contributionsRepo.findByParticipantAndRound(participant.id, round);
    if (existing) throw new ConflictError('Contribution already recorded for this round');

    const expected = tanda.contribution_amount;
    const penaltyAmount = dto.amount > expected ? 0 : 0; // penalty assessed on advance
    const status = dto.amount >= expected ? 'paid' : 'paid'; // record whatever amount as paid

    const contribution = contributionsRepo.insert({
      tandaId,
      participantId: participant.id,
      round,
      amount: dto.amount,
      status,
      penaltyAmount,
    });

    participantsRepo.resetConsecutiveMissed(participant.id);
    return contribution;
  },

  /** Return a summary for a specific round. */
  getRoundSummary(tandaId: string, round: number): RoundSummary {
    const tanda = tandasRepo.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda', tandaId);
    if (round < 1 || round > tanda.total_rounds) {
      throw new BusinessRuleError(`Round ${round} is out of range for this tanda`);
    }

    const contributions = contributionsRepo.findByTandaAndRound(tandaId, round);
    const totalCollected = contributions
      .filter(c => c.status === 'paid' || c.status === 'late')
      .reduce((sum, c) => sum + c.amount, 0);

    const expectedTotal = tanda.contribution_amount * tanda.total_rounds;

    // Find the participant who receives the pot this round (rotation_position == round)
    const allParticipants = participantsRepo.findByTandaId(tandaId);
    const recipient = allParticipants.find(p => p.rotation_position === round) ?? null;

    return { round, tanda, recipientParticipant: recipient, contributions, totalCollected, expectedTotal };
  },

  /**
   * Advance to the next round (organizer only).
   * Marks missing contributions as 'missed', updates defaulter flags, increments round.
   * Auto-completes the tanda after the last round.
   */
  advance(tandaId: string, requesterId: string): TandaRow {
    const tanda = tandasRepo.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda', tandaId);
    if (tanda.organizer_id !== requesterId) {
      throw new ForbiddenError('Only the organizer can advance the round');
    }
    if (tanda.status !== 'active') {
      throw new BusinessRuleError('Only an ACTIVE tanda can be advanced');
    }

    const round = tanda.current_round;
    const participants = participantsRepo.findByTandaId(tandaId);
    const roundContributions = contributionsRepo.findByTandaAndRound(tandaId, round);
    const paidIds = new Set(roundContributions.map(c => c.participant_id));

    const missedParticipantIds = participants
      .filter(p => !paidIds.has(p.id))
      .map(p => p.id);

    if (missedParticipantIds.length > 0) {
      contributionsRepo.insertMissed(tandaId, missedParticipantIds, round, tanda.contribution_amount);
    }

    // Update consecutive_missed and defaulter flag
    for (const p of participants) {
      const missed = missedParticipantIds.includes(p.id);
      const newMissed = missed ? p.consecutive_missed + 1 : 0;
      const isDefaulter = newMissed >= config.defaulterThreshold;
      if (missed || p.consecutive_missed > 0) {
        participantsRepo.updateMissedStats(p.id, newMissed, isDefaulter);
      }
    }

    const newRound = round + 1;
    const newStatus = newRound > tanda.total_rounds ? 'completed' : 'active';
    tandasRepo.advanceRound(tandaId, newRound, newStatus);
    return tandasRepo.findById(tandaId)!;
  },

  /** Return contribution history for a specific participant. */
  getParticipantHistory(tandaId: string, participantId: string): ContributionRow[] {
    const tanda = tandasRepo.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda', tandaId);
    const participant = participantsRepo.findById(participantId);
    if (!participant || participant.tanda_id !== tandaId) {
      throw new NotFoundError('Participant', participantId);
    }
    return contributionsRepo.findByParticipant(participantId);
  },
});

export type TandasService = ReturnType<typeof createTandasService>;
