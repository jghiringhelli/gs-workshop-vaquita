import { ContributionRepository, Contribution } from '../repositories/contribution';
import { ParticipantRepository } from '../repositories/participant';
import { TandaRepository } from '../repositories/tanda';
import { config } from '../config';
import { BusinessRuleError } from '../errors';

export class ContributionService {
  constructor(
    private contributionRepo: ContributionRepository,
    private participantRepo: ParticipantRepository,
    private tandaRepo: TandaRepository
  ) {}

  recordContribution(
    tandaId: string,
    participantId: string,
    amount: number,
    isLate: boolean = false
  ): Contribution {
    const tanda = this.tandaRepo.getById(tandaId);
    const participant = this.participantRepo.getById(participantId);

    if (participant.tandaId !== tandaId) {
      throw new BusinessRuleError(
        'Participant is not part of this tanda',
        'INVALID_PARTICIPANT'
      );
    }

    if (tanda.status !== 'active') {
      throw new BusinessRuleError(
        'Tanda is not active',
        'TANDA_NOT_ACTIVE'
      );
    }

    // Get or create contribution for current round
    let contribution = this.contributionRepo.getOrCreate(
      tandaId,
      participantId,
      tanda.currentRound,
      tanda.contributionAmount
    );

    if (contribution.status === 'paid') {
      throw new BusinessRuleError(
        'Contribution already paid for this round',
        'ALREADY_PAID'
      );
    }

    // Calculate penalty if late
    let penalty = 0;
    const status = isLate ? 'late' : 'paid';

    if (isLate) {
      penalty = (tanda.contributionAmount * config.PENALTY_PERCENTAGE) / 100;
    }

    const paidAt = new Date().toISOString();

    // Update status
    contribution = this.contributionRepo.updateStatus(
      contribution.id,
      status,
      paidAt,
      penalty
    );

    // Reset consecutive missed if contribution is paid
    if (status === 'paid') {
      this.participantRepo.resetConsecutiveMissed(participantId);
    }

    return contribution;
  }

  markMissed(tandaId: string, participantId: string): Contribution {
    const tanda = this.tandaRepo.getById(tandaId);
    const participant = this.participantRepo.getById(participantId);

    if (participant.tandaId !== tandaId) {
      throw new BusinessRuleError(
        'Participant is not part of this tanda',
        'INVALID_PARTICIPANT'
      );
    }

    // Get or create contribution for current round
    const contribution = this.contributionRepo.getOrCreate(
      tandaId,
      participantId,
      tanda.currentRound,
      tanda.contributionAmount
    );

    if (contribution.status === 'paid' || contribution.status === 'late') {
      throw new BusinessRuleError(
        'Contribution already recorded for this round',
        'CONTRIBUTION_EXISTS'
      );
    }

    // Mark as missed
    const updated = this.contributionRepo.updateStatus(contribution.id, 'missed');

    // Increment consecutive missed
    this.participantRepo.incrementConsecutiveMissed(participantId);

    // Check if should be marked as defaulter (2+ consecutive missed)
    const missed = this.participantRepo.getById(participantId);
    if (missed.consecutiveMissed >= 2) {
      this.participantRepo.markAsDefaulter(participantId);
    }

    return updated;
  }

  getByRound(tandaId: string, round: number): Contribution[] {
    this.tandaRepo.getById(tandaId); // Validate tanda exists

    return this.contributionRepo.getByRound(tandaId, round);
  }

  getRoundSummary(tandaId: string, round: number): Record<string, unknown> {
    const tanda = this.tandaRepo.getById(tandaId);
    const contributions = this.contributionRepo.getByRound(tandaId, round);
    const participants = this.participantRepo.getByTanda(tandaId);

    const recipientId = participants[round - 1]?.id || null;

    return {
      tandaId,
      round,
      status: tanda.status,
      recipient: recipientId,
      contributions: contributions.map((c) => ({
        participantId: c.participantId,
        status: c.status,
        amount: c.amount,
        penaltyApplied: c.penaltyApplied,
        paidAt: c.paidAt,
      })),
      totalPaid: contributions
        .filter((c) => c.status === 'paid' || c.status === 'late')
        .reduce((sum, c) => sum + c.amount + c.penaltyApplied, 0),
      totalExpected: tanda.contributionAmount * participants.length,
    };
  }
}
