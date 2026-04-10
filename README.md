# 🫰 Tanda API

A REST API for managing **tandas** (also called *vaquitas*) — informal rotating savings groups common in Mexico and Latin America. Each participant contributes a fixed amount every round; one person receives the full pot per round until everyone has had a turn.

## What this API does

- **User management** — create and list users
- **Tanda lifecycle** — create, join, start, cancel, and advance tandas through rounds
- **Rotation** — rotation order is randomly assigned when the tanda starts
- **Contributions** — track payments per round with `paid` / `missed` status
- **Defaulter detection** — participants who miss 2+ consecutive rounds are flagged
- **Auto-completion** — the tanda closes automatically after the last round

## Architecture

Strict 3-layer separation: **Routes → Services → Repositories**. No SQL in route handlers.

```
src/
├── app.ts                          # Express factory
├── config.ts                       # Env vars + named constants
├── db/database.ts                  # SQLite singleton + migrations
├── errors/AppError.ts              # Custom error hierarchy
├── middleware/                     # errorHandler, Zod validate
└── modules/
    ├── users/                      # user.repository / service / router
    ├── tandas/                     # tanda.repository / service / router
    ├── participants/               # participant.repository / service
    └── contributions/              # contribution.repository / service
```

## Setup

```bash
npm install
cp .env.example .env               # set JWT_SECRET before running
npm run dev                        # starts on http://localhost:3000
npm test                           # run 22 tests
npm run typecheck                  # zero TypeScript errors
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
| `POST` | `/api/tandas/:id/start` | Start tanda — FORMING → ACTIVE |
| `POST` | `/api/tandas/:id/cancel` | Cancel tanda |
| `GET` | `/api/tandas/:id/participants` | List participants |
| `POST` | `/api/tandas/:id/contributions` | Record a contribution for current round |
| `GET` | `/api/tandas/:id/rounds/:round` | Round summary |
| `POST` | `/api/tandas/:id/advance` | Advance to next round (organizer only) |
| `GET` | `/api/tandas/:id/participants/:pid/history` | Participant contribution history |

## Business Rules

- Minimum **3** / maximum **20** participants to start
- Only the **organizer** can start, cancel, or advance rounds
- Rotation positions are **randomised** on start
- `totalRounds` = number of participants
- Participants who miss a round get a `missed` contribution auto-created on advance
- **2 consecutive missed** contributions → `isDefaulter = true`
- Tanda **auto-completes** after the last round is advanced

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP port |
| `JWT_SECRET` | *(required)* | Secret for JWT signing |
| `DATABASE_URL` | `file:./dev.db` | SQLite file path |
| `MAX_PARTICIPANTS` | `20` | Max participants per tanda |
| `LATE_PENALTY_PCT` | `0.05` | Late contribution penalty (5%) |

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