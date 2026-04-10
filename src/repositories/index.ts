/**
 * Repositories Index
 * Exports repository instances and factory
 */

import Database from 'better-sqlite3';
import { UserRepository } from './UserRepository.js';
import { TandaRepository } from './TandaRepository.js';
import { ParticipantRepository } from './ParticipantRepository.js';
import { ContributionRepository } from './ContributionRepository.js';
import { Repositories } from '../types/index.js';

export * from './UserRepository.js';
export * from './TandaRepository.js';
export * from './ParticipantRepository.js';
export * from './ContributionRepository.js';

/**
 * Create all repository instances
 */
export function createRepositories(db: Database.Database): Repositories {
  return {
    users: new UserRepository(db),
    tandas: new TandaRepository(db),
    participants: new ParticipantRepository(db),
    contributions: new ContributionRepository(db),
  };
}
