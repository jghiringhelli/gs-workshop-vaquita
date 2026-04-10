# 🫰 Tanda API

REST API for managing **tandas** (rotating savings groups / vaquitas). A fixed group of people each contribute a fixed amount every round; one person takes the full pot per round until everyone has received once.

## What was built

A full REST API with clean layered architecture:

- **14 endpoints** covering users, tandas, participants, contributions, and round management
- **Layered architecture**: `routes → services → repositories → db` (zero SQL in route handlers)
- **Business rules enforced**: min 3 / max 20 participants, randomized rotation on start, 5% late penalty, defaulter flagging after 2 consecutive missed contributions, auto-complete after last round
- **Input validation** with Zod schemas on all endpoints
- **Custom error classes**: `NotFoundError`, `ValidationError`, `ForbiddenError`, `ConflictError`
- **SQLite** via `better-sqlite3` — no setup needed, DB created automatically
- **16 tests** (users + tandas) with supertest

## Setup

```bash
npm install
npm run dev     # starts on http://localhost:3000
npm test        # run all tests
npm run typecheck  # zero TS errors
```

## API

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/users` | Create a user |
| `GET` | `/api/users` | List users |
| `GET` | `/api/users/:id` | Get user by ID |
| `POST` | `/api/tandas` | Create a tanda (creator auto-joins as organizer) |
| `GET` | `/api/tandas?userId=` | List tandas (optionally filter by user) |
| `GET` | `/api/tandas/:id` | Get tanda details |
| `POST` | `/api/tandas/:id/join` | Join a tanda |
| `POST` | `/api/tandas/:id/start` | Start tanda (organizer only, min 3 participants) |
| `POST` | `/api/tandas/:id/cancel` | Cancel tanda (organizer only) |
| `GET` | `/api/tandas/:id/participants` | List participants |
| `POST` | `/api/tandas/:id/contributions` | Record a contribution |
| `GET` | `/api/tandas/:id/rounds/:round` | Round summary |
| `POST` | `/api/tandas/:id/advance` | Advance to next round (organizer only) |
| `GET` | `/api/tandas/:id/participants/:pid/history` | Participant contribution history |

## Quick test

```bash
# Create a user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","name":"Alice"}'

# Create a tanda
curl -X POST http://localhost:3000/api/tandas \
  -H "Content-Type: application/json" \
  -d '{"name":"Tanda Enero","organizerId":1,"contributionAmount":1000}'
```

---

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