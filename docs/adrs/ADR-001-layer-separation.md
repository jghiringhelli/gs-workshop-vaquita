# ADR-001: Layer Separation — Routes, Services, and Repositories

**Status:** Accepted  
**Date:** 2026-04-10  
**Author:** P042

---

## Problem

The "Bounded" requirement in the scoring rubric forbids direct database calls inside route handlers. Without a clear architecture, business logic tends to be scattered across files, making the code harder to test, maintain, and reuse.

---

## Context

- The Tandas API must enforce complex business rules (min 3 participants, random rotation, late penalties, auto-complete cycle).
- ≥60% test coverage is required.
- No SQL is allowed in route handlers.
- The architecture should make it easy to unit test business logic without touching the database.

---

## Decision

Implement a **three-layer architecture**:

### 1. **Routes Layer** (`src/routes/`)
- Only defines HTTP endpoints
- Delegates all logic to services
- Validates input with Zod
- Returns HTTP responses (no DB access)
- **Responsibility:** Translate HTTP to service calls

### 2. **Services Layer** (`src/services/`)
- Contains all business logic
- Applies business rules (validations, state transitions, calculations)
- Calls repositories for data access
- Can be tested without a DB using mocks
- **Responsibility:** Orchestrate domain logic

### 3. **Repositories Layer** (`src/repositories/`)
- Exclusive access to the database
- Encapsulates SQL queries
- CRUD methods and domain-specific queries
- **Responsibility:** Data persistence and retrieval

### Folder structure:
```
src/
  config/          — Constants and environment variables
  models/          — TypeScript types and Zod schemas
  repositories/    — DB access (only SQL here)
  services/        — Business logic
  routes/          — HTTP handlers (delegation only)
  utils/           — Shared helpers
  index.ts         — Entry point (Express app)
```

---

## Benefits

1. **Testability:** Repositories can be mocked to test services without a DB.
2. **Reusability:** Business logic (services) is independent of HTTP and can be reused.
3. **Maintainability:** DB changes only affect repositories; rule changes only affect services.
4. **Compliance:** Ensures no SQL in routes ("Bounded" requirement = 2 pts).
5. **Scalability:** Makes it easy to add new endpoints without duplicating logic.

---

## Impact

- **Positive:** Better separation of concerns, more predictable code.
- **Cost:** Requires creating and maintaining more files (small initial overhead).

---

## Alternatives considered

1. **Everything in routes** — Simple at first, but leads to duplicated logic and would violate "Bounded".
2. **Only services, no repositories** — Mixes logic with SQL, reducing testability.
3. **Full Domain-Driven Design** — More robust but overkill for this project.

**Decision:** The selected option balances simplicity and requirements compliance.

---

## Example flow

```
POST /api/tandas
  ↓
Routes: validate with Zod
  ↓
Service: apply business rules (min 3 participants, etc.)
  ↓
Repository: insert into DB
  ↓
Routes: return HTTP 201 response
```
