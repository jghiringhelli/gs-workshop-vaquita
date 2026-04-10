/**
 * Services Index
 * Exports all service instances and factory
 */

import { Repositories } from '../types/index.js';
import { UserService } from './UserService.js';
import { TandaService } from './TandaService.js';
import { ParticipantService } from './ParticipantService.js';
import { ContributionService } from './ContributionService.js';

export * from './UserService.js';
export * from './TandaService.js';
export * from './ParticipantService.js';
export * from './ContributionService.js';

export interface Services {
  users: UserService;
  tandas: TandaService;
  participants: ParticipantService;
  contributions: ContributionService;
}

/**
 * Create all service instances
 */
export function createServices(repositories: Repositories): Services {
  return {
    users: new UserService(repositories),
    tandas: new TandaService(repositories),
    participants: new ParticipantService(repositories),
    contributions: new ContributionService(repositories),
  };
}
