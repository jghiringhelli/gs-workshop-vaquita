# 🫰 Tanda API — Workshop

Build a REST API for managing **tandas** (rotating savings groups / vaquitas).

Read [`docs/spec.md`](docs/spec.md) first — it has the full domain, business rules, and API surface.

---

## What I built

A fully functional REST API for managing **tandas** (rotating savings groups), implemented in TypeScript + Express + SQLite.

### Architecture

Layered architecture — no SQL in route handlers:
```
Routes → Services → Repositories → SQLite (better-sqlite3)
```

### Endpoints implemented

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/health` | — |
| POST | `/api/auth/token` | — |
| POST | `/api/users` | — |
| GET | `/api/users` | — |
| GET | `/api/users/:id` | — |
| POST | `/api/tandas` | ✅ |
| GET | `/api/tandas?userId=` | — |
| GET | `/api/tandas/:id` | — |
| POST | `/api/tandas/:id/join` | ✅ |
| GET | `/api/tandas/:id/participants` | — |
| POST | `/api/tandas/:id/start` | ✅ |
| POST | `/api/tandas/:id/cancel` | ✅ |
| POST | `/api/tandas/:id/contributions` | ✅ |
| GET | `/api/tandas/:id/rounds/:round` | — |
| POST | `/api/tandas/:id/advance` | ✅ |
| GET | `/api/tandas/:id/participants/:pid/history` | — |

### Business rules enforced

- Minimum 3 participants to start a tanda
- Organizer is auto-joined on creation
- Rotation order randomised at start (Fisher-Yates)
- Only organizer can start / cancel / advance
- Late contributions incur 5% penalty (configurable via `LATE_PENALTY_PERCENT`)
- Missing contributions auto-recorded as `missed` on advance
- 2 consecutive misses flags participant as defaulter
- Tanda auto-completes after the last round

### Authentication

JWT Bearer token — issued via `POST /api/auth/token`. Secret comes from `JWT_SECRET` env var (never hardcoded).

### Quick start

```bash
npm install
npm run dev        # API on http://localhost:3000
npm test           # 32 integration tests
npm run typecheck  # zero TS errors
```

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