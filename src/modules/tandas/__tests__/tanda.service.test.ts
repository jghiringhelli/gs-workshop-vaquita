import { describe, it, expect } from 'vitest';
import { TandaService } from '../tanda.service.js';
import { ITandaRepository, IParticipantRepository, IContributionRepository } from '../tanda.port.js';
import { IUserRepository } from '../../users/user.port.js';
import { Tanda, Participant, Contribution } from '../tanda.entity.js';
import { User } from '../../users/user.entity.js';
import {
  ValidationError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  UnprocessableError,
} from '../../../shared/exceptions/index.js';

// ── In-memory stubs ───────────────────────────────────────────────────────

class StubUserRepo implements IUserRepository {
  private store: User[] = [];
  private seq = 0;
  seed(users: User[]) { this.store = [...users]; }
  create(data: Omit<User, 'id'>): User { const u = { id: `u-${++this.seq}`, ...data }; this.store.push(u); return u; }
  findById(id: string) { return this.store.find((u) => u.id === id) ?? null; }
  findAll() { return [...this.store]; }
  findByEmail(email: string) { return this.store.find((u) => u.email === email) ?? null; }
}

class StubTandaRepo implements ITandaRepository {
  private store: Tanda[] = [];
  private seq = 0;
  create(data: Omit<Tanda, 'id'>): Tanda { const t = { id: `t-${++this.seq}`, ...data }; this.store.push(t); return t; }
  findById(id: string) { return this.store.find((t) => t.id === id) ?? null; }
  findByUserId(userId: string) {
    const ids = new Set(participantStore.filter((p) => p.userId === userId).map((p) => p.tandaId));
    return this.store.filter((t) => ids.has(t.id));
  }
  update(id: string, updates: Partial<Omit<Tanda, 'id'>>): Tanda {
    const idx = this.store.findIndex((t) => t.id === id);
    this.store[idx] = { ...this.store[idx]!, ...updates };
    return this.store[idx]!;
  }
}

let participantStore: Participant[] = [];

class StubParticipantRepo implements IParticipantRepository {
  private seq = 0;
  create(data: Omit<Participant, 'id'>): Participant {
    const p = { id: `p-${++this.seq}`, ...data };
    participantStore.push(p);
    return p;
  }
  findByTandaId(tandaId: string) { return participantStore.filter((p) => p.tandaId === tandaId); }
  findByUserAndTanda(userId: string, tandaId: string) {
    return participantStore.find((p) => p.userId === userId && p.tandaId === tandaId) ?? null;
  }
  assignPositions(assignments: Array<{ id: string; rotationPosition: number }>) {
    for (const a of assignments) {
      const p = participantStore.find((x) => x.id === a.id);
      if (p) p.rotationPosition = a.rotationPosition;
    }
  }
}

class StubContributionRepo implements IContributionRepository {
  private store: Contribution[] = [];
  private seq = 0;
  create(data: Omit<Contribution, 'id'>): Contribution { const c = { id: `c-${++this.seq}`, ...data }; this.store.push(c); return c; }
  findByTandaAndRound(tandaId: string, round: number) { return this.store.filter((c) => c.tandaId === tandaId && c.round === round); }
  findByParticipant(participantId: string) { return this.store.filter((c) => c.participantId === participantId); }
  findByParticipantAndRound(participantId: string, round: number) {
    return this.store.find((c) => c.participantId === participantId && c.round === round) ?? null;
  }
  updateStatus(id: string, status: Contribution['status']): Contribution {
    const c = this.store.find((x) => x.id === id)!;
    c.status = status;
    return c;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

function makeService() {
  participantStore = [];
  const userRepo = new StubUserRepo();
  const tandaRepo = new StubTandaRepo();
  const participantRepo = new StubParticipantRepo();
  const contributionRepo = new StubContributionRepo();
  const service = new TandaService(tandaRepo, participantRepo, contributionRepo, userRepo);
  return { service, userRepo, tandaRepo, participantRepo, contributionRepo };
}

/** Seeds 3 users and creates a tanda with all 3 joined */
function seedActiveTanda(service: TandaService, userRepo: StubUserRepo) {
  const alice = userRepo.create({ email: 'alice@e.com', name: 'Alice' });
  const bob = userRepo.create({ email: 'bob@e.com', name: 'Bob' });
  const carol = userRepo.create({ email: 'carol@e.com', name: 'Carol' });

  const tanda = service.create({ name: 'T1', organizerId: alice.id, contributionAmount: 100 });
  service.join(tanda.id, { userId: bob.id });
  service.join(tanda.id, { userId: carol.id });
  return { tanda, alice, bob, carol };
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('TandaService', () => {
  describe('create', () => {
    it('creates a tanda in FORMING status and auto-joins the organizer', () => {
      const { service, userRepo, participantRepo } = makeService();
      const alice = userRepo.create({ email: 'alice@e.com', name: 'Alice' });

      const tanda = service.create({ name: 'Tanda Enero', organizerId: alice.id, contributionAmount: 500 });

      expect(tanda.status).toBe('forming');
      expect(tanda.organizerId).toBe(alice.id);
      expect(tanda.currentRound).toBe(0);
      expect(tanda.totalRounds).toBe(0);

      const participants = participantRepo.findByTandaId(tanda.id);
      expect(participants).toHaveLength(1);
      expect(participants[0]!.role).toBe('organizer');
      expect(participants[0]!.userId).toBe(alice.id);
    });

    it('throws NotFoundError when organizerId does not exist', () => {
      const { service } = makeService();
      expect(() =>
        service.create({ name: 'T', organizerId: 'nonexistent', contributionAmount: 100 }),
      ).toThrowError(NotFoundError);
    });
  });

  describe('join', () => {
    it('adds a member participant', () => {
      const { service, userRepo } = makeService();
      const alice = userRepo.create({ email: 'alice@e.com', name: 'Alice' });
      const bob = userRepo.create({ email: 'bob@e.com', name: 'Bob' });
      const tanda = service.create({ name: 'T', organizerId: alice.id, contributionAmount: 100 });

      const participant = service.join(tanda.id, { userId: bob.id });

      expect(participant.role).toBe('member');
      expect(participant.userId).toBe(bob.id);
    });

    it('throws ConflictError when user is already a participant', () => {
      const { service, userRepo } = makeService();
      const alice = userRepo.create({ email: 'alice@e.com', name: 'Alice' });
      const tanda = service.create({ name: 'T', organizerId: alice.id, contributionAmount: 100 });

      expect(() => service.join(tanda.id, { userId: alice.id })).toThrowError(ConflictError);
    });

    it('throws UnprocessableError when tanda is not FORMING', () => {
      const { service, userRepo } = makeService();
      const { tanda, alice } = seedActiveTanda(service, userRepo);
      service.start(tanda.id, { userId: alice.id });

      const dave = userRepo.create({ email: 'dave@e.com', name: 'Dave' });
      expect(() => service.join(tanda.id, { userId: dave.id })).toThrowError(UnprocessableError);
    });

    it('throws NotFoundError when userId does not exist', () => {
      const { service, userRepo } = makeService();
      const alice = userRepo.create({ email: 'alice@e.com', name: 'Alice' });
      const tanda = service.create({ name: 'T', organizerId: alice.id, contributionAmount: 100 });

      expect(() => service.join(tanda.id, { userId: 'ghost' })).toThrowError(NotFoundError);
    });
  });

  describe('start', () => {
    it('transitions tanda to ACTIVE and assigns rotation positions', () => {
      const { service, userRepo } = makeService();
      const { tanda, alice } = seedActiveTanda(service, userRepo);

      const started = service.start(tanda.id, { userId: alice.id });

      expect(started.status).toBe('active');
      expect(started.currentRound).toBe(1);
      expect(started.totalRounds).toBe(3);
    });

    it('assigns a rotation position to every participant', () => {
      const { service, userRepo, participantRepo } = makeService();
      const { tanda, alice } = seedActiveTanda(service, userRepo);
      service.start(tanda.id, { userId: alice.id });

      const participants = participantRepo.findByTandaId(tanda.id);
      const positions = participants.map((p) => p.rotationPosition).sort();
      expect(positions).toEqual([1, 2, 3]);
    });

    it('throws ValidationError when fewer than 3 participants', () => {
      const { service, userRepo } = makeService();
      const alice = userRepo.create({ email: 'alice@e.com', name: 'Alice' });
      const bob = userRepo.create({ email: 'bob@e.com', name: 'Bob' });
      const tanda = service.create({ name: 'T', organizerId: alice.id, contributionAmount: 100 });
      service.join(tanda.id, { userId: bob.id });

      expect(() => service.start(tanda.id, { userId: alice.id })).toThrowError(ValidationError);
    });

    it('throws ForbiddenError when caller is not the organizer', () => {
      const { service, userRepo } = makeService();
      const { tanda, bob } = seedActiveTanda(service, userRepo);

      expect(() => service.start(tanda.id, { userId: bob.id })).toThrowError(ForbiddenError);
    });

    it('throws UnprocessableError when tanda is not FORMING', () => {
      const { service, userRepo } = makeService();
      const { tanda, alice } = seedActiveTanda(service, userRepo);
      service.start(tanda.id, { userId: alice.id });

      expect(() => service.start(tanda.id, { userId: alice.id })).toThrowError(UnprocessableError);
    });
  });

  describe('cancel', () => {
    it('cancels a FORMING tanda', () => {
      const { service, userRepo } = makeService();
      const alice = userRepo.create({ email: 'alice@e.com', name: 'Alice' });
      const tanda = service.create({ name: 'T', organizerId: alice.id, contributionAmount: 100 });

      const result = service.cancel(tanda.id, { userId: alice.id });
      expect(result.status).toBe('cancelled');
    });

    it('throws ForbiddenError when caller is not the organizer', () => {
      const { service, userRepo } = makeService();
      const { tanda, bob } = seedActiveTanda(service, userRepo);

      expect(() => service.cancel(tanda.id, { userId: bob.id })).toThrowError(ForbiddenError);
    });

    it('throws UnprocessableError when tanda is already cancelled', () => {
      const { service, userRepo } = makeService();
      const alice = userRepo.create({ email: 'alice@e.com', name: 'Alice' });
      const tanda = service.create({ name: 'T', organizerId: alice.id, contributionAmount: 100 });
      service.cancel(tanda.id, { userId: alice.id });

      expect(() => service.cancel(tanda.id, { userId: alice.id })).toThrowError(UnprocessableError);
    });
  });

  describe('advanceRound', () => {
    it('increments currentRound when not the last round', () => {
      const { service, userRepo } = makeService();
      const { tanda, alice } = seedActiveTanda(service, userRepo);
      service.start(tanda.id, { userId: alice.id });

      const result = service.advanceRound(tanda.id, { userId: alice.id });
      expect(result.currentRound).toBe(2);
      expect(result.status).toBe('active');
    });

    it('auto-completes the tanda after the last round', () => {
      const { service, userRepo } = makeService();
      const { tanda, alice } = seedActiveTanda(service, userRepo);
      service.start(tanda.id, { userId: alice.id });

      service.advanceRound(tanda.id, { userId: alice.id }); // round 2
      service.advanceRound(tanda.id, { userId: alice.id }); // round 3

      const result = service.advanceRound(tanda.id, { userId: alice.id }); // completes
      expect(result.status).toBe('completed');
    });

    it('throws ForbiddenError when caller is not the organizer', () => {
      const { service, userRepo } = makeService();
      const { tanda, bob } = seedActiveTanda(service, userRepo);
      service.start(tanda.id, { userId: userRepo.findByEmail('alice@e.com')!.id });

      expect(() => service.advanceRound(tanda.id, { userId: bob.id })).toThrowError(ForbiddenError);
    });

    it('throws UnprocessableError when tanda is not ACTIVE', () => {
      const { service, userRepo } = makeService();
      const alice = userRepo.create({ email: 'alice@e.com', name: 'Alice' });
      const tanda = service.create({ name: 'T', organizerId: alice.id, contributionAmount: 100 });

      expect(() => service.advanceRound(tanda.id, { userId: alice.id })).toThrowError(
        UnprocessableError,
      );
    });
  });
});


