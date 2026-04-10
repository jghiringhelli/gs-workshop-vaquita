# 🫰 Tanda API

REST API for managing **tandas / vaquitas** built with **TypeScript**, **Express**, **SQLite**, **Zod**, and **Vitest**.

The API covers user management, workshop-friendly JWT authentication, tanda lifecycle management, round tracking, contribution recording, penalties for late payments, and participant history.

## What I built

### Users and auth

- `POST /api/users` creates a user
- `GET /api/users` lists users
- `GET /api/users/:id` returns a user by ID
- `POST /api/auth/token` issues a JWT for an existing user

### Tandas

- `POST /api/tandas` creates a tanda for the authenticated organizer
- `GET /api/tandas` lists tandas for the authenticated user
- `GET /api/tandas/:id` returns tanda detail
- `POST /api/tandas/:id/join` joins a forming tanda
- `POST /api/tandas/:id/start` starts a tanda
- `POST /api/tandas/:id/cancel` cancels a tanda
- `GET /api/tandas/:id/participants` lists participants

### Rounds and contributions

- `POST /api/tandas/:id/contributions` records the authenticated participant's contribution for the current round
- `GET /api/tandas/:id/rounds/:round` returns a round summary
- `POST /api/tandas/:id/advance` advances the tanda to the next round
- `GET /api/tandas/:id/participants/:pid/history` returns contribution history for a participant

## Business rules implemented

- a tanda needs at least **3 participants** to start
- the maximum number of participants is configurable through environment variables
- the organizer automatically joins when creating the tanda
- only the organizer can start, cancel, or advance a tanda
- the rotation order is randomized when the tanda moves from `forming` to `active`
- contributions can become `paid`, `late`, `pending`, or `missed`
- late contributions apply a configurable penalty percentage
- a participant with **2 consecutive missed contributions** is marked as a defaulter
- the tanda is automatically marked as `completed` after the final round

## Architecture

The project is organized with clear layer separation:

- **routes** handle HTTP translation only
- **services** enforce business rules
- **repositories** contain all SQL access
- **database** initializes SQLite schema and connection

There are no direct `db.prepare`, `db.get`, `db.run`, or `db.all` calls inside route handlers.

## Design decision

I kept authentication lightweight by issuing JWTs from an existing `userId` instead of adding passwords and login flows, because the workshop domain model focused on tanda behavior and not on full account management.

## Setup

```bash
npm install
npm run dev
```

Useful commands:

```bash
npm test
npm run typecheck
npm run lint
```

Default server URL:

```bash
http://localhost:3000
```

## Environment variables

The project uses these environment variables:

```env
NODE_ENV=development
DATABASE_URL="file:./dev.db"
JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRES_IN_HOURS=12
PORT=3000
MAX_PARTICIPANTS=20
LATE_PENALTY_PERCENT=5
CONTRIBUTION_WINDOW_DAYS=7
```

## Reference

The original workshop specification is in [`docs/spec.md`](docs/spec.md).
