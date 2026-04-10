import { User, Tanda, Participant, Contribution } from '../models';

export interface IUserRepository {
  create(data: Omit<User, 'createdAt'>): User;
  findById(id: string): User | null;
  findAll(): User[];
  findByEmail(email: string): User | null;
}

export interface ITandaRepository {
  create(data: Omit<Tanda, 'createdAt'>): Tanda;
  findById(id: string): Tanda | null;
  findByUserId(userId: string): Tanda[];
  update(id: string, data: Partial<Pick<Tanda, 'status' | 'currentRound' | 'totalRounds'>>): Tanda;
}

export interface IParticipantRepository {
  create(data: Omit<Participant, 'createdAt'>): Participant;
  findById(id: string): Participant | null;
  findByTandaId(tandaId: string): Participant[];
  findByUserAndTanda(userId: string, tandaId: string): Participant | null;
  update(
    id: string,
    data: Partial<Pick<Participant, 'rotationPosition' | 'role' | 'isDefaulter' | 'consecutiveMissed'>>,
  ): Participant;
  countByTandaId(tandaId: string): number;
  updateRotationPositions(updates: Array<{ id: string; rotationPosition: number }>): void;
}

export interface IContributionRepository {
  create(data: Omit<Contribution, 'createdAt'>): Contribution;
  findByTandaAndRound(tandaId: string, round: number): Contribution[];
  findByParticipant(participantId: string): Contribution[];
  findByParticipantAndRound(participantId: string, round: number): Contribution | null;
}
