# Tanda API — Spec

A **tanda** (also called *vaquita*) is an informal rotating savings group common in Mexico
and Latin America. N participants each contribute a fixed amount every round. Each round,
one participant receives the full pot. After N rounds, every participant has received exactly
once.

The problem: the money always disappears. The organiser holds it and there is no accountability.

This API solves that: transparent ledger, enforced business rules, rotation locked at start.

## Domain Model

- **User**: `id`, `email`, `name`
- **Tanda**: `id`, `name`, `organizerId`, `contributionAmount`, `status` (`forming`|`active`|`completed`|`cancelled`), `currentRound`, `totalRounds`
- **Participant**: `id`, `userId`, `tandaId`, `role` (`organizer`|`member`), `rotationPosition`
- **Contribution**: `id`, `tandaId`, `participantId`, `round`, `amount`, `status` (`pending`|`paid`|`late`|`missed`)

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/users` | Create a user |
| `GET` | `/api/users` | List users |
| `GET` | `/api/users/:id` | Get user by ID |
| `POST` | `/api/tandas` | Create a tanda (creator = organizer, auto-joins) |
| `GET` | `/api/tandas` | List tandas for a user (`?userId=`) |
| `GET` | `/api/tandas/:id` | Get tanda details |
| `POST` | `/api/tandas/:id/join` | Join a tanda |
| `POST` | `/api/tandas/:id/start` | Start (organizer only — FORMING → ACTIVE) |
| `POST` | `/api/tandas/:id/cancel` | Cancel (organizer only) |
| `GET` | `/api/tandas/:id/participants` | List participants |
| `POST` | `/api/tandas/:id/contributions` | Record a contribution for the current round |
| `GET` | `/api/tandas/:id/rounds/:round` | Round summary |
| `POST` | `/api/tandas/:id/advance` | Advance to next round (organizer only) |
| `GET` | `/api/tandas/:id/participants/:pid/history` | Contribution history for a participant |

## Business Rules

1. A tanda needs **at least 3 participants** to start.
2. Maximum **20 participants** per tanda (configurable).
3. The organizer is automatically the first participant.
4. Rotation order is **randomized** when the tanda transitions FORMING → ACTIVE.
5. Contributions must be recorded within the round's contribution window.
6. Late contributions incur a **5% penalty fee** (configurable).
7. A participant who misses **2 consecutive contributions** is flagged as defaulter.
8. Only the **organizer** can advance to the next round.
9. The tanda **auto-completes** after the last round.
10. Status transitions: `FORMING → ACTIVE → COMPLETED` or `FORMING/ACTIVE → CANCELLED`.

## Tech Stack

- TypeScript + Node.js
- Express (or Hono)
- SQLite via `better-sqlite3` — no database setup needed
- Zod for input validation
- Vitest + supertest for testing
- JWT for auth (secret from env var only — never hardcoded)

## Non-Functional Requirements

- **Layer separation**: route handlers must not contain SQL. Services call repositories; routes call services.
- **Error hierarchy**: custom error classes, not bare `throw new Error()`.
- **Config**: all magic numbers (max participants, penalty %) are named constants from environment config.
- **Tests**: every endpoint needs at least a happy-path and a 4xx test.

## Acceptance Check

```bash
# Create a user
curl -s -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","name":"Alice"}'

# Create a tanda
curl -s -X POST http://localhost:3000/api/tandas \
  -H "Content-Type: application/json" \
  -d '{"name":"Tanda Enero","organizerId":1,"contributionAmount":1000}'

# List tandas
curl -s "http://localhost:3000/api/tandas?userId=1"
```
