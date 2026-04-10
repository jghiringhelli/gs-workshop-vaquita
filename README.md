# Tanda / Vaquita API

This project implements a REST API for managing tandas (rotating savings groups / vaquitas) with a transparent contribution ledger and service-driven business rules.

## What is built

- `POST /api/users`, `GET /api/users`, `GET /api/users/:id`
- `POST /api/tandas`, `GET /api/tandas?userId=`, `GET /api/tandas/:id`
- `POST /api/tandas/:id/join`, `POST /api/tandas/:id/start`, `POST /api/tandas/:id/cancel`
- `GET /api/tandas/:id/participants`
- `POST /api/tandas/:id/contributions`
- `GET /api/tandas/:id/rounds/:round`
- `POST /api/tandas/:id/advance`
- `GET /api/tandas/:id/participants/:pid/history`

## Business rules enforced

- organizer auto-joins on tanda creation
- minimum 3 participants before start
- maximum participant count comes from config
- rotation is assigned and locked when the tanda starts
- contributions must match the tanda amount
- late contributions receive a 5% configurable penalty
- missed contributions are recorded on round advance
- 2 consecutive misses flag a participant as a defaulter
- final advance completes the tanda automatically

## Architecture

The API follows a layered flow:

```text
routes -> services -> repository interfaces -> SQLite adapters
```

- route handlers validate input and delegate only
- services enforce business rules and status transitions
- repositories isolate all `better-sqlite3` access
- SQLite schema is created automatically at startup

## Run locally

```bash
npm install
npm run dev
```

The API starts on `http://localhost:3000`.

## Verification commands

```bash
npm test
npm run test:coverage
npm run typecheck
npm run lint
```

## Configuration

These environment variables are supported:

- `PORT`
- `DATABASE_FILE_PATH`
- `MIN_PARTICIPANTS_TO_START`
- `MAX_PARTICIPANTS_PER_TANDA`
- `LATE_PENALTY_PERCENT`
- `CONTRIBUTION_WINDOW_HOURS`

## Notes

- Externally visible HTTP behavior follows `docs/spec.md` and `START.md` where those workshop contracts are more specific than the generic API standards.
- Monetary values are stored and processed as integer minor units to avoid floating-point drift.
