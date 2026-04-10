# Tanda API — Implementation Documentation

This document describes the current implementation delivered across phases.

## Tech Stack

- TypeScript
- Node.js + Express
- SQLite (`better-sqlite3`)
- Zod validation
- Vitest + supertest
- JWT auth (`jsonwebtoken`)

## Architecture

The codebase follows layered architecture:

- **Routes**: request parsing/validation + HTTP response mapping
- **Services**: business logic and rule enforcement
- **Repositories**: direct SQL access

No direct database calls are made in route handlers.

## Configuration

Environment/config values used by the app:

- `PORT`
- `DATABASE_URL`
- `JWT_SECRET`
- `MAX_PARTICIPANTS`
- `LATE_PENALTY_PERCENT`

`JWT_SECRET` is required for token issuance/verification.

## Database Initialization

To create/load initial data in the local database, run:

```bash
npm run seed
```

`npm run seed` is a manual command and does **not** run automatically when starting the API (`npm run dev` or `npm start`).

## Implemented Endpoints

### Health + Auth

- `GET /api/health`
- `POST /api/auth/token`

### Users

- `POST /api/users`
- `GET /api/users`
- `GET /api/users/:id`

### Tandas

- `POST /api/tandas`
- `GET /api/tandas?userId=`
- `GET /api/tandas/:id`
- `POST /api/tandas/:id/join`
- `GET /api/tandas/:id/participants`
- `POST /api/tandas/:id/start`
- `POST /api/tandas/:id/cancel`
- `POST /api/tandas/:id/contributions`
- `GET /api/tandas/:id/rounds/:round`
- `POST /api/tandas/:id/advance`
- `GET /api/tandas/:id/participants/:pid/history`

## Business Rules Enforced

- Organizer is auto-added as first participant when creating a tanda.
- A tanda can only be started with at least 3 participants.
- Max participants per tanda is enforced from `MAX_PARTICIPANTS`.
- Rotation order is randomized at start.
- Only organizer can start/cancel/advance rounds.
- Contributions are accepted only for active tandas and current round.
- Late contributions apply penalty using `LATE_PENALTY_PERCENT`.
- Missing contributions are auto-recorded as `missed` when advancing.
- Participant is flagged as defaulter after 2 consecutive `missed` rounds.
- Tanda auto-completes after the last round.

## Authentication Model (Phase 6)

- Mutating tanda endpoints require `Authorization: Bearer <token>`.
- Token is issued by `POST /api/auth/token` for an existing user id.
- Protected actions also validate actor identity (authenticated user must match body actor fields).

Protected endpoints:

- `POST /api/tandas`
- `POST /api/tandas/:id/join`
- `POST /api/tandas/:id/start`
- `POST /api/tandas/:id/cancel`
- `POST /api/tandas/:id/contributions`
- `POST /api/tandas/:id/advance`

## Example Flow (Authenticated)

```bash
# Create users
curl -s -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"organizer@example.com","name":"Organizer"}'

curl -s -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"member@example.com","name":"Member"}'

# Issue JWT for organizer (id=1)
curl -s -X POST http://localhost:3000/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"userId":1}'

# Create tanda using token
curl -s -X POST http://localhost:3000/api/tandas \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Tanda Enero","organizerId":1,"contributionAmount":1000}'
```

## Validation Status

Latest checks passed:

- `npm run typecheck`
- `npm run lint`
- `npm test`
