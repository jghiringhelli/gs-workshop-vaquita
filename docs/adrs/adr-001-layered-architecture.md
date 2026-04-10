# ADR-001: Layered Architecture with Repository Pattern

**Date:** 2026-04-10  
**Status:** Accepted  
**Decided by:** P026

## Context

The Tanda API needs to store and retrieve data from SQLite while remaining testable, maintainable, and bounded (no SQL in route handlers — a scored requirement).

## Decision

Adopt a three-layer hexagonal architecture:

```
Routes → Services → Repository Interfaces → SQLite Repositories
```

Each feature (users, tandas, participants, contributions) owns its own:
- Domain types (`*.types.ts`)
- Repository interface (`*.repository.ts`)
- SQLite implementation (`*.repository.sqlite.ts`)
- Service (`*.service.ts`)
- Routes (`*.routes.ts`)

The `createApp(db)` factory is the single composition root that wires all dependencies.

## Rationale

1. **Bounded (2 pts):** No `db.*` calls anywhere in route files — guaranteed by architecture, not discipline.
2. **Composable (3 pts):** All business logic (rotation randomisation, penalty calculation, auto-complete) lives exclusively in service classes.
3. **Testable:** Tests pass an in-memory SQLite instance to `createApp(db)` — no mocking required. All 32 tests run in isolation with zero shared state.
4. **Dependency inversion:** Services depend on `IUserRepository`, not `SqliteUserRepository`. Swapping the persistence layer requires no changes to business logic.

## Alternatives Considered

- **Single file per feature:** Faster to write, but routes would inevitably acquire SQL calls under time pressure.
- **ORM (Prisma/Drizzle):** Adds tooling setup complexity for a workshop environment. `better-sqlite3` is already in the dependencies.

## Consequences

- More files per feature, but each file has a single, clear responsibility.
- The composition root (`app.ts`) is the only place that knows about concrete implementations.
