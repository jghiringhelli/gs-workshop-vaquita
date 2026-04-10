# Prompt Log

Record of each prompt card sent, what was changed from the original, and why.

---

## Prompt 1 — Analysis

**Original prompt:** Read docs/spec.md. Describe the domain model, list all API endpoints, list business rules, identify the riskiest parts. Do not write any code.

**Changes made:** None. Sent as-is.

**Analysis output:**

### Domain Model
- **User** — the person participating. Has email and name. Can be organizer or member of multiple tandas.
- **Tanda** — the savings group itself. Belongs to one organizer (User). Tracks how many rounds exist and which round is current. Has a lifecycle status: `forming → active → completed` (or `cancelled`).
- **Participant** — join table between User and Tanda. Stores the role (`organizer`|`member`) and the `rotationPosition` (which round they receive the pot). One user can be a participant in many tandas.
- **Contribution** — a payment record. Belongs to a Participant within a Tanda for a specific round. Tracks amount and status (`pending`|`paid`|`late`|`missed`).

Relationships: User → many Participants → many Tandas. Tanda → many Contributions. Participant → many Contributions.

### API Endpoints
1. `POST /api/users` — create user
2. `GET /api/users` — list users
3. `GET /api/users/:id` — get user
4. `POST /api/auth/login` — login, returns JWT *(added — spec requires JWT auth but has no login endpoint listed)*
5. `POST /api/tandas` — create tanda (organizer auto-joins)
6. `GET /api/tandas?userId=` — list tandas for a user
7. `GET /api/tandas/:id` — tanda detail
8. `POST /api/tandas/:id/join` — join a tanda
9. `POST /api/tandas/:id/start` — organizer starts the tanda (FORMING → ACTIVE)
10. `POST /api/tandas/:id/cancel` — organizer cancels
11. `GET /api/tandas/:id/participants` — list participants
12. `POST /api/tandas/:id/contributions` — record a contribution
13. `GET /api/tandas/:id/rounds/:round` — round summary
14. `POST /api/tandas/:id/advance` — organizer advances to next round
15. `GET /api/tandas/:id/participants/:pid/history` — contribution history

### Business Rules Requiring Code
1. At least 3 participants before `start` is allowed
2. Max 20 participants (configurable via env)
3. Organizer auto-joins as participant when creating the tanda
4. Rotation positions randomized at FORMING → ACTIVE transition
5. 5% late penalty fee on late contributions (configurable)
6. Participant flagged as defaulter after 2 consecutive missed contributions
7. Only the organizer may call `start`, `cancel`, `advance`
8. Tanda auto-completes after the last round is advanced past
9. `advance` is blocked if tanda is not `active`
10. Contributions only accepted on an `active` tanda

### Riskiest Parts
- **Rotation assignment**: if rotation positions are assigned incorrectly or non-uniquely, someone receives the pot twice and another person never receives it — money disappears.
- **Concurrent contributions / advance**: if advance fires while a contribution is being recorded, the round counter could be wrong. Use SQLite transactions.
- **Organizer check**: if the JWT-vs-organizerId check is missing or bypassable, anyone can start/cancel/advance a tanda they don't own.
- **Auto-complete logic**: if the tanda doesn't close after round N, contributions can be accepted indefinitely after everyone has been paid.

---

## Prompt 2 — Project Skeleton

**Original prompt:** Set up TypeScript + Node.js + Express + Prisma, write Prisma schema, SQLite, .env.example.

**Changes made:**
- **Replaced Prisma with `better-sqlite3`** — the spec explicitly requires `better-sqlite3`, not Prisma. Using Prisma would violate the spec.
- **Added `jsonwebtoken` and `dotenv`** — needed for JWT auth and env loading; not in original package.json.
- **Added `config.ts`** — centralises all magic numbers (MAX_PARTICIPANTS, LATE_PENALTY_RATE, DEFAULTER_THRESHOLD) as named constants from env vars, satisfying the spec's non-functional requirement.
- **Schema written as SQL DDL in `db.ts`** rather than a Prisma schema file, since we're using raw SQLite.

**Files:** `src/config.ts`, `src/db.ts`, `package.json`

---

## Prompt 3 — User Auth

**Original prompt:** Implement user registration/login with password hashing and JWT.

**Changes made:**
- **No passwords** — the spec's User model has no `password` field (`id`, `email`, `name` only). Storing passwords would add a field not in the domain model.
- **Login by email only** — `POST /api/auth/login` takes `{email}` and returns a JWT. This matches the spec's JWT requirement without inventing a password scheme.
- **`POST /api/users`** creates a user (no auth required). This matches the acceptance check in the spec.
- **Custom error hierarchy** added here (`errors.ts`) — `AppError`, `NotFoundError`, `ValidationError`, `ConflictError`, `ForbiddenError`, `UnauthorizedError`, `BusinessRuleError`.
- **Repository pattern** introduced — `userRepository` accepts a `db` instance for test injection. Services call repositories; routes call services.

**Files:** `src/errors.ts`, `src/repositories/userRepository.ts`, `src/services/userService.ts`, `src/routes/userRoutes.ts`, `src/routes/authRoutes.ts`, `src/middleware/auth.ts`, `src/middleware/errorHandler.ts`, `src/tests/users.test.ts`

---

## Prompt 4 — Tandas (Pools equivalent)

**Original prompt:** Implement pools and contributions: create pool, pool detail, invite member, contribute, balance, preview.

**Changes made:**
- **Domain renamed**: spec calls them "tandas" not "pools". Contribution model and business rules are different (rotating pot, not a crowdfunded target amount).
- **Implemented tanda lifecycle endpoints**: create, list, get, join, start (FORMING → ACTIVE with randomized rotation), cancel.
- **`GET /api/tandas/:id/participants`** added — lists all participants with their rotation positions.
- **No "funded" auto-status** — tanda lifecycle is driven by rounds, not a target amount.
- **Organizer-only endpoints** (`start`, `cancel`) protected with JWT middleware; checks `jwt.userId === tanda.organizerId`.

**Files:** `src/repositories/tandaRepository.ts`, `src/repositories/participantRepository.ts`, `src/services/tandaService.ts`, `src/routes/tandaRoutes.ts`

---

## Prompt 5 — Contributions, Rounds, and Tests

**Original prompt:** Implement withdrawals and voting (request, list, vote approve/reject, ledger, dissolve).

**Changes made:**
- **No withdrawals or voting** — the spec has no withdrawal/voting model. The spec's equivalent is the **round advance** system: each round one participant receives the pot, controlled by the organizer.
- **Implemented instead**: `POST /api/tandas/:id/contributions` (record payment), `GET /api/tandas/:id/rounds/:round` (round summary with pot recipient), `POST /api/tandas/:id/advance` (organizer advances round; auto-completes on last), `GET /api/tandas/:id/participants/:pid/history` (contribution history).
- **Tests**: 30 tests in `tandas.test.ts` covering all endpoints, happy paths and 4xx cases. All 41 tests pass.
- **`app.ts`** wires everything together via `createApp(db)` factory — full dependency injection, enabling `:memory:` SQLite in tests.

**Files:** `src/repositories/contributionRepository.ts`, `src/services/contributionService.ts`, full `src/routes/tandaRoutes.ts`, `src/app.ts`, `src/index.ts`, `src/tests/tandas.test.ts`
