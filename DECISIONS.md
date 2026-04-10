# Architecture Decision Log

## ADR-001: Layered architecture — repositories, services, routes

**Context:** The spec requires route handlers to never contain SQL queries (Bounded scoring criterion).

**Decision:** Three-layer architecture:
- `repositories/` — all SQL lives here, raw CRUD
- `services/` — business rules, orchestration, validation
- `routes/` — HTTP translation only (parse input → call service → return JSON)

**Consequences:** Routes stay thin and testable via supertest without needing to mock the DB. Business logic is independently testable. Meets the Bounded criterion.

---

## ADR-002: Synchronous SQLite with better-sqlite3

**Context:** The spec lists `better-sqlite3` as the required driver.

**Decision:** Use the synchronous API throughout — no async/await for DB calls. This simplifies transaction handling and error propagation in Express route handlers.

**Consequences:** Transactions are simple callback-based (`db.transaction(fn)()`). No risk of unhandled promise rejections from DB calls.

---

## ADR-003: In-memory SQLite for tests

**Context:** Tests need isolation; each test should start with an empty database.

**Decision:** When `NODE_ENV=test`, `getDb()` opens `:memory:`. Tests call `closeDb()` in `beforeEach` to discard and recreate the DB, giving each test a clean slate without temp files or teardown complexity.

**Consequences:** Fast tests, no test DB cleanup burden, no interference between test runs.

---

## ADR-004: Rotation randomization on FORMING → ACTIVE

**Context:** Business rule 4: rotation order is randomized when tanda transitions FORMING → ACTIVE.

**Decision:** Fisher-Yates shuffle of the participant list, then write `rotationPosition` (1-indexed) to each participant row. `rotationPosition` doubles as the round number in which that participant receives the pot.

**Consequences:** Pot recipient for round N is always `participants.find(p => p.rotationPosition === N)`. Simple and deterministic post-shuffle.
