# Tech Spec: gs-workshop-vaquita-b

## Overview
A REST API for managing tandas (rotating savings groups). Each tanda has N participants who each contribute a fixed amount per round; one participant receives the full pot per round. The API enforces business rules (min 3 participants, locked rotation, auto-complete) and maintains a transparent ledger via an embedded SQLite database. No external services required.

## Architecture

### Layer Map
```
[Routes] → [Services] → [Domain Types] → [Repositories] → [SQLite via better-sqlite3]
```
Dependencies point inward. Domain types have zero external imports. Routes are thin — they validate input (Zod), call a service, and return the result.

### System Diagram
```
Client
  │
  ▼
Express Router (src/routes/)
  │  Zod validation, JWT auth middleware
  ▼
Services (src/services/)
  │  Business rules, transactions
  ▼
Repositories (src/repositories/)
  │  SQL queries only
  ▼
better-sqlite3 (SQLite file: tanda.db)
```

### Tech Stack
- Runtime: Node.js 22, TypeScript 5
- Framework: Express 4
- Database: SQLite via `better-sqlite3` ^11
- Validation: Zod ^3
- Auth: JWT (jsonwebtoken) — secret from `JWT_SECRET` env var only
- Testing: Vitest ^3 + supertest ^7
- IDs: uuid ^11

### Data Flow
1. Request arrives → route handler extracts and validates body/params via Zod
2. Route calls service method with typed DTOs
3. Service enforces business rules, calls one or more repository methods
4. Repository executes parameterised SQL, returns typed domain objects
5. Service returns result to route → route sends JSON response

## API Contracts

See `docs/spec.md` for the full endpoint table. Key shapes:

**User**: `{ id, email, name }`
**Tanda**: `{ id, name, organizerId, contributionAmount, status, currentRound, totalRounds }`
**Participant**: `{ id, userId, tandaId, role, rotationPosition }`
**Contribution**: `{ id, tandaId, participantId, round, amount, status }`

All 4xx responses: `{ error: string }`
All 201 responses include the created resource in the body.

## Security & Compliance
- JWT secret **only** from `process.env.JWT_SECRET` — never hardcoded
- All SQL is parameterised (no string concatenation)
- Zod validates every request body at the route boundary
- Contribution amounts stored as integer cents to avoid floating-point errors

## Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| express | ^4.21 | HTTP framework |
| better-sqlite3 | ^11.7 | Embedded SQLite |
| zod | ^3.24 | Runtime validation |
| uuid | ^11.1 | ID generation |
| typescript | ^5.7 | Type safety |
| vitest | ^3.0 | Test runner |
| supertest | ^7.0 | HTTP integration tests |

## Risks & Mitigations
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Floating-point money errors | M | H | Store amounts as integer cents |
| SQL injection | L | H | Parameterised queries only |
| Hardcoded JWT secret | L | H | Env-var-only + lint rule |
| Missing rotation lock | M | H | Lock rotation position on FORMING→ACTIVE transition |
