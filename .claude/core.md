# vaquita-B — Core

> Always loaded. Contains only what is true across all domains.
> Hard limit: 50 lines. If it grows, move the excess to a domain node.

## Domain Identity
The problem: the money always disappears. This API solves that: transparent ledger, enforced business rules, rotation locked at start. A tanda needs **at least 3 participants** to start.

## Tags
[UNIVERSAL] [API] [DATABASE] [LIBRARY] [FINTECH]

## Primary Entities
- ## Tech Stack

- TypeScript + Node.js
- Express (or Hono)
- SQLite via `better-sqlite3` — no database setup needed
- Zod for input validation
- Vitest + supertest for testing
- JWT for auth (secret from env var only — never hardcoded)

## Non-Functional Requirements

- **Layer separation**: route handlers must not contain SQL.
- Services call repositories; routes call services.

## Layer Map
```
[API/CLI] → [Services] → [Domain] → [Repositories] → [Infrastructure]
Dependencies point inward. Domain has zero external imports.
```

## Invariants
- Every public function has a JSDoc with typed params and returns
- No circular imports (enforced by pre-commit hook)
- Test coverage ≥80% on all changed files