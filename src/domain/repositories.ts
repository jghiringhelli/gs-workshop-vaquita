import { User, Tanda, Participant, Contribution } from './index.js';

export interface IUserRepository {
  create(user: Omit<User, 'id'>): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  list(): Promise<User[]>;
}

export interface ITandaRepository {
  create(tanda: Omit<Tanda, 'id'>): Promise<Tanda>;
  findById(id: string): Promise<Tanda | null>;
  findByUserId(userId: string): Promise<Tanda[]>;
  update(id: string, updates: Partial<Tanda>): Promise<Tanda>;
  list(): Promise<Tanda[]>;
}

export interface IParticipantRepository {
  create(participant: Omit<Participant, 'id'>): Promise<Participant>;
  findById(id: string): Promise<Participant | null>;
  findByTandaId(tandaId: string): Promise<Participant[]>;
  findByUserAndTanda(userId: string, tandaId: string): Promise<Participant | null>;
  update(id: string, updates: Partial<Participant>): Promise<Participant>;
}

export interface IContributionRepository {
  create(contribution: Omit<Contribution, 'id'>): Promise<Contribution>;
  findById(id: string): Promise<Contribution | null>;
  findByTandaAndRound(tandaId: string, round: number): Promise<Contribution[]>;
  findByParticipantId(participantId: string): Promise<Contribution[]>;
  update(id: string, updates: Partial<Contribution>): Promise<Contribution>;
}