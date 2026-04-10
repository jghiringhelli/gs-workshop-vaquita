import { v4 as uuidv4 } from 'uuid';
import { Tanda } from '../models/tanda';
import { Contribution, RecordContributionRequest, RoundSummary } from '../models/contribution';
import { TandaRepository } from '../repositories/tanda.repository';
import { ParticipantRepository } from '../repositories/participant.repository';
import { ContributionRepository } from '../repositories/contribution.repository';
import { config } from '../config';

export class TandaOperationService {
  constructor(
    private tandaRepository: TandaRepository,
    private participantRepository: ParticipantRepository,
    private contributionRepository: ContributionRepository
  ) {}

  /**
   * Start a tanda (transition from FORMING to ACTIVE)
   * Business rules:
   * - Only organizer can start
   * - At least 3 participants required
   * - Randomize rotation order
   */
  startTanda(tandaId: string, organizerId: string): Tanda {
    const tanda = this.tandaRepository.findById(tandaId);
    if (!tanda) throw new Error('Tanda not found');

    if (tanda.organizerId !== organizerId) {
      throw new Error('Only organizer can start the tanda');
    }

    if (tanda.status !== 'forming') {
      throw new Error('Tanda is not in forming status');
    }

    const participantCount = this.participantRepository.countByTanda(tandaId);
    if (participantCount < 3) {
      throw new Error('At least 3 participants required to start');
    }

    // Update tanda status to active and randomize rotation
    this.tandaRepository.updateStatusAndRound(tandaId, 'active', 1);

    // Initialize contributions for round 1
    const participants = this.participantRepository.findByTanda(tandaId);
    for (const participant of participants) {
      const contribution: Contribution = {
        id: uuidv4(),
        tandaId,
        participantId: participant.id,
        round: 1,
        amount: tanda.contributionAmount,
        status: 'pending',
        paidAt: null,
        createdAt: new Date(),
      };
      this.contributionRepository.create(contribution);
    }

    const updated = this.tandaRepository.findById(tandaId);
    if (!updated) throw new Error('Failed to update tanda');
    return updated;
  }

  /**
   * Cancel a tanda
   * Business rules:
   * - Only organizer can cancel
   * - Can cancel at any stage and time
   */
  cancelTanda(tandaId: string, organizerId: string): Tanda {
    const tanda = this.tandaRepository.findById(tandaId);
    if (!tanda) throw new Error('Tanda not found');

    if (tanda.organizerId !== organizerId) {
      throw new Error('Only organizer can cancel the tanda');
    }

    if (tanda.status === 'cancelled') {
      throw new Error('Tanda is already cancelled');
    }

    this.tandaRepository.updateStatus(tandaId, 'cancelled');

    const updated = this.tandaRepository.findById(tandaId);
    if (!updated) throw new Error('Failed to cancel tanda');
    return updated;
  }

  /**
   * Record a contribution for a participant
   * Business rules:
   * - Apply late penalty if isLate is true
   * - Mark as paid
   */
  recordContribution(
    tandaId: string,
    request: RecordContributionRequest
  ): Contribution {
    const tanda = this.tandaRepository.findById(tandaId);
    if (!tanda) throw new Error('Tanda not found');

    if (tanda.status !== 'active') {
      throw new Error('Cannot record contribution for non-active tanda');
    }

    const contribution = this.contributionRepository.findByParticipantAndRound(
      request.participantId,
      tanda.currentRound
    );
    if (!contribution) {
      throw new Error('Contribution not found for this round');
    }

    // Calculate amount with penalty if late
    let amount = request.amount;
    let status: 'paid' | 'late' = 'paid';
    if (request.isLate) {
      status = 'late';
      amount = request.amount * (1 + config.LATE_PENALTY_PERCENT / 100);
    }

    // Update contribution
    this.contributionRepository.update(
      contribution.id,
      status,
      amount,
      new Date().toISOString()
    );

    const updated = this.contributionRepository.findByParticipantAndRound(
      request.participantId,
      tanda.currentRound
    );
    if (!updated) throw new Error('Failed to record contribution');
    return updated;
  }

  /**
   * Get round summary with all contributions
   */
  getRoundSummary(tandaId: string, round: number): RoundSummary {
    const tanda = this.tandaRepository.findById(tandaId);
    if (!tanda) throw new Error('Tanda not found');

    if (round < 1 || round > tanda.totalRounds) {
      throw new Error('Invalid round number');
    }

    const contributions = this.contributionRepository.findByRound(tandaId, round);
    const totalCollected = contributions
      .filter(c => c.status === 'paid' || c.status === 'late')
      .reduce((sum, c) => sum + c.amount, 0);

    // Get recipient for this round (rotation position)
    const participants = this.participantRepository.findByTanda(tandaId);
    const recipientPosition = (round - 1) % participants.length;
    const recipientParticipantId = participants[recipientPosition].id;

    return {
      round,
      contributions,
      totalCollected,
      recipientParticipantId,
    };
  }

  /**
   * Advance to next round
   * Business rules:
   * - Only organizer can advance
   * - All participants must have contributed
   * - Auto-complete if last round
   */
  advanceRound(tandaId: string, organizerId: string): Tanda {
    const tanda = this.tandaRepository.findById(tandaId);
    if (!tanda) throw new Error('Tanda not found');

    if (tanda.organizerId !== organizerId) {
      throw new Error('Only organizer can advance rounds');
    }

    if (tanda.status !== 'active') {
      throw new Error('Tanda is not active');
    }

    if (tanda.currentRound >= tanda.totalRounds) {
      throw new Error('All rounds completed');
    }

    // Move to next round
    const nextRound = tanda.currentRound + 1;
    let newStatus = 'active';
    if (nextRound > tanda.totalRounds) {
      newStatus = 'completed';
    }

    this.tandaRepository.updateStatusAndRound(tandaId, newStatus, nextRound);

    // Initialize contributions for next round if not completed
    if (newStatus === 'active') {
      const participants = this.participantRepository.findByTanda(tandaId);
      for (const participant of participants) {
        const contribution: Contribution = {
          id: uuidv4(),
          tandaId,
          participantId: participant.id,
          round: nextRound,
          amount: tanda.contributionAmount,
          status: 'pending',
          paidAt: null,
          createdAt: new Date(),
        };
        this.contributionRepository.create(contribution);
      }
    }

    const updated = this.tandaRepository.findById(tandaId);
    if (!updated) throw new Error('Failed to advance round');
    return updated;
  }

  /**
   * Get contribution history for a participant
   */
  getParticipantHistory(participantId: string): Contribution[] {
    return this.contributionRepository.findByParticipantHistory(participantId);
  }
}
