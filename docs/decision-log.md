# Execution Plan — Tanda API (14/14 pts)

### Scoring Analysis

| Property | Pts | How it's evaluated | What we need |
|---|---|---|---|
| **Self-describing** | 1 | README.md modified, >300 chars, diff vs template | Rewrite README describing the API |
| **Bounded** | 2 | Zero `db.prepare/exec/run/get/all/transaction` or `new Database(` outside `db/`, `database/`, `repositories/`, `repository/` | All SQLite calls only in `repository/` layer |
| **Verifiable** | 2 | Tests pass (1pt) + coverage ≥60% lines (1pt) | Happy-path + 4xx tests per endpoint, ≥60% coverage |
| **Defended** | 1 | `.github/workflows/` or `.husky/pre-commit` | Create CI workflow or husky pre-commit |
| **Auditable** | 2 | ≥50% conventional commits (1pt) + decision doc named like `adr/decision/design-log/rationale/choices` (1pt) | `feat:/fix:/chore:` commits + create `docs/decisions.md` |
| **Composable** | 3 | Hidden test: routes contain no logic. Services call repos. Clean DI | Clean architecture: routes → services → repositories |
| **Executable** | 3 | Hidden test: correct status codes, response shapes, API contracts | All 15 endpoints with exact contracts |

### Folder Architecture

```
src/
├── index.ts              # Express app setup + listen
├── app.ts                # Express app factory (no listen, for testing)
├── config/
│   └── index.ts          # Constants from env: MAX_PARTICIPANTS, PENALTY_PCT, JWT_SECRET, PORT
├── db/
│   └── database.ts       # better-sqlite3 singleton + schema DDL
├── errors/
│   └── index.ts          # Hierarchy: AppError → NotFoundError, ValidationError, ForbiddenError, ConflictError
├── middleware/
│   ├── auth.ts           # JWT verify middleware
│   └── errorHandler.ts   # Catch-all error → JSON response with correct status
├── repositories/
│   ├── userRepository.ts
│   ├── tandaRepository.ts
│   ├── participantRepository.ts
│   └── contributionRepository.ts
├── services/
│   ├── userService.ts
│   ├── tandaService.ts
│   ├── participantService.ts
│   └── contributionService.ts
├── routes/
│   ├── userRoutes.ts
│   ├── tandaRoutes.ts
│   └── index.ts          # Mount all routes
├── validators/
│   └── schemas.ts        # Zod schemas per endpoint
└── tests/
    ├── users.test.ts
    ├── tandas.test.ts
    ├── participants.test.ts
    └── contributions.test.ts
```

### Implementation Phases (each = 1 conventional commit)

**Phase 1 — Base infrastructure** (`chore: project scaffolding`)
- `config/index.ts`: MAX_PARTICIPANTS (20), PENALTY_PCT (0.05), JWT_SECRET via `process.env.JWT_SECRET`, PORT
- `db/database.ts`: SQLite singleton in-memory for tests, file for prod. Schema DDL: users, tandas, participants, contributions
- `errors/index.ts`: AppError base + NotFoundError(404), ValidationError(400), ForbiddenError(403), ConflictError(409)
- `middleware/errorHandler.ts`: catch-all that maps AppError → { error: message } + status
- `app.ts`: factory that returns Express app without `.listen()` (for supertest)
- `index.ts`: import app + `.listen(PORT)`

**Phase 2 — Repository layer** (`feat: add repository layer`)
- `userRepository.ts`: create, findAll, findById, findByEmail
- `tandaRepository.ts`: create, findAll(userId), findById, updateStatus, updateCurrentRound
- `participantRepository.ts`: create, findByTandaId, findByUserAndTanda, countByTanda, updateRotationPositions
- `contributionRepository.ts`: create, findByTandaAndRound, findByParticipant, findConsecutiveMissed

**Phase 3 — Service layer** (`feat: add service layer with business rules`)
- `userService.ts`: createUser (validate unique email), getUsers, getUserById
- `tandaService.ts`:
  - createTanda: create tanda + auto-join organizer as participant with role `organizer`
  - getTandas(userId), getTandaById
  - startTanda: validate ≥3 participants, status=forming, randomize rotationPosition, status→active, totalRounds=N
  - cancelTanda: validate organizer, status forming/active → cancelled
  - advanceRound: validate organizer, mark missed contributions, check 2 consecutive missed → defaulter, currentRound++, if last → completed
- `participantService.ts`: joinTanda (validate forming, no duplicate, ≤MAX_PARTICIPANTS), getParticipants
- `contributionService.ts`:
  - recordContribution: validate round=currentRound, no duplicate, calculate 5% penalty if late
  - getRoundSummary: round contributions + who's missing
  - getParticipantHistory

**Phase 4 — Zod validators + Routes** (`feat: add routes with Zod validation`)
- `validators/schemas.ts`: schemas for each request body
- `routes/userRoutes.ts`: POST/GET /api/users, GET /api/users/:id → parse only + call service
- `routes/tandaRoutes.ts`: all tanda endpoints → parse only + call service
- `routes/index.ts`: mount routers
- **ZERO business logic, ZERO DB calls in routes**

**Phase 5 — Tests** (`test: add endpoint tests`)
- Per endpoint: happy-path + at least one 4xx case
- Use supertest with app factory (no server startup)
- Cover key business rules: min 3 participants, max 20, rotation randomized, 5% penalty, 2 missed → defaulter, auto-complete
- Target: ≥60% coverage

**Phase 6 — Scoring artifacts** (`chore: add CI and docs`)
- `.github/workflows/ci.yml`: checkout → install → typecheck → test (for **Defended** = 1pt)
- `docs/decisions.md`: document 1 design decision (e.g., "chose SQLite in-memory for tests to avoid fixtures") (for **Auditable** decision log = 1pt)
- Update `README.md` with project description, setup, architecture, endpoints (for **Self-describing** = 1pt)

**Phase 7 — Final validation** (`chore: final validation`)
- `npm run typecheck` → 0 TS errors
- `npm test` → all pass, ≥60% coverage
- Verify: 0 `db.*` calls in routes/
- Verify: ≥50% conventional commits
- `npm run score` → validate score.json

### Critical Business Rules (for Executable 3pts)

1. POST `/api/tandas` → organizer auto-joins, status=`forming`, currentRound=0
2. POST `/api/tandas/:id/start` → 403 if not organizer, 400 if <3 participants, randomize rotation, status→`active`, currentRound=1
3. POST `/api/tandas/:id/join` → 400 if not forming, 409 if already member, 400 if max participants
4. POST `/api/tandas/:id/contributions` → validate current round, amount=contributionAmount, 5% penalty if late
5. POST `/api/tandas/:id/advance` → 403 if not organizer, mark pending→missed, detect 2 consecutive missed, auto-complete if last round
6. GET `/api/tandas/:id/rounds/:round` → contributions + payout recipient (rotationPosition==round)
7. Status transitions: `forming→active→completed`, `forming/active→cancelled`

### Expected HTTP Responses (for Executable)

- 201 for successful creations (POST users, tandas, join, contributions)
- 200 for GETs and actions (start, cancel, advance)
- 400 for failed validations
- 403 for unauthorized actions (not organizer)
- 404 for resources not found
- 409 for conflicts (duplicate email, already a member)
- 200 para GETs y acciones (start, cancel, advance)
- 400 para validaciones fallidas
- 403 para acciones no autorizadas (no organizer)
- 404 para recursos no encontrados
- 409 para conflictos (email duplicado, ya es miembro)
