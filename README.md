# 🫰 Tanda API

A REST API for managing **tandas** (rotating savings groups / vaquitas) — transparent, rule-enforced rotating savings pools where every contribution and rotation is recorded immutably.

## What was built

A complete layered TypeScript API implementing the full tanda lifecycle:

- **Users** — create and look up participants
- **Tandas** — create, join, start, cancel, and advance savings groups
- **Contributions** — record payments per round with late/missed tracking
- **Rounds** — summaries and contribution history per participant

### Architecture

```
Routes (Zod validation) → Services (business rules) → Repositories → SQLite
```

Zero SQL in route handlers. All persistence goes through the repository layer. Dependency injection at the composition root (`src/index.ts`).

### Business rules enforced
1. Minimum 3 participants to start a tanda
2. Maximum 20 participants per tanda
3. Organizer auto-joins on creation
4. Rotation order randomized at FORMING → ACTIVE transition
5. Contributions tracked per round; late contributions incur 5% penalty
6. 2 consecutive missed contributions flags a defaulter
7. Only the organizer can advance rounds or cancel
8. Tanda auto-completes after the last round is advanced

### API surface (14 endpoints)

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/users | Create a user |
| GET | /api/users | List users |
| GET | /api/users/:id | Get user by ID |
| POST | /api/tandas | Create a tanda |
| GET | /api/tandas?userId= | List tandas for a user |
| GET | /api/tandas/:id | Get tanda details |
| POST | /api/tandas/:id/join | Join a tanda |
| POST | /api/tandas/:id/start | Start a tanda (organizer only) |
| POST | /api/tandas/:id/cancel | Cancel a tanda (organizer only) |
| GET | /api/tandas/:id/participants | List participants |
| POST | /api/tandas/:id/contributions | Record a contribution |
| GET | /api/tandas/:id/rounds/:round | Round summary |
| POST | /api/tandas/:id/advance | Advance to next round (organizer only) |
| GET | /api/tandas/:id/participants/:pid/history | Contribution history |

---

## Setup

```bash
npm install
npm run dev     # starts on http://localhost:3000
npm test        # run tests (36 tests, ~92% coverage)
npm run typecheck  # zero TypeScript errors
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