# Tanda API

REST API for managing tandas, also known as vaquitas: rotating savings groups
where participants contribute a fixed amount each round and one participant
receives the pot.

This implementation focuses on a transparent ledger and enforced business
rules. A tanda starts in `forming`, moves to `active` when the organizer starts
it, and finishes as `completed` after the final round. It can also be
`cancelled` by the organizer before completion.

## What Was Built

- User creation, listing, and lookup.
- Tanda creation with the organizer automatically added as the first
  participant.
- Participant join flow while the tanda is still forming.
- Organizer-only start and cancel actions.
- Minimum participant validation before start.
- Randomized rotation order when a tanda starts.
- Contribution recording for the current round, including exact-amount and
  late-fee payments.
- Round summaries with collected totals, required totals, and recipient data.
- Round advancement by the organizer, including automatic completion after the
  last round.
- Participant contribution history.
- Layered route, service, and repository structure so route handlers do not
  contain SQL.

## Tech Stack

- TypeScript and Node.js
- Express
- SQLite with `better-sqlite3`
- Zod validation
- Vitest and supertest

## Setup

```bash
npm install
npm run dev
```

The API starts on `http://localhost:3000` by default.

Useful scripts:

```bash
npm test
npm run typecheck
npm run lint
npm run score
```

## Configuration

Environment variables can override the defaults:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | HTTP server port |
| `DATABASE_URL` | `./tanda.db` | SQLite database path |
| `JWT_SECRET` | development fallback | Required in production |
| `MIN_PARTICIPANTS` | `3` | Minimum participants required to start |
| `MAX_PARTICIPANTS` | `20` | Maximum tanda size |
| `LATE_FEE_PCT` | `5` | Late-payment fee percentage |
| `DEFAULTER_THRESHOLD` | `2` | Missed-contribution threshold |

## API Endpoints

### Health

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Server health check |

### Users

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/users` | Create a user |
| `GET` | `/api/users` | List users |
| `GET` | `/api/users/:id` | Get one user |

Create user body:

```json
{
  "email": "alice@example.com",
  "name": "Alice"
}
```

### Tandas

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/tandas` | Create a tanda |
| `GET` | `/api/tandas?userId=:userId` | List tandas for a user |
| `GET` | `/api/tandas/:id` | Get one tanda |
| `POST` | `/api/tandas/:id/join` | Join a tanda |
| `POST` | `/api/tandas/:id/start` | Start a tanda |
| `GET` | `/api/tandas/:id/participants` | List participants |
| `POST` | `/api/tandas/:id/cancel` | Cancel a tanda |

Create tanda body:

```json
{
  "name": "Tanda Enero",
  "organizerId": "00000000-0000-0000-0000-000000000000",
  "contributionAmount": 1000,
  "totalRounds": 3
}
```

Join body:

```json
{
  "userId": "00000000-0000-0000-0000-000000000000"
}
```

Start or cancel body:

```json
{
  "organizerId": "00000000-0000-0000-0000-000000000000"
}
```

### Contributions And Rounds

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/tandas/:id/contributions` | Record a contribution for the current round |
| `GET` | `/api/tandas/:id/rounds/:round` | Get round summary |
| `POST` | `/api/tandas/:id/advance` | Advance to the next round |
| `GET` | `/api/tandas/:id/participants/:pid/history` | Get participant contribution history |

Record contribution body:

```json
{
  "participantId": "00000000-0000-0000-0000-000000000000",
  "amount": 1000
}
```

Advance body:

```json
{
  "organizerId": "00000000-0000-0000-0000-000000000000"
}
```

## Business Rules

- A tanda needs at least 3 participants before it can start.
- Only the organizer can start, cancel, or advance a tanda.
- Participants can only join while the tanda is `forming`.
- The organizer is automatically enrolled as a participant.
- Rotation is assigned when the tanda starts and then stays locked.
- Contributions must match the configured amount or the amount plus the late
  fee.
- Advancing past the final round marks the tanda as `completed`.

## Architecture

The code is intentionally split by responsibility:

```text
Routes -> Services -> Repositories -> SQLite
```

Routes validate HTTP input and shape responses. Services enforce domain rules.
Repositories own SQL and persistence details. This keeps the API from becoming
a monolith and keeps SQL out of route handlers.

## Example Flow

```bash
curl -s -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","name":"Alice"}'

curl -s -X POST http://localhost:3000/api/tandas \
  -H "Content-Type: application/json" \
  -d '{"name":"Tanda Enero","organizerId":"USER_ID","contributionAmount":1000,"totalRounds":3}'

curl -s "http://localhost:3000/api/tandas?userId=USER_ID"
```
