
# 🫰 Tanda API

API for managing **tandas** (rotating savings groups). Allows you to create users, organize tandas, register participants and contributions, and consult the history of each round.

## What is a tanda?
A tanda is a group where several people contribute a fixed amount each round. In each round, one person receives the total. The cycle ends when everyone has received once.


## Main entities
- **User**: id, email, name
- **Tanda**: id, name, organizerId, contributionAmount, status, currentRound, totalRounds
- **Participant**: id, userId, tandaId, role, rotationPosition
- **Contribution**: id, tandaId, participantId, round, amount, status

## Main endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST   | /api/users | Create user |
| GET    | /api/users | List users |
| GET    | /api/users/:id | Get user by ID |
| POST   | /api/tandas | Create tanda (organizer auto-joins) |
| GET    | /api/tandas | List tandas (optional: ?userId=) |
| GET    | /api/tandas/:id | Get tanda details |
| POST   | /api/tandas/:id/join | Join tanda |
| POST   | /api/tandas/:id/start | Start tanda (organizer only) |
| POST   | /api/tandas/:id/cancel | Cancel tanda (organizer only) |
| GET    | /api/tandas/:id/participants | List participants |
| POST   | /api/tandas/:id/contributions | Register contribution |
| GET    | /api/tandas/:id/rounds/:round | Round summary |
| POST   | /api/tandas/:id/advance | Advance round (organizer only) |
| GET    | /api/tandas/:id/participants/:pid/history | Participant contribution history |

## Main usage flow
1. Create users
2. Create tanda (with organizerId of an existing user)
3. Add participants to the tanda
4. Start tanda (minimum 3 participants, organizer only)
5. Register contributions per round
6. Consult round summary and advance
7. Consult contribution history

## Example PowerShell commands
```powershell
# Create user
Invoke-RestMethod -Uri "http://localhost:3000/api/users" -Method Post -Headers @{"Content-Type"="application/json"} -Body '{"email":"alice@example.com","name":"Alice"}'
# Create tanda
Invoke-RestMethod -Uri "http://localhost:3000/api/tandas" -Method Post -Headers @{"Content-Type"="application/json"} -Body '{"name":"Tanda 1","organizerId":1,"contributionAmount":1000}'
# Join tanda
Invoke-RestMethod -Uri "http://localhost:3000/api/tandas/1/join" -Method Post -Headers @{"Content-Type"="application/json"} -Body '{"userId":2}'
# Start tanda
Invoke-RestMethod -Uri "http://localhost:3000/api/tandas/1/start" -Method Post -Headers @{"Content-Type"="application/json"} -Body '{"organizerId":1}'
# Register contribution
Invoke-RestMethod -Uri "http://localhost:3000/api/tandas/1/contributions" -Method Post -Headers @{"Content-Type"="application/json"} -Body '{"participantId":2,"amount":1000}'
```

## Installation and tests
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