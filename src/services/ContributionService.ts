import { v4 as uuidv4 } from 'uuid';
import { Contribution } from '../models';
import {
  IContributionRepository,
  IParticipantRepository,
  ITandaRepository,
} from '../repositories/interfaces';
import { NotFoundError, BusinessRuleError, ConflictError } from '../errors';
import { config } from '../config/env';

export interface RecordContributionInput {
  participantId: string;
  status?: 'paid' | 'late' | 'missed';
}

export interface RoundSummary {
  round: number;
  contributions: Contribution[];
  totalPaid: number;
  totalExpected: number;
  recipientParticipantId: string | null;
}

export class ContributionService {
  constructor(
    private readonly contributionRepository: IContributionRepository,
    private readonly participantRepository: IParticipantRepository,
    private readonly tandaRepository: ITandaRepository,
  ) {}

  recordContribution(tandaId: string, input: RecordContributionInput): Contribution {
    const tanda = this.tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda', tandaId);

    // Rule 5: contributions only in active tandas
    if (tanda.status !== 'active') {
      throw new BusinessRuleError('Contributions can only be recorded for active tandas');
    }

    const participant = this.participantRepository.findById(input.participantId);
    if (!participant) throw new NotFoundError('Participant', input.participantId);

    if (participant.tandaId !== tandaId) {
      throw new BusinessRuleError('Participant does not belong to this tanda');
    }

    const existing = this.contributionRepository.findByParticipantAndRound(
      input.participantId,
      tanda.currentRound,
    );
    if (existing) {
      throw new ConflictError(
        `Contribution already recorded for participant in round ${tanda.currentRound}`,
      );
    }

    const status = input.status ?? 'paid';

    // Rule 6: late contributions incur a 5% penalty
    let amount = tanda.contributionAmount;
    if (status === 'late') {
      amount = amount * (1 + config.LATE_PENALTY_PCT);
    }

    const contribution = this.contributionRepository.create({
      id: uuidv4(),
      tandaId,
      participantId: input.participantId,
      round: tanda.currentRound,
      amount,
      status,
    });

    // Rule 7: track consecutive missed contributions, flag defaulters
    if (status === 'missed') {
      const newConsecutiveMissed = participant.consecutiveMissed + 1;
      const isNowDefaulter =
        participant.isDefaulter || newConsecutiveMissed >= config.MAX_CONSECUTIVE_MISSED;
      this.participantRepository.update(input.participantId, {
        consecutiveMissed: newConsecutiveMissed,
        isDefaulter: isNowDefaulter,
      });
    } else {
      // Reset streak on any payment
      this.participantRepository.update(input.participantId, { consecutiveMissed: 0 });
    }

    return contribution;
  }

  getRoundSummary(tandaId: string, round: number): RoundSummary {
    const tanda = this.tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda', tandaId);

    if (round < 1 || round > tanda.totalRounds) {
      throw new BusinessRuleError(
        `Invalid round number. Must be between 1 and ${tanda.totalRounds}`,
      );
    }

    const contributions = this.contributionRepository.findByTandaAndRound(tandaId, round);
    const participants = this.participantRepository.findByTandaId(tandaId);

    const totalPaid = contributions
      .filter((c) => c.status === 'paid' || c.status === 'late')
      .reduce((sum, c) => sum + c.amount, 0);

    const totalExpected = tanda.contributionAmount * participants.length;

    // The recipient is the participant whose rotationPosition equals the round number
    const recipient = participants.find((p) => p.rotationPosition === round);

    return {
      round,
      contributions,
      totalPaid,
      totalExpected,
      recipientParticipantId: recipient?.id ?? null,
    };
  }

  getParticipantHistory(tandaId: string, participantId: string): Contribution[] {
    const tanda = this.tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda', tandaId);

    const participant = this.participantRepository.findById(participantId);
    if (!participant) throw new NotFoundError('Participant', participantId);

    if (participant.tandaId !== tandaId) {
      throw new BusinessRuleError('Participant does not belong to this tanda');
    }

    return this.contributionRepository.findByParticipant(participantId);
  }
}
