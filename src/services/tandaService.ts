import { ITandaRepository, IParticipantRepository, IUserRepository } from '../domain/repositories.js';
import { Tanda, Participant } from '../domain/index.js';

export class TandaService {
  constructor(
    private tandaRepository: ITandaRepository,
    private participantRepository: IParticipantRepository,
    private userRepository: IUserRepository
  ) {}

  /**
   * Creates a new tanda and adds organizer as first participant
   * @param tandaData - The tanda data
   * @returns The created tanda
   */
  async createTanda(tandaData: { name: string; organizerId: string; contributionAmount: number }): Promise<Tanda> {
    // Verify organizer exists
    const organizer = await this.userRepository.findById(tandaData.organizerId);
    if (!organizer) {
      throw new Error('Organizer not found');
    }

    const tanda = await this.tandaRepository.create({
      ...tandaData,
      status: 'forming',
      currentRound: 0,
      totalRounds: 0
    });

    // Add organizer as participant
    await this.participantRepository.create({
      userId: tandaData.organizerId,
      tandaId: tanda.id,
      role: 'organizer',
      rotationPosition: null
    });

    return tanda;
  }

  /**
   * Gets a tanda by id
   * @param id - The tanda id
   * @returns The tanda
   */
  async getTandaById(id: string): Promise<Tanda> {
    const tanda = await this.tandaRepository.findById(id);
    if (!tanda) {
      throw new Error('Tanda not found');
    }
    return tanda;
  }

  /**
   * Lists tandas for a user
   * @param userId - The user id
   * @returns Array of tandas
   */
  async listTandasByUser(userId: string): Promise<Tanda[]> {
    return this.tandaRepository.findByUserId(userId);
  }

  /**
   * Joins a tanda
   * @param tandaId - The tanda id
   * @param userId - The user id
   * @returns The participant
   */
  async joinTanda(tandaId: string, userId: string): Promise<Participant> {
    const tanda = await this.getTandaById(tandaId);
    if (tanda.status !== 'forming') {
      throw new Error('Cannot join tanda that is not in forming status');
    }

    // Check if already joined
    const existing = await this.participantRepository.findByUserAndTanda(userId, tandaId);
    if (existing) {
      throw new Error('User already joined this tanda');
    }

    return this.participantRepository.create({
      userId,
      tandaId,
      role: 'member',
      rotationPosition: null
    });
  }

  /**
   * Starts a tanda
   * @param tandaId - The tanda id
   * @param organizerId - The organizer id
   * @returns The updated tanda
   */
  async startTanda(tandaId: string, organizerId: string): Promise<Tanda> {
    const tanda = await this.getTandaById(tandaId);
    if (tanda.organizerId !== organizerId) {
      throw new Error('Only organizer can start tanda');
    }
    if (tanda.status !== 'forming') {
      throw new Error('Tanda is not in forming status');
    }

    const participants = await this.participantRepository.findByTandaId(tandaId);
    if (participants.length < 3) {
      throw new Error('Tanda needs at least 3 participants to start');
    }

    // Randomize rotation positions
    const positions = this.shuffleArray([...Array(participants.length).keys()]);
    for (let i = 0; i < participants.length; i++) {
      await this.participantRepository.update(participants[i].id, {
        rotationPosition: positions[i]
      });
    }

    return this.tandaRepository.update(tandaId, {
      status: 'active',
      currentRound: 1,
      totalRounds: participants.length
    });
  }

  /**
   * Cancels a tanda
   * @param tandaId - The tanda id
   * @param organizerId - The organizer id
   * @returns The updated tanda
   */
  async cancelTanda(tandaId: string, organizerId: string): Promise<Tanda> {
    const tanda = await this.getTandaById(tandaId);
    if (tanda.organizerId !== organizerId) {
      throw new Error('Only organizer can cancel tanda');
    }
    if (tanda.status === 'completed' || tanda.status === 'cancelled') {
      throw new Error('Tanda is already completed or cancelled');
    }

    return this.tandaRepository.update(tandaId, { status: 'cancelled' });
  }

  /**
   * Advances to next round
   * @param tandaId - The tanda id
   * @param organizerId - The organizer id
   * @returns The updated tanda
   */
  async advanceRound(tandaId: string, organizerId: string): Promise<Tanda> {
    const tanda = await this.getTandaById(tandaId);
    if (tanda.organizerId !== organizerId) {
      throw new Error('Only organizer can advance round');
    }
    if (tanda.status !== 'active') {
      throw new Error('Tanda is not active');
    }
    if (tanda.currentRound >= tanda.totalRounds) {
      throw new Error('Tanda is already completed');
    }

    const nextRound = tanda.currentRound + 1;
    const newStatus = nextRound > tanda.totalRounds ? 'completed' : 'active';

    return this.tandaRepository.update(tandaId, {
      currentRound: nextRound,
      status: newStatus
    });
  }

  /**
   * Lists participants for a tanda
   * @param tandaId - The tanda id
   * @returns Array of participants
   */
  async listParticipants(tandaId: string): Promise<Participant[]> {
    await this.getTandaById(tandaId); // Verify tanda exists
    return this.participantRepository.findByTandaId(tandaId);
  }

  private shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}