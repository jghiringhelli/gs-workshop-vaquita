# 🫰 Tanda API — Workshop

This is a REST API for managing **tandas** (rotating savings groups / vaquitas), where participants contribute a fixed amount each round, and one participant receives the pot each round in rotation.

## Features Implemented

- **User Management**: Create and retrieve users
- **Tanda Lifecycle**: Create tandas, join as participants, start when ready (min 3 participants), advance rounds, cancel if needed
- **Contributions**: Record payments for each round
- **Round Tracking**: View contributions per round
- **Participant History**: View contribution history for participants

## API Endpoints

- `POST /api/users` - Create user
- `GET /api/users` - List users
- `GET /api/users/:id` - Get user by ID
- `POST /api/tandas` - Create tanda
- `GET /api/tandas?userId=` - List tandas for user
- `GET /api/tandas/:id` - Get tanda details
- `POST /api/tandas/:id/join` - Join tanda
- `POST /api/tandas/:id/start` - Start tanda (organizer only)
- `POST /api/tandas/:id/cancel` - Cancel tanda (organizer only)
- `GET /api/tandas/:id/participants` - List participants
- `POST /api/tandas/:id/contributions` - Record contribution
- `GET /api/tandas/:id/rounds/:round` - Get round summary
- `POST /api/tandas/:id/advance` - Advance to next round (organizer only)
- `GET /api/tandas/:id/participants/:pid/history` - Get participant history

## Business Rules Enforced

- Minimum 3 participants to start a tanda
- Maximum 20 participants (configurable)
- Rotation order randomized at start
- Contributions must be for the current round
- Organizer controls starting, canceling, and advancing rounds
- Tanda auto-completes after last round

## Tech Stack

- Node.js + TypeScript
- Express.js
- SQLite database
- Zod for validation
- Vitest for testing

Read [`docs/spec.md`](docs/spec.md) first — it has the full domain, business rules, and API surface.

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