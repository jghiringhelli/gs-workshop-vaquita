import { config } from '../config/env';
import type { ContributionRepository } from '../repositories/ContributionRepository';
import type { ParticipantRepository } from '../repositories/ParticipantRepository';
import type { TandaRepository } from '../repositories/TandaRepository';
import type { RecordContributionDto } from '../validators/tanda.validator';
import type { Contribution } from '../models';
import {
  NotFoundError,
  ConflictError,
  BusinessRuleError,
} from '../errors/AppError';

export class ContributionService {
  constructor(
    private readonly contributionRepository: ContributionRepository,
    private readonly participantRepository: ParticipantRepository,
    private readonly tandaRepository: TandaRepository,
  ) {}

  recordContribution(tandaId: string, dto: RecordContributionDto): Contribution {
    const tanda = this.tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda', tandaId);
    if (tanda.status !== 'active') throw new BusinessRuleError('Contributions can only be recorded for active tandas');

    const participant = this.participantRepository.findById(dto.participantId);
    if (!participant) throw new NotFoundError('Participant', dto.participantId);
    if (participant.tandaId !== tandaId) throw new BusinessRuleError('Participant does not belong to this tanda');

    const existing = this.contributionRepository.findByParticipantAndRound(dto.participantId, tanda.currentRound);
    if (existing) throw new ConflictError('Contribution already recorded for this participant in this round');

    const expectedAmount = dto.status === 'late'
      ? tanda.contributionAmount * (1 + config.latePenaltyPercent / 100)
      : tanda.contributionAmount;

    return this.contributionRepository.create({
      tandaId,
      participantId: dto.participantId,
      round: tanda.currentRound,
      amount: expectedAmount,
      status: dto.status,
    });
  }

  getParticipantHistory(tandaId: string, participantId: string): Contribution[] {
    const tanda = this.tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda', tandaId);

    const participant = this.participantRepository.findById(participantId);
    if (!participant) throw new NotFoundError('Participant', participantId);
    if (participant.tandaId !== tandaId) throw new BusinessRuleError('Participant does not belong to this tanda');

    return this.contributionRepository.findByParticipant(participantId);
  }
}
