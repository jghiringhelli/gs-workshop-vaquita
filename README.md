# 🫰 Tanda API

A production-quality REST API for managing **tandas** (rotating savings groups, also known as *vaquitas*) — an informal financial system common in Mexico and Latin America where N participants contribute a fixed amount every round, and one participant receives the full pot each round.

## What it does

- **User management**: Create users with unique email validation
- **Tanda lifecycle**: Create → Form (gather participants) → Start (randomize rotation) → Active rounds → Auto-complete
- **Contribution tracking**: Record payments per round with 5% late penalty enforcement
- **Business rules enforced**: Min 3 / Max 20 participants, organizer-only actions, 2 consecutive misses = defaulter, auto-completion after last round
- **Transparent ledger**: Round summaries show who paid, who's missing, and who receives the payout

## Tech Stack

- **TypeScript** + **Node.js** (ESM)
- **Express** — HTTP layer
- **SQLite** via `better-sqlite3` — zero-setup persistence (in-memory for tests)
- **Zod** — input validation
- **Vitest** + **supertest** — 46 tests, 88%+ coverage

## Architecture

```
src/
├── config/          # Environment-based configuration (no magic numbers)
├── db/              # SQLite singleton + schema DDL
├── errors/          # Custom error hierarchy (AppError → NotFound, Validation, Forbidden, Conflict)
├── middleware/      # Error handler (maps AppError → HTTP response)
├── repositories/    # Data access layer (ONLY place with db.* calls)
├── services/        # Business logic (all domain rules live here)
├── routes/          # HTTP translation only (parse → service → respond)
├── validators/      # Zod schemas for request validation
└── tests/           # Integration tests per domain (users, tandas, participants, contributions)
```

**Layer separation**: Routes → Services → Repositories. Zero SQL in routes or services.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/users` | Create a user |
| `GET` | `/api/users` | List users |
| `GET` | `/api/users/:id` | Get user by ID |
| `POST` | `/api/tandas` | Create a tanda (creator = organizer, auto-joins) |
| `GET` | `/api/tandas` | List tandas (`?userId=` to filter) |
| `GET` | `/api/tandas/:id` | Get tanda details |
| `POST` | `/api/tandas/:id/join` | Join a tanda |
| `POST` | `/api/tandas/:id/start` | Start (organizer only, ≥3 participants) |
| `POST` | `/api/tandas/:id/cancel` | Cancel (organizer only) |
| `GET` | `/api/tandas/:id/participants` | List participants |
| `POST` | `/api/tandas/:id/contributions` | Record a contribution |
| `GET` | `/api/tandas/:id/rounds/:round` | Round summary with payout recipient |
| `POST` | `/api/tandas/:id/advance` | Advance round (organizer only) |
| `GET` | `/api/tandas/:id/participants/:pid/history` | Contribution history |

## Setup

```bash
npm install
npm run dev     # starts on http://localhost:3000
npm test        # run tests (46 tests, 88%+ coverage)
npm run typecheck  # zero TS errors
```

## Configuration (Environment Variables)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `MAX_PARTICIPANTS` | `20` | Maximum participants per tanda |
| `PENALTY_PCT` | `0.05` | Late contribution penalty (5%) |
| `JWT_SECRET` | — | JWT signing secret (required in production) |
| `DB_PATH` | `tanda.db` | SQLite database file path |