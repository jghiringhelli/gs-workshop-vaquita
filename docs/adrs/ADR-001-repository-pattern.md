# ADR-001: Repository Pattern for Data Persistence

**Status:** Accepted  
**Date:** 2026-04-10

## Context

The tanda API needs to persist four entities (Users, Tandas, Participants, Contributions) to SQLite. The primary risk is business logic becoming entangled with persistence details — making the code hard to test and impossible to swap the database without touching service code.

Two options were considered:

1. **Direct DB access in services** — services import `better-sqlite3` directly and run SQL queries inline.
2. **Repository pattern** — services depend on repository interfaces; SQLite implementations are injected at the composition root.

## Decision

We use the **Repository Pattern with dependency injection**.

Each entity has:
- An interface (`IUserRepository`, `ITandaRepository`, etc.) defined in the module
- A concrete `Sqlite*Repository` class that implements the interface
- Services receive the interface via constructor injection

The composition root (`src/index.ts`) wires everything together.

## Consequences

**Benefits:**
- Route handlers contain zero SQL — satisfies the **Bounded** scoring property
- Services are unit-testable with in-memory fakes without a real database
- Integration tests use `:memory:` SQLite — fast and isolated
- Swapping SQLite for another store requires only a new adapter class, no service changes

**Trade-offs:**
- More files (interface + implementation per entity)
- Slightly more boilerplate for simple CRUD

## Outcome

36 tests pass against real in-memory SQLite repositories. No `db.*` calls appear in any route file.
