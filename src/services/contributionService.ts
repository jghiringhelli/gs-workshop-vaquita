import Database from 'better-sqlite3';
import { z } from 'zod';
import { config } from '../config';
import * as contributionRepo from '../repositories/contributionRepository';
import * as participantRepo from '../repositories/participantRepository';
import * as tandaRepo from '../repositories/tandaRepository';
import { ConflictError, NotFoundError, ValidationError } from '../errors/AppError';

const RecordContributionSchema = z.object({
  participantId: z.string().min(1, 'participantId is required'),
  amount: z.number().positive('amount must be positive'),
  late: z.boolean().optional().default(false),
});

export function recordContribution(tandaId: string, data: unknown, db?: Database.Database) {
  const parsed = RecordContributionSchema.safeParse(data);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors.map((e) => e.message).join(', '));
  }

  const tanda = tandaRepo.findTandaById(tandaId, db);
  if (!tanda) throw new NotFoundError(`Tanda ${tandaId} not found`);
  if (tanda.status !== 'active') {
    throw new ConflictError('Tanda is not active');
  }

  const participant = participantRepo.findParticipantById(parsed.data.participantId, db);
  if (!participant) throw new NotFoundError(`Participant ${parsed.data.participantId} not found`);
  if (participant.tandaId !== tandaId) {
    throw new ValidationError('Participant does not belong to this tanda');
  }

  const currentRound = tanda.currentRound!;
  const existing = contributionRepo.findContributionByParticipantAndRound(
    parsed.data.participantId,
    currentRound,
    db,
  );
  if (existing) throw new ConflictError('Contribution already recorded for this round');

  const isLate = parsed.data.late;
  const finalAmount = isLate
    ? parsed.data.amount * (1 + config.latePenaltyPercent / 100)
    : parsed.data.amount;
  const status = isLate ? 'late' : 'paid';

  const contribution = contributionRepo.createContribution(
    {
      tandaId,
      participantId: parsed.data.participantId,
      round: currentRound,
      amount: finalAmount,
      status,
    },
    db,
  );

  checkAndFlagDefaulter(parsed.data.participantId, db);

  return contribution;
}

export function getRoundSummary(tandaId: string, round: number, db?: Database.Database) {
  const tanda = tandaRepo.findTandaById(tandaId, db);
  if (!tanda) throw new NotFoundError(`Tanda ${tandaId} not found`);

  if (round < 1 || (tanda.totalRounds && round > tanda.totalRounds)) {
    throw new ValidationError(`Round ${round} is out of range`);
  }

  return contributionRepo.findContributionsByRound(tandaId, round, db);
}

export function getParticipantHistory(participantId: string, tandaId: string, db?: Database.Database) {
  const tanda = tandaRepo.findTandaById(tandaId, db);
  if (!tanda) throw new NotFoundError(`Tanda ${tandaId} not found`);

  const participant = participantRepo.findParticipantById(participantId, db);
  if (!participant) throw new NotFoundError(`Participant ${participantId} not found`);
  if (participant.tandaId !== tandaId) {
    throw new ValidationError('Participant does not belong to this tanda');
  }

  return contributionRepo.findContributionsByParticipantOrderedByRound(participantId, db);
}

function checkAndFlagDefaulter(participantId: string, db?: Database.Database): void {
  const history = contributionRepo.findContributionsByParticipantOrderedByRound(participantId, db);
  let consecutiveMissed = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].status === 'missed') {
      consecutiveMissed++;
    } else {
      break;
    }
  }
  if (consecutiveMissed >= config.consecutiveMissedThreshold) {
    const lastContribution = history[history.length - 1];
    contributionRepo.updateContributionDefaulter(lastContribution.id, 1, db);
  }
}
