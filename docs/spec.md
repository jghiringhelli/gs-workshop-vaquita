# Tanda API — Spec

A **tanda** (also called *vaquita*) is an informal rotating savings group common in Mexico
and Latin America. N participants each contribute a fixed amount every round. Each round,
one participant receives the full pot. After N rounds, every participant has received exactly
once.

The problem: the money always disappears. The organiser holds it and there is no accountability.

This API solves that: transparent ledger, enforced business rules, rotation locked at start.

## Domain Model

- **User**: `id`, `email`, `name`
- **Tanda**: `id`, `name`, `organizerId`, `contributionAmount`, `status` (`forming`|`active`|`completed`|`cancelled`), `currentRound`, `totalRounds`, `currentRoundStartedAt`
- **Participant**: `id`, `userId`, `tandaId`, `role` (`organizer`|`member`), `rotationPosition`, `isDefaulter`
- **Contribution**: `id`, `tandaId`, `participantId`, `round`, `amount`, `status` (`pending`|`paid`|`late`|`missed`), `paidAt`

### Field semantics

| Field | Notes |
|-------|-------|
| `Tanda.currentRound` | `0` while forming; set to `1` on `start`; incremented on each `advance` |
| `Tanda.totalRounds` | `0` while forming; set atomically to the participant count during `FORMING → ACTIVE` — **never set at creation time** |
| `Tanda.currentRoundStartedAt` | `null` while forming; set to `now()` on `start` and on every `advance` |
| `Participant.rotationPosition` | `null` while forming; assigned 1-based during `FORMING → ACTIVE`; immutable after that |
| `Participant.isDefaulter` | `false` by default; set to `true` when 2 consecutive `missed` contributions are detected at `advance` time |
| `Contribution.amount` | **Actual amount paid**: `contributionAmount` for on-time, `contributionAmount × (1 + LATE_PENALTY_RATE)` for late. Use `status` to distinguish `paid` from `late` — do not infer lateness from the amount |

### Uniqueness constraints

- A user can only join a tanda once: `(userId, tandaId)` is unique on Participant.
- One contribution slot per participant per round: `(participantId, round)` is unique on Contribution.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/users` | Create a user |
| `GET` | `/api/users` | List users |
| `GET` | `/api/users/:id` | Get user by ID |
| `POST` | `/api/tandas` | Create a tanda (creator = organizer, auto-joins in same transaction) |
| `GET` | `/api/tandas` | List tandas for a user (`?userId=`) |
| `GET` | `/api/tandas/:id` | Get tanda details |
| `POST` | `/api/tandas/:id/join` | Join a tanda (must be `forming`) |
| `POST` | `/api/tandas/:id/start` | Start — `FORMING → ACTIVE` (organizer only) |
| `POST` | `/api/tandas/:id/cancel` | Cancel (organizer only) |
| `GET` | `/api/tandas/:id/participants` | List participants with rotation positions |
| `POST` | `/api/tandas/:id/contributions` | Record a contribution for the current round |
| `GET` | `/api/tandas/:id/rounds/:round` | Round summary (contributions + pot recipient) |
| `POST` | `/api/tandas/:id/advance` | Advance to next round (organizer only) |
| `GET` | `/api/tandas/:id/participants/:pid/history` | Contribution history for a participant |

## Business Rules

1. **Minimum participants**: a tanda needs at least 3 participants to start. Reject `start` with 422 if count < 3.

2. **Maximum participants**: at most `MAX_PARTICIPANTS` (default 20, configurable) members per tanda. Reject `join` with 422 if already at the limit.

3. **Organizer auto-join**: when a tanda is created, the organizer is inserted as a Participant (role = `organizer`) in the **same database transaction** as the Tanda insert. The tanda must never exist without at least one participant.

4. **Rotation assignment** (start transition):
   - Shuffle the participant list using Fisher-Yates.
   - Assign `rotationPosition` 1…N to each participant.
   - Set `totalRounds = N` (participant count).
   - Set `currentRound = 1`.
   - Set `currentRoundStartedAt = now()`.
   - All of the above **must execute in a single database transaction**. If any step fails the entire start is rolled back.

5. **Contribution acceptance window**: a contribution is accepted only when:
   - `tanda.status === 'active'`, AND
   - the submitted `round` equals `tanda.currentRound`.
   Contributions targeting any other round are rejected with 422.

6. **Late contributions**: a contribution is **`late`** (and penalised) if it is recorded after `currentRoundStartedAt + ROUND_DURATION_DAYS`. The stored `amount` is `contributionAmount × (1 + LATE_PENALTY_RATE)` and status is set to `late`. If recorded within the window, `amount = contributionAmount` and status is `paid`.

7. **Advance — close the round**:
   When `advance` is called the following steps execute **in a single transaction**:
   a. Any contribution still in `pending` status for `currentRound` is set to `missed`.
   b. For every participant, check whether their contributions for rounds `currentRound` and `currentRound - 1` are both `missed`. If so, set `isDefaulter = true` on that participant. (Round `currentRound - 1` is skipped for round 1 since there is no prior round.)
   c. If `currentRound < totalRounds`: set `currentRound += 1`, `currentRoundStartedAt = now()`.
   d. If `currentRound === totalRounds`: set `status = completed`. The tanda is now closed.

8. **Organizer-only actions**: `start`, `cancel`, and `advance` require the requesting user to be the organizer (`Participant.role === 'organizer'`). Return 403 Forbidden otherwise.

9. **Auto-complete**: handled by step 7d above. Do not expose a separate complete endpoint.

10. **Status transitions** — only the following are valid; all others return 422:

    | From | To | Trigger |
    |------|----|---------|
    | `forming` | `active` | `POST /start` |
    | `active` | `completed` | `POST /advance` (last round) |
    | `forming` | `cancelled` | `POST /cancel` |
    | `active` | `cancelled` | `POST /cancel` |

    `completed → cancelled` is **explicitly forbidden** and must return 422.

11. **Pot recipient**: in round N, the participant whose `rotationPosition === N` receives the full pot. This is a read-only derived value — the pot recipient is always returned in the round summary response.

## Round Summary Response

`GET /api/tandas/:id/rounds/:round` must include:

- `round` number
- `potRecipient` — the participant (with user details) whose `rotationPosition === round`
- `potAmount` — `contributionAmount × totalRounds` (nominal; does not include penalties)
- `contributions` — list of all participants with their contribution status and amount for this round

## Tech Stack

- TypeScript + Node.js
- Express (or Hono)
- SQLite via Prisma + `better-sqlite3`
- Zod for input validation
- Vitest + supertest for testing
- JWT for auth (secret from env var only — never hardcoded)

## Non-Functional Requirements

- **Layer separation**: route handlers must not contain database calls. Services call repositories; routes call services.
- **Error hierarchy**: custom error classes, not bare `throw new Error()`.
- **Config**: all magic numbers (`MAX_PARTICIPANTS`, `LATE_PENALTY_RATE`, `ROUND_DURATION_DAYS`) are named constants read from environment variables.
- **Atomicity**: rotation assignment during `start` and the round-close steps during `advance` must each be wrapped in a single database transaction.
- **Tests**: every endpoint needs at least a happy-path test and a 4xx error test.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `file:./dev.db` | SQLite file path |
| `JWT_SECRET` | *(required)* | HS256 signing secret — never hardcode |
| `PORT` | `3000` | HTTP listen port |
| `MAX_PARTICIPANTS` | `20` | Maximum members per tanda |
| `LATE_PENALTY_RATE` | `0.05` | Fraction added to late contributions (5%) |
| `ROUND_DURATION_DAYS` | `7` | Days a contribution window stays open before a payment is considered late |

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

