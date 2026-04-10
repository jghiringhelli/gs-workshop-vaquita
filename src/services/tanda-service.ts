import type { Tanda } from "../domain/models";
import { getDatabase } from "../db/database";
import { NotFoundError } from "../errors/app-error";
import { ParticipantRepository } from "../repositories/participant-repository";
import { TandaRepository } from "../repositories/tanda-repository";
import { UserRepository } from "../repositories/user-repository";

export class TandaService {
  constructor(
    private readonly tandaRepository: TandaRepository,
    private readonly userRepository: UserRepository,
    private readonly participantRepository: ParticipantRepository
  ) {}

  createTanda(input: {
    name: string;
    organizerId: number;
    contributionAmount: number;
  }): Tanda {
    const organizer = this.userRepository.findById(input.organizerId);

    if (!organizer) {
      throw new NotFoundError("Organizer user not found");
    }

    const db = getDatabase();

    const createTransaction = db.transaction(() => {
      const tanda = this.tandaRepository.create(input);

      this.participantRepository.create({
        userId: input.organizerId,
        tandaId: tanda.id,
        role: "organizer",
        rotationPosition: 1,
      });

      this.tandaRepository.updateRoundState(tanda.id, 1, 1);

      return this.tandaRepository.findById(tanda.id) as Tanda;
    });

    return createTransaction();
  }

  listTandasForUser(userId: number): Tanda[] {
    const user = this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundError("User not found");
    }

    return this.tandaRepository.listByUser(userId);
  }

  getTandaById(id: number): Tanda {
    const tanda = this.tandaRepository.findById(id);

    if (!tanda) {
      throw new NotFoundError("Tanda not found");
    }

    return tanda;
  }
}
