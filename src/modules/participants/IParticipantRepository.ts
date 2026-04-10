import { Participant, CreateParticipantDto } from './Participant';

export interface IParticipantRepository {
  create(dto: CreateParticipantDto): Participant;
  findById(id: string): Participant | null;
  findByTandaId(tandaId: string): Participant[];
  findByUserIdAndTandaId(userId: string, tandaId: string): Participant | null;
  assignRotationPositions(tandaId: string, assignments: Array<{ id: string; position: number }>): void;
  countByTandaId(tandaId: string): number;
}
