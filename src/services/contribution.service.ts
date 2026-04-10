import * as contributionRepo from '../repositories/contribution.repository';
import * as tandaRepo from '../repositories/tanda.repository';
import * as participantRepo from '../repositories/participant.repository';
import { config } from '../config';
import {
  NotFoundError,
  BusinessRuleError,
  ConflictError,
} from '../errors/errors';

export interface ContributionResponse {
  id: number;
  tandaId: number;
  participantId: number;
  round: number;
  amount: number;
  status: string;
}

function mapContribution(row: contributionRepo.ContributionRow): ContributionResponse {
  return {
    id: row.id,
    tandaId: row.tanda_id,
    participantId: row.participant_id,
    round: row.round,
    amount: row.amount,
    status: row.status,
  };
}

export function recordContribution(
  tandaId: number,
  userId: number,
  participantId?: number,
  amount?: number,
  status?: string
): ContributionResponse {
  const tanda = tandaRepo.findTandaById(tandaId);
  if (!tanda) {
    throw new NotFoundError('Tanda not found');
  }

  if (tanda.status !== 'active') {
    throw new BusinessRuleError('Can only contribute to an active tanda');
  }

  // Resolve participant
  let participant;
  if (participantId) {
    participant = participantRepo.findParticipantById(participantId);
  } else {
    participant = participantRepo.findParticipantByUserAndTanda(userId, tandaId);
  }

  if (!participant) {
    throw new NotFoundError('Participant not found in this tanda');
  }

  // Check duplicate contribution for this round
  const existing = contributionRepo.findContributionByParticipantAndRound(
    participant.id,
    tanda.current_round
  );
  if (existing) {
    throw new ConflictError('Contribution already recorded for this round');
  }

  const contributionStatus = status ?? 'paid';
  let contributionAmount = amount ?? tanda.contribution_amount;

  // Apply late penalty
  if (contributionStatus === 'late') {
    const penalty = Math.round(tanda.contribution_amount * config.LATE_PENALTY_PERCENT / 100);
    contributionAmount = tanda.contribution_amount + penalty;
  }

  const contribution = contributionRepo.createContribution(
    tandaId,
    participant.id,
    tanda.current_round,
    contributionAmount,
    contributionStatus
  );

  // Check for defaulter (2 consecutive missed contributions)
  checkDefaulter(participant.id, tanda.current_round);

  return mapContribution(contribution);
}

function checkDefaulter(participantId: number, currentRound: number): void {
  if (currentRound < 2) return;

  const prevContribution = contributionRepo.findContributionByParticipantAndRound(
    participantId,
    currentRound - 1
  );
  const prevPrevContribution = currentRound >= 3
    ? contributionRepo.findContributionByParticipantAndRound(participantId, currentRound - 2)
    : undefined;

  const prevMissed = prevContribution?.status === 'missed';
  const prevPrevMissed = prevPrevContribution?.status === 'missed';

  if (prevMissed && prevPrevMissed) {
    participantRepo.setDefaulter(participantId, true);
  }
}

export function getRoundSummary(
  tandaId: number,
  round: number
): { round: number; contributions: ContributionResponse[]; recipient: number | null } {
  const tanda = tandaRepo.findTandaById(tandaId);
  if (!tanda) {
    throw new NotFoundError('Tanda not found');
  }

  if (round < 1 || round > tanda.total_rounds) {
    throw new BusinessRuleError('Invalid round number');
  }

  const contributions = contributionRepo
    .findContributionsByTandaAndRound(tandaId, round)
    .map(mapContribution);

  // Find recipient (participant with rotation_position matching the round)
  const participants = participantRepo.findParticipantsByTandaId(tandaId);
  const recipient = participants.find((p) => p.rotation_position === round);

  return {
    round,
    contributions,
    recipient: recipient ? recipient.user_id : null,
  };
}

export function getParticipantHistory(
  tandaId: number,
  participantId: number
): ContributionResponse[] {
  const tanda = tandaRepo.findTandaById(tandaId);
  if (!tanda) {
    throw new NotFoundError('Tanda not found');
  }

  const participant = participantRepo.findParticipantById(participantId);
  if (!participant || participant.tanda_id !== tandaId) {
    throw new NotFoundError('Participant not found in this tanda');
  }

  return contributionRepo
    .findContributionsByParticipantId(participantId)
    .map(mapContribution);
}
