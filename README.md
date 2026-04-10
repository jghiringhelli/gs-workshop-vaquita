# 🫰 Tanda API — Workshop

Build a REST API for managing **tandas** (rotating savings groups / vaquitas).

Read [`docs/spec.md`](docs/spec.md) first — it has the full domain, business rules, and API surface.

---

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Copy env and set JWT_SECRET (required — server exits if missing)
cp .env.example .env

# 3. Dev server (auto-restart)
npm run dev      # http://localhost:3000

# 4. Tests (isolated in-memory SQLite)
npm test

# 5. Production build
npm run build && npm start
```

### Environment variables

| Variable                   | Default         | Description                                            |
|----------------------------|-----------------|--------------------------------------------------------|
| `JWT_SECRET`               | *(required)*    | JWT signing secret — never hardcode                    |
| `PORT`                     | `3000`          | HTTP port                                              |
| `DATABASE_URL`             | `file:./dev.db` | SQLite path (`file:./path`)                            |
| `MAX_PARTICIPANTS`         | `20`            | Max participants per tanda                             |
| `MIN_PARTICIPANTS`         | `3`             | Min participants to start                              |
| `CONTRIBUTION_WINDOW_DAYS` | `7`             | Days to contribute without penalty                     |
| `LATE_WINDOW_DAYS`         | `14`            | Days before window closes entirely                     |
| `PENALTY_RATE`             | `0.05`          | Late-payment penalty (5 %)                             |

---

## API reference

### Auth

| Method | Path              | Auth | Description                          |
|--------|-------------------|------|--------------------------------------|
| POST   | `/api/auth/token` | —    | Return JWT if user with email exists  |

### Users (public)

| Method | Path             | Auth | Description    |
|--------|------------------|------|----------------|
| POST   | `/api/users`     | —    | Create a user  |
| GET    | `/api/users`     | —    | List all users |
| GET    | `/api/users/:id` | —    | Get user by id |

### Tandas — `Authorization: Bearer <token>` required

| Method | Path                                        | Description                              |
|--------|---------------------------------------------|------------------------------------------|
| POST   | `/api/tandas`                               | Create tanda (caller = organizer)        |
| GET    | `/api/tandas[?userId=]`                     | List tandas                              |
| GET    | `/api/tandas/:id`                           | Tanda details                            |
| POST   | `/api/tandas/:id/join`                      | Join a forming tanda                     |
| POST   | `/api/tandas/:id/start`                     | Start (organizer) FORMING → ACTIVE       |
| POST   | `/api/tandas/:id/cancel`                    | Cancel (organizer)                       |
| GET    | `/api/tandas/:id/participants`              | List participants                        |
| POST   | `/api/tandas/:id/contributions`             | Record contribution for current round    |
| GET    | `/api/tandas/:id/rounds/:round`             | Round summary                            |
| POST   | `/api/tandas/:id/advance`                   | Advance to next round (organizer)        |
| GET    | `/api/tandas/:id/participants/:pid/history` | Contribution history for a participant   |

### Error shape

```json
{ "error": { "code": "NOT_FOUND", "message": "...", "details": [] } }
```

---

## Business rules

1. Min **3** participants to start (`MIN_PARTICIPANTS`).
2. Max **20** participants (`MAX_PARTICIPANTS`).
3. Organizer auto-joins on creation.
4. Rotation order randomized (Fisher-Yates) on start.
5. Within `CONTRIBUTION_WINDOW_DAYS` → `paid`, full amount.
6. Between window and `LATE_WINDOW_DAYS` → `late`, amount × (1 + `PENALTY_RATE`).
7. After `LATE_WINDOW_DAYS` → 400 error; contribution becomes `missed` on advance.
8. **2+ consecutive missed** → `isDefaulter = true` (sticky).
9. Only organizer can start, advance, or cancel.
10. Advancing past the last round auto-completes the tanda.

---

## curl examples

```bash
BASE=http://localhost:3000

# 1. Create user
curl -s -X POST $BASE/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","name":"Alice"}' | jq

# 2. Get token
TOKEN=$(curl -s -X POST $BASE/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com"}' | jq -r '.token')

# 3. Create tanda
TANDA_ID=$(curl -s -X POST $BASE/api/tandas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Tanda Enero","contributionAmount":500}' | jq -r '.id')

# 4. Add two more members (repeat for bob and carol)
TOKEN_BOB=$(curl -s -X POST $BASE/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"bob@example.com","name":"Bob"}' > /dev/null && \
  curl -s -X POST $BASE/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"email":"bob@example.com"}' | jq -r '.token')

curl -s -X POST $BASE/api/tandas/$TANDA_ID/join \
  -H "Authorization: Bearer $TOKEN_BOB" | jq .role

# 5. Start
curl -s -X POST $BASE/api/tandas/$TANDA_ID/start \
  -H "Authorization: Bearer $TOKEN" | jq '{status,currentRound,totalRounds}'

# 6. Contribute
curl -s -X POST $BASE/api/tandas/$TANDA_ID/contributions \
  -H "Authorization: Bearer $TOKEN" | jq '{status,amount}'

# 7. Round summary
curl -s $BASE/api/tandas/$TANDA_ID/rounds/1 \
  -H "Authorization: Bearer $TOKEN" | jq .totals

# 8. Advance
curl -s -X POST $BASE/api/tandas/$TANDA_ID/advance \
  -H "Authorization: Bearer $TOKEN" | jq '{currentRound,status}'

# 9. Participant history
PART_ID=$(curl -s $BASE/api/tandas/$TANDA_ID/participants \
  -H "Authorization: Bearer $TOKEN" | jq -r '.[0].id')
curl -s $BASE/api/tandas/$TANDA_ID/participants/$PART_ID/history \
  -H "Authorization: Bearer $TOKEN" | jq
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