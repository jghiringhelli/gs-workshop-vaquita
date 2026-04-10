import { Tanda, CreateTandaDto, TandaStatus } from './Tanda';

export interface ITandaRepository {
  create(dto: CreateTandaDto): Tanda;
  findById(id: string): Tanda | null;
  findByUserId(userId: string): Tanda[];
  updateStatus(id: string, status: TandaStatus): void;
  updateCurrentRound(id: string, round: number): void;
  updateTotalRounds(id: string, totalRounds: number): void;
}
