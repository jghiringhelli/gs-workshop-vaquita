# Tanda API

A REST API for managing **tandas** (rotating savings groups / vaquitas). A tanda is an informal rotating savings group where N participants each contribute a fixed amount every round, and one participant receives the full pot each round. After N rounds, everyone has received exactly once.

## What was built

A fully functional API with 14 endpoints covering the complete tanda lifecycle:

- **User management**: create, list, get users (JWT token issued on creation)
- **Tanda CRUD**: create tandas, list by user, get details with participants
- **Participation**: join tandas, list participants, enforce max capacity
- **Lifecycle**: start (randomizes rotation), cancel, advance rounds, auto-complete
- **Contributions**: record payments, track round summaries, participant history

### Architecture

Layered architecture with strict separation of concerns:

```
Routes (HTTP) -> Services (business logic) -> Repositories (SQL)
```

- **No SQL in route handlers** — all database access through repository layer
- **Custom error hierarchy** — AppError, NotFoundError, ValidationError, ForbiddenError, etc.
- **Zod validation** on all inputs
- **JWT auth** via HMAC-SHA256 (built with Node crypto, no external dependency)
- **Config from env vars** — JWT_SECRET, MAX_PARTICIPANTS, LATE_PENALTY_PERCENT

### Business rules enforced

1. Minimum 3 participants to start a tanda
2. Maximum 20 participants (configurable)
3. Organizer auto-joins as first participant on creation
4. Rotation order randomized when tanda starts (FORMING -> ACTIVE)
5. Late contributions incur 5% penalty (configurable)
6. 2 consecutive missed contributions flags participant as defaulter
7. Only the organizer can start, cancel, or advance rounds
8. Tanda auto-completes after the last round

### Tech stack

- TypeScript (strict mode) + Express
- SQLite via better-sqlite3
- Zod for input validation
- Vitest + supertest for testing
- JWT for auth (secret from env var only)

## Setup

```bash
npm install
cp .env.example .env    # configure JWT_SECRET
npm run dev             # starts on http://localhost:3000
npm test                # run tests
npm run typecheck       # check types
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/users | No | Create user (returns JWT token) |
| GET | /api/users | No | List users |
| GET | /api/users/:id | No | Get user |
| POST | /api/tandas | Yes | Create tanda |
| GET | /api/tandas | Optional | List tandas (?userId=) |
| GET | /api/tandas/:id | Optional | Get tanda with participants |
| POST | /api/tandas/:id/join | Yes | Join tanda |
| POST | /api/tandas/:id/start | Yes | Start tanda (organizer) |
| POST | /api/tandas/:id/cancel | Yes | Cancel tanda (organizer) |
| GET | /api/tandas/:id/participants | Optional | List participants |
| POST | /api/tandas/:id/contributions | Yes | Record contribution |
| GET | /api/tandas/:id/rounds/:round | Optional | Round summary |
| POST | /api/tandas/:id/advance | Yes | Advance round (organizer) |
| GET | /api/tandas/:id/participants/:pid/history | Optional | Contribution history |
