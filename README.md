# 🫰 Tanda API

A REST API for managing **tandas** (rotating savings groups / vaquitas) — transparent, rule-enforced rotating savings pools where every contribution and rotation is recorded immutably.

## What was built

A fully layered Express + TypeScript API backed by SQLite (`better-sqlite3`), implementing the complete tanda lifecycle:

- **Users** — registration and lookup (`POST/GET /api/users`, `GET /api/users/:id`)
- **Tandas** — create, list, get, join, start, cancel, advance rounds (`/api/tandas`)
- **Participants** — list rotation order with assigned positions (`GET /api/tandas/:id/participants`)
- **Contributions** — record payments per round with validation (`POST /api/tandas/:id/contributions`)
- **Rounds** — round summaries with pot recipient and payment status (`GET /api/tandas/:id/rounds/:round`)
- **History** — per-participant contribution history (`GET /api/tandas/:id/participants/:pid/history`)

### Business rules enforced

| Rule | Detail |
|---|---|
| Minimum participants | Tanda needs ≥ 3 to start (400 if fewer) |
| Maximum participants | Hard cap at 20 |
| Organizer role | Creator auto-joins as organizer on tanda creation |
| Locked rotation | Positions randomised on FORMING → ACTIVE; immutable after |
| Contribution validation | Amount must match `contributionAmount`; no duplicates per round |
| Access control | Only organizer can start, cancel, or advance (403 otherwise) |
| Auto-complete | Tanda status → COMPLETED after the last round is advanced |
| Status machine | `FORMING → ACTIVE → COMPLETED` or `FORMING/ACTIVE → CANCELLED` |

### Architecture

```
Routes (Zod validation) → Services (business logic) → Repositories (SQL) → SQLite
```

No SQL in route handlers. Services are injected via constructor DI. Custom error hierarchy (`AppError`, `NotFoundError`, `ForbiddenError`, `ConflictError`, …) maps cleanly to HTTP status codes.

---

## Setup

```bash
npm install
npm run dev     # starts on http://localhost:3000
npm test        # run tests (19 tests, ~86% coverage)
npm run typecheck  # zero TypeScript errors
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