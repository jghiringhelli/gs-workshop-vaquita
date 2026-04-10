# Tanda API

REST API for managing rotating savings groups (tandas / vaquitas) with an auditable lifecycle, participant roster, round-based contributions, and organizer-controlled state transitions.

The implementation follows a modular feature-based architecture with Express for HTTP, Zod for validation, and SQLite via `better-sqlite3` for persistence. Route handlers stay thin, business rules live in services, and all SQL is isolated in repositories.

## What Is Implemented

Users:

- `POST /api/users`
- `GET /api/users`
- `GET /api/users/:id`

Auth:

- `POST /api/auth/token`

Tandas:

- `POST /api/tandas`
- `GET /api/tandas`
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
- Protected write operations require a valid bearer token.
- Contributions are accepted only for active tandas.
- Contribution amount must match the tanda contribution amount.
- Duplicate contributions in the same round are rejected.
- Missing contributions are marked as `missed` when a round closes.
- Late settlements are allowed for previously missed rounds and incur a configurable penalty.
- Participants with 2 consecutive missed rounds are flagged as defaulters.
- A tanda auto-completes after the last round is advanced.
- Sensitive actions write audit logs.
- Database schema is applied through versioned startup migrations.

## Current Scope Notes

The workshop-critical API surface is implemented, including bearer-token authentication, organizer authorization, late and missed contribution tracking, basic audit logging, and versioned schema setup. Higher-order fintech controls such as MFA, KYC/AML, double-entry bookkeeping, webhook signing, and full compliance-oriented audit retention are still outside the current workshop scope.

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
- Architecture overview: [docs/Architecture.md](docs/Architecture.md)
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