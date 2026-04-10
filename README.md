# 🫰 Tanda API — P031

A production-quality REST API for managing **tandas** (rotating savings groups / vaquitas), built with TypeScript + Express + SQLite.

## What was built

A fully-layered REST API implementing all 10 business rules from the spec:

- **14 endpoints** covering users, tandas, participants, contributions, rounds, and history
- **3-layer architecture**: `routes → services → repositories → db` (zero SQL in route handlers)
- **All business rules enforced**: min 3 participants to start, max 20, randomized rotation on start, 5% late penalty, consecutive-missed defaulter detection, organizer-only actions, auto-complete after last round
- **Custom error hierarchy**: `NotFoundError`, `ValidationError`, `ForbiddenError`, `ConflictError`
- **Zod validation** on all request bodies
- **35 integration tests** with 90%+ line coverage (`:memory:` SQLite for isolation)
- **ADR** documenting the repository pattern decision (`docs/decisions/ADR-001.md`)

## Setup

```bash
npm install
npm run dev     # starts on http://localhost:3000
npm test        # run tests (35 tests, ~90% coverage)
npm run typecheck  # zero TypeScript errors
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/users` | Create a user |
| `GET` | `/api/users` | List users |
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
| `GET` | `/api/tandas/:id/participants/:pid/history` | Contribution history |

## Architecture

```
src/
├── config.ts            # All env-configurable constants
├── db/database.ts       # SQLite connection + schema (4 tables)
├── errors/index.ts      # Custom error hierarchy
├── repositories/        # Data access layer (only layer using db.*)
├── services/            # Business logic (10 rules from spec)
├── routes/              # HTTP handlers (Zod validation → service → response)
└── middleware/          # Error handler
```

---

## How scoring works

Every time you push to your `participant/PXXX` branch, a GitHub Actions workflow runs automatically:

1. Checks out your code
2. Runs `npm run score` — a scoring script that analyses your repo against 7 code quality properties
3. Writes the result to `score.json` on your branch (committed by the bot)
4. Uploads it as a workflow artifact

**You never need to run scoring manually.** Push your code → wait ~60s → check the Actions tab.

The score is re-computed on every push, so the latest push always reflects your current state.

---

## What gets scored (automated, 8 pts)

| Property | Pts | What earns it |
|----------|-----|---------------|
| **Executable** | 3 | API contracts pass hidden live tests (HTTP status codes, response shapes) |
| **Composable** | 3 | Business logic does not leak into route handlers (hidden live test) |
| **Verifiable** | 2 | All tests pass + ≥60% line coverage on new files |
| **Bounded** | 2 | Zero direct `db.*` calls in route files |
| **Auditable** | 2 | ≥50% conventional commits + one decision log entry |
| **Self-describing** | 1 | README describes what you built |
| **Defended** | 1 | Zero TypeScript errors |

Executable and Composable are scored via hidden live tests after the session. The other 8 points are computed automatically on every push and visible in your `score.json`.

---

## Scoring is blind

`score.ts` receives no information about which experimental condition you are in — it analyses whatever code is on your branch. This makes the experiment inherently double-blind by design.

---

## What good looks like

- Business rules enforced (min 3 participants, rotation locked on start, auto-complete after last round)
- No SQL in route handlers — services and repositories are separate layers
- JWT secret comes from an env var, never hardcoded
- Every endpoint has at least one test