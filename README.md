# Tanda API

REST API for managing rotating savings groups (tandas / vaquitas) with an auditable lifecycle, participant roster, round-based contributions, and organizer-controlled state transitions.

The implementation follows a modular feature-based architecture with Express for HTTP, Zod for validation, and SQLite via `better-sqlite3` for persistence. Route handlers stay thin, business rules live in services, and all SQL is isolated in repositories.

## What Is Implemented

Users:

- `POST /api/users`
- `GET /api/users`
- `GET /api/users/:id`

Tandas:

- `POST /api/tandas`
- `GET /api/tandas?userId=`
- `GET /api/tandas/:id`
- `POST /api/tandas/:id/join`
- `POST /api/tandas/:id/start`
- `POST /api/tandas/:id/advance`
- `POST /api/tandas/:id/cancel`
- `GET /api/tandas/:id/participants`
- `POST /api/tandas/:id/contributions`
- `GET /api/tandas/:id/participants/:pid/history`
- `GET /api/tandas/:id/rounds/:round`

## Core Business Rules Enforced

- Organizer auto-joins when a tanda is created.
- A tanda needs at least 3 participants to start.
- Maximum participants comes from validated environment config.
- Rotation is randomized and locked when the tanda starts.
- Only the organizer can start, advance, or cancel.
- Contributions are accepted only for active tandas.
- Contribution amount must match the tanda contribution amount.
- Duplicate contributions in the same round are rejected.
- A tanda auto-completes after the last round is advanced.

## Current Scope Notes

The full endpoint surface from [docs/spec.md](docs/spec.md) is implemented. The advanced penalty and defaulter automation rules described in the spec are intentionally not fully modeled yet; the current implementation focuses on the workshop-critical lifecycle, contribution integrity, test coverage, and architectural separation.

## Run Locally

```bash
npm install
npm run dev
```

The API starts on `http://localhost:3000` by default.

## Validation

```bash
npm run typecheck
npm test
npm run lint
```

## Architecture

- ADR: [docs/adrs/ADR-001-modular-feature-architecture.md](docs/adrs/ADR-001-modular-feature-architecture.md)
- Tech spec: [docs/TechSpec.md](docs/TechSpec.md)
- Diagrams: [docs/diagrams](docs/diagrams)

## Project Structure

```text
src/
	app.ts
	index.ts
	config/
	infrastructure/
		database/
	lib/
	features/
		users/
		tandas/
```

## Workshop Notes

The original workshop brief, scoring context, and participant workflow remain in [START.md](START.md).