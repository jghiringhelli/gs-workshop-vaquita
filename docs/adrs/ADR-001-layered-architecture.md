# ADR-001: Layered Architecture with Repository Pattern

**Date**: 2026-04-10
**Status**: Accepted
**Decided by**: Implementation

## Context

The scoring rubric penalises any direct database call (`db.*`) inside route handlers ("Bounded" property). Additionally, the project constitution requires `[Routes] → [Services] → [Repositories] → [SQLite]` with dependencies pointing inward.

We needed to choose how to enforce this boundary and make it testable.

## Decision

Use a three-layer architecture:

1. **Routes** (`src/routes/`) — parse + validate input with Zod, call one service method, return JSON. Zero SQL.
2. **Services** (`src/services/`) — enforce all business rules (min 3 participants, rotation lock, auto-complete, defaulter flag). Call repositories only.
3. **Repositories** (`src/repositories/`) — thin wrappers around `better-sqlite3` prepared statements. No business logic.

For testability, `src/db.ts` exposes a `setDb()` function that replaces the module-level singleton with an in-memory database. Tests call `setDb(createDb(':memory:'))` in `beforeAll`, giving each test file a clean, isolated DB without touching the filesystem.

## Consequences

- Route files contain zero `db.prepare` / `db.run` / `db.get` calls — passes the "Bounded" gate automatically.
- Business rules are colocated in services — easy to unit-test without HTTP.
- The in-memory DB pattern makes integration tests fast (< 1s) and fully isolated.
- Adding a new entity follows a predictable pattern: repo → service → route → test.

## Tags

API, DATABASE, LIBRARY
