import { IContributionRepository, IParticipantRepository, ITandaRepository } from '../domain/repositories.js';
import { Contribution } from '../domain/index.js';
import { NotFoundError, ValidationError, UnauthorizedError } from '../errors.js';

export class ContributionService {
  constructor(
    private contributionRepository: IContributionRepository,
    private participantRepository: IParticipantRepository,
    private tandaRepository: ITandaRepository
  ) {}

  /**
   * Records a contribution for the current round
   * @param tandaId - The tanda id
   * @param participantId - The participant id
   * @param userId - The user id (for authorization)
   * @returns The created contribution
   */
  async recordContribution(tandaId: string, participantId: string, userId: string): Promise<Contribution> {
    const tanda = await this.tandaRepository.findById(tandaId);
    if (!tanda) {
      throw new NotFoundError('Tanda not found');
    }
    if (tanda.status !== 'active') {
      throw new ValidationError('Tanda is not active');
    }

    const participant = await this.participantRepository.findById(participantId);
    if (!participant || participant.tandaId !== tandaId) {
      throw new NotFoundError('Participant not found in this tanda');
    }
    if (participant.userId !== userId) {
      throw new UnauthorizedError('Unauthorized to record contribution for this participant');
    }

    // Check if already contributed this round
    const existing = await this.contributionRepository.findByTandaAndRound(tandaId, tanda.currentRound);
    const alreadyContributed = existing.find(c => c.participantId === participantId);
    if (alreadyContributed) {
      throw new ValidationError('Contribution already recorded for this round');
    }

    return this.contributionRepository.create({
      tandaId,
      participantId,
      round: tanda.currentRound,
      amount: tanda.contributionAmount,
      status: 'paid'
    });
  }

  /**
   * Gets round summary
   * @param tandaId - The tanda id
   * @param round - The round number
   * @returns Array of contributions for the round
   */
  async getRoundSummary(tandaId: string, round: number): Promise<Contribution[]> {
    const tanda = await this.tandaRepository.findById(tandaId);
    if (!tanda) {
      throw new NotFoundError('Tanda not found');
    }
    if (round < 1 || round > tanda.totalRounds) {
      throw new ValidationError('Invalid round number');
    }

    return this.contributionRepository.findByTandaAndRound(tandaId, round);
  }

  /**
   * Gets contribution history for a participant
   * @param participantId - The participant id
   * @returns Array of contributions
   */
  async getParticipantHistory(participantId: string): Promise<Contribution[]> {
    const participant = await this.participantRepository.findById(participantId);
    if (!participant) {
      throw new NotFoundError('Participant not found');
    }

    return this.contributionRepository.findByParticipantId(participantId);
  }
}