# ADR-001: Repository Pattern with Factory Injection

**Date**: 2026-04-10
**Status**: Accepted

## Context

The spec requires strict layer separation: route handlers must not contain SQL. Services call repositories; routes call services. We also need the architecture to be testable without a real database file.

## Decision

Use factory functions for repositories, services, and routes. Each layer receives its dependencies as parameters (dependency injection via factories).

- `createUsersRepository(db)` — repository factories accept a `Database.Database` instance
- `createUsersService(repo)` — services accept repository instances
- `createUsersRouter(service)` — routers accept service instances
- `createApp(db)` — wires the full graph; tests pass an in-memory `Database(':memory:')`

## Consequences

- No SQL ever appears in route files (enforced structurally)
- Tests use `new Database(':memory:')` with `runMigrations()` — no test DB setup outside the test file
- Each layer can be unit-tested in isolation by passing a mock dependency
- Slight verbosity at wiring time (`app.ts`) is the only trade-off
