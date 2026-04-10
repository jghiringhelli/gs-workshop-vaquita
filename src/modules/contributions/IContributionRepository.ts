import { Contribution, CreateContributionDto } from './Contribution';

export interface IContributionRepository {
  create(dto: CreateContributionDto): Contribution;
  findByTandaAndRound(tandaId: string, round: number): Contribution[];
  findByParticipantId(participantId: string): Contribution[];
  findByParticipantAndRound(participantId: string, round: number): Contribution | null;
  markMissed(tandaId: string, round: number, participantIds: string[]): void;
  getConsecutiveMisses(participantId: string): number;
}
