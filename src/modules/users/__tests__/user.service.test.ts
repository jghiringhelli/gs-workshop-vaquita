import { describe, it, expect, beforeEach } from 'vitest';
import { UserService } from '../user.service.js';
import { IUserRepository } from '../user.port.js';
import { User } from '../user.entity.js';
import { ConflictError, NotFoundError } from '../../../shared/exceptions/index.js';

/** In-memory stub for IUserRepository */
class InMemoryUserRepo implements IUserRepository {
  private store: User[] = [];

  create(data: Omit<User, 'id'>): User {
    const user: User = { id: `id-${this.store.length + 1}`, ...data };
    this.store.push(user);
    return user;
  }
  findById(id: string): User | null {
    return this.store.find((u) => u.id === id) ?? null;
  }
  findAll(): User[] {
    return [...this.store];
  }
  findByEmail(email: string): User | null {
    return this.store.find((u) => u.email === email) ?? null;
  }
}

describe('UserService', () => {
  let repo: InMemoryUserRepo;
  let service: UserService;

  beforeEach(() => {
    repo = new InMemoryUserRepo();
    service = new UserService(repo);
  });

  describe('create', () => {
    it('creates a user and returns it with an id', () => {
      const user = service.create({ email: 'alice@example.com', name: 'Alice' });
      expect(user.id).toBeDefined();
      expect(user.email).toBe('alice@example.com');
      expect(user.name).toBe('Alice');
    });

    it('throws ConflictError when email is already registered', () => {
      service.create({ email: 'alice@example.com', name: 'Alice' });
      expect(() => service.create({ email: 'alice@example.com', name: 'Alice 2' })).toThrowError(
        ConflictError,
      );
    });
  });

  describe('findAll', () => {
    it('returns empty array when no users exist', () => {
      expect(service.findAll()).toEqual([]);
    });

    it('returns all created users', () => {
      service.create({ email: 'a@example.com', name: 'A' });
      service.create({ email: 'b@example.com', name: 'B' });
      expect(service.findAll()).toHaveLength(2);
    });
  });

  describe('findById', () => {
    it('returns the user when found', () => {
      const created = service.create({ email: 'alice@example.com', name: 'Alice' });
      expect(service.findById(created.id)).toMatchObject({ email: 'alice@example.com' });
    });

    it('throws NotFoundError when user does not exist', () => {
      expect(() => service.findById('nonexistent')).toThrowError(NotFoundError);
    });
  });
});

