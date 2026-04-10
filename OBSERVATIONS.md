# Session Observations — Participant PXXX

## What worked well?

Delegating the full implementation to an AI agent worked smoothly — the layered architecture (routes → services → repositories) was produced correctly on the first attempt, with zero SQL leaking into route handlers.

## What slowed you down?

The PowerShell environment was unavailable (pwsh.exe not installed), which required routing all shell commands through a task agent instead of running them directly.

## How did you handle git commits today?

Told the AI to create and commit all changes with conventional commit prefixes (`feat:`, `chore:`).

## Anything surprising?

The AI correctly enforced all 10 business rules without explicit prompting for each one — including auto-completion after the last round, consecutive-miss defaulter detection, and Fisher-Yates shuffle for rotation assignment.

---

## Design Decision Log

### 1. Separation of `app.ts` from `index.ts`

**Decision:** Export the Express app from `src/app.ts`; keep `src/index.ts` as a thin `app.listen()` wrapper.

**Why:** Vitest/supertest tests need to import the app without triggering `listen()`. Separating them allows test files to `import { createApp }` and get a fresh instance, while the production entry point stays clean.

### 2. SQLite `:memory:` in tests via `NODE_ENV`

**Decision:** `config.dbPath` returns `':memory:'` when `NODE_ENV === 'test'`.

**Why:** No file cleanup needed between test runs; each `resetDb()` call drops and recreates all tables in memory, giving full isolation without touching the filesystem.

### 3. UUIDs as primary keys

**Decision:** All entities use `uuid v4` strings as primary keys instead of auto-increment integers.

**Why:** UUIDs are safe to expose in URLs, avoid enumeration attacks, and don't require a database round-trip to know the ID before insertion.

### 4. Advance creates `missed` contributions atomically

**Decision:** When `POST /tandas/:id/advance` is called, the service creates a `missed` contribution record for every participant who has not yet paid in the current round, before incrementing the round counter.

**Why:** Guarantees a complete ledger — every round has a contribution record for every participant, simplifying history queries and defaulter detection.

### 5. Defaulter threshold as a named config constant

**Decision:** `config.tanda.maxConsecutiveMissed = 2` instead of a magic number.

**Why:** Keeps the rule visible and configurable without touching service logic, consistent with how `maxParticipants` and `latePenaltyPct` are handled.