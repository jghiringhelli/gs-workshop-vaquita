import type Database from "better-sqlite3";

import { NotImplementedAppError } from "../../lib/errors";
import type { CreateUserInput, User } from "./users.types";

export interface UserRepository {
  create(input: CreateUserInput): User;
  findById(id: number): User | null;
  list(): ReadonlyArray<User>;
}

export class SqliteUserRepository implements UserRepository {
  public constructor(private readonly database: Database.Database) {
    void this.database;
  }

  /**
   * Persists a user in SQLite.
   * @param _input User creation payload.
   * @returns Persisted user projection.
   */
  public create(_input: CreateUserInput): User {
    throw new NotImplementedAppError("SqliteUserRepository.create is not implemented yet.");
  }

  /**
   * Finds a user by identifier.
   * @param _id User identifier.
   * @returns Matching user or null.
   */
  public findById(_id: number): User | null {
    throw new NotImplementedAppError("SqliteUserRepository.findById is not implemented yet.");
  }

  /**
   * Lists all registered users.
   * @returns All users.
   */
  public list(): ReadonlyArray<User> {
    throw new NotImplementedAppError("SqliteUserRepository.list is not implemented yet.");
  }
}