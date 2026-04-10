# 🫰 Tanda API — Workshop

Build a REST API for managing **tandas** (rotating savings groups / vaquitas).

Read [`docs/spec.md`](docs/spec.md) first — it has the full domain, business rules, and API surface.

---

## What was built

A fully-layered REST API for managing rotating savings groups (tandas/vaquitas). The API enforces all business rules at the service layer — minimum 3 participants to start, randomised and locked rotation order, 5% late-payment penalty, automatic round advancement, and auto-completion after the final round.

**Endpoints implemented:**

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/users` | Create a user |
| GET | `/api/users` | List all users |
| GET | `/api/users/:id` | Get user by ID |
| POST | `/api/tandas` | Create a tanda (organizer auto-joined) |
| GET | `/api/tandas?userId=` | List tandas for a user |
| GET | `/api/tandas/:id` | Get tanda details |
| POST | `/api/tandas/:id/join` | Join a forming tanda |
| POST | `/api/tandas/:id/start` | Start tanda (organizer only, ≥3 participants) |
| POST | `/api/tandas/:id/cancel` | Cancel tanda (organizer only) |
| GET | `/api/tandas/:id/participants` | List participants with rotation positions |
| POST | `/api/tandas/:id/contributions` | Record a contribution for the current round |
| GET | `/api/tandas/:id/rounds/:round` | Round summary + pot recipient |
| POST | `/api/tandas/:id/advance` | Advance round, auto-complete on last (organizer only) |
| GET | `/api/tandas/:id/participants/:pid/history` | Contribution history for a participant |

**Architecture:** `Routes → Services → Repositories → SQLite (better-sqlite3)`. No SQL in route handlers. See [ADR-001](docs/adrs/ADR-001-layered-architecture.md) for the design rationale.

---

## Setup

```bash
npm install
npm run dev     # starts on http://localhost:3000
npm test        # run tests
```

---

## Your instructions are in START.md

Open `START.md` — it has your task brief, scoring rubric, and step-by-step instructions for your group.

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