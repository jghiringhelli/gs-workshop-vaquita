import { v4 as uuidv4 } from 'uuid';
import { Tanda, CreateTandaRequest } from '../models/tanda';
import { TandaRepository } from '../repositories/tanda.repository';

export class TandaService {
  constructor(private tandaRepository: TandaRepository) {}

  createTanda(request: CreateTandaRequest): Tanda {
    // Business rules: can add more here
    const tanda: Tanda = {
      id: uuidv4(),
      name: request.name,
      organizerId: request.organizerId,
      contributionAmount: request.contributionAmount,
      status: 'forming',
      currentRound: 0,
      totalRounds: request.totalRounds,
      createdAt: new Date(),
    };
    return this.tandaRepository.create(tanda);
  }

  getTandaById(id: string): Tanda | null {
    return this.tandaRepository.findById(id);
  }

  getTandasByOrganizer(organizerId: string): Tanda[] {
    return this.tandaRepository.findAllByOrganizer(organizerId);
  }
}
