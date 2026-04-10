/**
 * Domain Types and Entities
 * Core models for the Tanda API
 */

export type TandaStatus = 'forming' | 'active' | 'completed' | 'cancelled';
export type ParticipantRole = 'organizer' | 'member';
export type ContributionStatus = 'pending' | 'paid' | 'late' | 'missed';

/**
 * User entity
 * Represents a person participating in the system
 */
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

/**
 * Tanda entity
 * Core aggregate representing a rotating savings group
 */
export interface Tanda {
  id: string;
  name: string;
  organizerId: string;
  contributionAmount: number;
  status: TandaStatus;
  currentRound: number;
  totalRounds: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Participant entity
 * Represents a member's participation in a tanda
 */
export interface Participant {
  id: string;
  userId: string;
  tandaId: string;
  role: ParticipantRole;
  rotationPosition: number;
  createdAt: Date;
}

/**
 * Contribution entity
 * Records a payment toward a round
 */
export interface Contribution {
  id: string;
  tandaId: string;
  participantId: string;
  round: number;
  amount: number;
  status: ContributionStatus;
  paidAt: Date | null;
  createdAt: Date;
}

/**
 * Domain Events for tracking state changes
 */
export interface DomainEvent {
  id: string;
  aggregateId: string;
  aggregateType: 'tanda' | 'participant' | 'contribution';
  eventType: string;
  data: unknown;
  createdAt: Date;
}

/**
 * Repositories interface for dependency injection
 */
export interface Repositories {
  users: UserRepository;
  tandas: TandaRepository;
  participants: ParticipantRepository;
  contributions: ContributionRepository;
}

export interface UserRepository {
  create(user: Omit<User, 'id' | 'createdAt'>): User;
  findById(id: string): User | null;
  findByEmail(email: string): User | null;
  list(): User[];
}

export interface TandaRepository {
  create(tanda: Omit<Tanda, 'id' | 'createdAt' | 'updatedAt'>): Tanda;
  findById(id: string): Tanda | null;
  findByOrganizerId(organizerId: string): Tanda[];
  update(id: string, data: Partial<Omit<Tanda, 'id' | 'createdAt' | 'updatedAt'>>): Tanda;
  list(): Tanda[];
}

export interface ParticipantRepository {
  create(participant: Omit<Participant, 'id' | 'createdAt'>): Participant;
  findById(id: string): Participant | null;
  findByTandaId(tandaId: string): Participant[];
  findByUserAndTanda(userId: string, tandaId: string): Participant | null;
  countByTandaId(tandaId: string): number;
  update(id: string, data: Partial<Omit<Participant, 'id' | 'createdAt'>>): Participant;
}

export interface ContributionRepository {
  create(contribution: Omit<Contribution, 'id' | 'createdAt'>): Contribution;
  findById(id: string): Contribution | null;
  findByTandaAndRound(tandaId: string, round: number): Contribution[];
  findByParticipantAndTanda(participantId: string, tandaId: string): Contribution[];
  findPendingByRound(tandaId: string, round: number): Contribution[];
  update(id: string, data: Partial<Omit<Contribution, 'id' | 'createdAt'>>): Contribution;
}
