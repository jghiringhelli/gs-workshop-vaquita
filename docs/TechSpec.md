# Tech Spec: gs-workshop-vaquita-b

## Overview
This service implements a REST API for rotating savings groups (tandas / vaquitas) with an auditable lifecycle, participant roster, round-based contributions, and organizer-controlled state transitions. The implementation is optimized for workshop delivery while preserving modular boundaries: Express handles HTTP, service classes enforce business rules, and SQLite persists all state behind repository adapters.

## Architecture
### System Diagram
Core runtime modules:

- `users` feature: create, list, and fetch users.
- `tandas` feature: create, join, start, advance, cancel, record contributions, list participant history, and aggregate round summaries.
- `config` and `database` infrastructure: validated environment configuration, SQLite connection, schema bootstrap.
- `lib` shared layer: typed application errors and centralized HTTP error translation.

### Tech Stack
- Runtime: typescript
- Framework: Express
- Validation: Zod
- Database: SQLite via `better-sqlite3`
- Testing: Vitest + supertest

### Data Flow
Request flow is `Express route -> Zod validation -> service -> repository -> SQLite`.

- Routes stay thin and only parse/validate input, invoke services, and translate success to HTTP responses.
- Services enforce lifecycle rules such as organizer-only start/advance/cancel, minimum participant threshold, active-only contributions, and duplicate-contribution protection.
- Repositories own all SQL and transaction boundaries, including tanda creation with organizer auto-join and start-time rotation locking.

## API Contracts
Implemented contracts:

- `POST /api/users`
- `GET /api/users`
- `GET /api/users/:id`
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

Current organizer-only actions accept `organizerId` in the request body because JWT auth is not wired yet. This preserves explicit authorization checks in the service layer until token-based identity is introduced.

## Security & Compliance
- JWT secret is already part of validated config, but JWT issuance and verification are not implemented yet.
- All lifecycle-sensitive actions enforce organizer authorization in the service layer.
- Validation failures and domain conflicts are returned as typed application errors, not generic server errors.
- SQL stays fully encapsulated in repositories to reduce injection and layering risk.

## Dependencies
- `express@^4.21.0`
- `better-sqlite3@^11.7.0`
- `zod@^3.24.0`
- `vitest@^3.0.0`
- `supertest@^7.0.0`

## Risks & Mitigations
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| JWT auth not implemented yet | M | M | Keep organizer checks explicit in services and isolate future auth middleware at the route boundary |
| Round closeout is still simplified | M | H | Current implementation focuses on start/advance/cancel correctness first; missed/late contribution automation can be added behind the existing service boundary |
| Randomized rotation is non-deterministic in tests | L | M | Tests assert uniqueness and full position coverage instead of exact order |
| SQLite schema evolution may grow complex | M | M | Keep schema bootstrap centralized and confine SQL changes to repository adapters |
