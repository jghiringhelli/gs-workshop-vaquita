# Tanda API

A REST API for managing **tandas** (rotating savings groups / vaquitas). N participants each contribute a fixed amount every round; one participant receives the full pot per round. After N rounds, everyone has received exactly once.

## What was built

Full implementation of the Tanda API spec including:

- **Users** — create, list, get by ID
- **Tandas** — create, list (by user), get details, start, cancel, advance rounds
- **Participants** — join a tanda, list participants, contribution history
- **Contributions** — record per-round contributions, round summary

### Architecture

```
src/
  config.ts                   — env-driven constants (MAX_PARTICIPANTS, LATE_PENALTY_PCT, etc.)
  errors.ts                   — typed error hierarchy (NotFoundError, ForbiddenError, …)
  db.ts                       — SQLite singleton via better-sqlite3
  types.ts                    — shared TypeScript interfaces
  repositories/               — all SQL lives here, nowhere else
    users.repository.ts
    tandas.repository.ts
    participants.repository.ts
    contributions.repository.ts
  services/                   — business logic; calls repositories, throws domain errors
    users.service.ts
    tandas.service.ts
  routes/                     — HTTP translation only; no SQL, no business logic
    users.routes.ts
    tandas.routes.ts
  middleware/
    errorHandler.ts           — maps AppError / ZodError to HTTP responses
  __tests__/
    users.test.ts
    tandas.test.ts
```

### Business rules enforced

1. Minimum 3 participants to start a tanda
2. Maximum 20 participants (configurable via `MAX_PARTICIPANTS` env var)
3. Organizer auto-joins as first participant on tanda creation
4. Rotation order randomised (Fisher-Yates) when tanda starts
5. Contributions recorded per-round; late payments (below contribution amount) flagged as `late`
6. Unpaid contributions become `missed` when a round is advanced
7. Participant flagged as defaulter after 2 consecutive missed contributions
8. Only organizer can start, cancel, or advance rounds
9. Tanda auto-completes after the final round is advanced
10. Status transitions: `forming → active → completed` or `forming/active → cancelled`

## Setup

```bash
npm install
npm run dev     # starts on http://localhost:3000
npm test        # run tests
npm run typecheck  # TypeScript check
```

## Acceptance check

```bash
# Create a user
curl -s -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","name":"Alice"}'

# Create a tanda
curl -s -X POST http://localhost:3000/api/tandas \
  -H "Content-Type: application/json" \
  -d '{"name":"Tanda Enero","organizerId":1,"contributionAmount":1000}'

# List tandas for a user
curl -s "http://localhost:3000/api/tandas?userId=1"
```

## Tech stack

- TypeScript + Node.js + Express
- SQLite via `better-sqlite3`
- Zod for input validation
- Vitest + supertest for testing

## Scoring

Every push to `participant/PXXX` triggers automated scoring via GitHub Actions. See `HOW_IT_WORKS.md` for details.
