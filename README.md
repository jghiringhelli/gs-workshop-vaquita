# 🫰 Tanda API — Workshop

A REST API for managing **tandas** (rotating savings groups / vaquitas). N participants each contribute a fixed amount every round; one participant receives the full pot each round until everyone has received once.

## What was built

A fully layered TypeScript + Express API backed by SQLite with:

- **14 REST endpoints** covering the full tanda lifecycle (create → join → start → contribute → advance → complete)
- **Hexagonal architecture**: Routes → Services → Repository interfaces → SQLite implementations
- **Business rules enforced**: min 3 / max 20 participants, randomised rotation on start, 5% late contribution penalty, auto-complete after last round, organizer-only actions
- **32 integration tests** using in-memory SQLite — no mocking needed

## Stack

- TypeScript 5 + Node.js 20
- Express 4
- SQLite via `better-sqlite3`
- Zod for request validation
- Vitest + Supertest for testing

## Setup

```bash
npm install
npm run dev     # starts on http://localhost:3000
npm test        # run tests (32 tests, all pass)
npm run test:coverage   # ~90% line coverage
npm run typecheck       # zero TypeScript errors
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/users` | Create a user |
| `GET` | `/api/users` | List all users |
| `GET` | `/api/users/:id` | Get user by ID |
| `POST` | `/api/tandas` | Create a tanda (creator auto-joins as organizer) |
| `GET` | `/api/tandas?userId=` | List tandas for a user |
| `GET` | `/api/tandas/:id` | Get tanda details |
| `POST` | `/api/tandas/:id/join` | Join a tanda |
| `POST` | `/api/tandas/:id/start` | Start tanda (organizer only — FORMING → ACTIVE) |
| `POST` | `/api/tandas/:id/cancel` | Cancel tanda (organizer only) |
| `GET` | `/api/tandas/:id/participants` | List participants |
| `POST` | `/api/tandas/:id/contributions` | Record a contribution for the current round |
| `GET` | `/api/tandas/:id/rounds/:round` | Round summary |
| `POST` | `/api/tandas/:id/advance` | Advance to next round (organizer only) |
| `GET` | `/api/tandas/:id/participants/:pid/history` | Contribution history for a participant |

## Architecture

```
Routes (validation + delegation only)
  └─ Services (all business logic)
       └─ Repository interfaces (contracts)
            └─ SQLite repositories (persistence)
```

See [`docs/adrs/adr-001-layered-architecture.md`](docs/adrs/adr-001-layered-architecture.md) for the architecture decision record.

---

Read [`docs/spec.md`](docs/spec.md) for the full domain model and business rules.
