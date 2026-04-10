# 🫰 Tanda API

A REST API for managing **tandas** (rotating savings groups / *vaquitas*) — a transparent ledger that enforces contribution rules and prevents organisers from disappearing with the pot.

## What was built

- **14 REST endpoints** covering the full tanda lifecycle: create, join, start, contribute, advance rounds, cancel, and history
- **3-layer architecture**: routes → services → repositories (no SQL in handlers)
- **JWT auth** on organiser-only actions (start, cancel, advance)
- **Business rules enforced**: min 3 participants, max 20, randomised rotation on start, 5 % late penalty, defaulter flagging after 2 consecutive misses, auto-complete after last round
- **41 tests** (91 % line coverage) using in-memory SQLite for full isolation
- **Custom error hierarchy**: `AppError`, `NotFoundError`, `ValidationError`, `ConflictError`, `ForbiddenError`, `UnauthorizedError`, `BusinessRuleError`

## Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js + TypeScript |
| Framework | Express |
| Database | SQLite via `better-sqlite3` |
| Validation | Zod |
| Auth | JWT (`jsonwebtoken`) |
| Tests | Vitest + supertest |

## Setup

```bash
cp .env.example .env   # set JWT_SECRET to a long random string
npm install
npm run dev            # http://localhost:3000
npm test               # run all 41 tests
```

## Quick acceptance check

```bash
# Create a user
curl -s -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","name":"Alice"}'

# Create a tanda
curl -s -X POST http://localhost:3000/api/tandas \
  -H "Content-Type: application/json" \
  -d '{"name":"Tanda Enero","organizerId":1,"contributionAmount":1000}'

# List tandas for Alice
curl -s "http://localhost:3000/api/tandas?userId=1"
```

## API surface

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/users` | — | Create user |
| GET | `/api/users` | — | List users |
| GET | `/api/users/:id` | — | Get user |
| POST | `/api/auth/login` | — | Login → JWT |
| POST | `/api/tandas` | — | Create tanda (organiser auto-joins) |
| GET | `/api/tandas` | — | List tandas (`?userId=`) |
| GET | `/api/tandas/:id` | — | Tanda detail |
| POST | `/api/tandas/:id/join` | — | Join tanda |
| POST | `/api/tandas/:id/start` | JWT | Start (FORMING → ACTIVE) |
| POST | `/api/tandas/:id/cancel` | JWT | Cancel |
| GET | `/api/tandas/:id/participants` | — | List participants |
| POST | `/api/tandas/:id/contributions` | — | Record contribution |
| GET | `/api/tandas/:id/rounds/:round` | — | Round summary |
| POST | `/api/tandas/:id/advance` | JWT | Advance round (organiser) |
| GET | `/api/tandas/:id/participants/:pid/history` | — | Contribution history |

## Design decisions

See [`docs/decisions.md`](docs/decisions.md) for key architectural choices and rationale.

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