# Architecture & Design Decisions

## Slice 4 — Start / Cancel Tanda

### 1. Transaction ownership: repository, not service

**Decision:** `TandaRepository.startTanda()` owns the SQLite transaction.  
**Alternatives considered:** service-level transaction (pass `db` to service), Unit-of-Work pattern.  
**Rationale:**
- The service's job is to express business rules (verify organizer, count participants, shuffle positions). It should not know about database infrastructure.
- A single atomic method on the repository is a clean, auditable boundary: either the tanda transitions to `active` _and_ all participant positions are written, or nothing changes. There is no intermediate state observable by any other reader.
- Prepared statements are created **outside** the `db.transaction()` callback. better-sqlite3 transactions are synchronous; re-preparing inside the callback per row would be wasteful.

---

### 2. Rotation shuffle: Fisher-Yates

**Decision:** `shuffleArray<T>` in `tanda.utils.ts` implements the Fisher-Yates (Knuth) shuffle.  
**Alternatives considered:** `arr.sort(() => Math.random() - 0.5)`.  
**Rationale:**
- `sort`-based shuffle is **biased** — the comparison function is called a non-deterministic number of times and the resulting distribution is not uniform. For a rotating savings group, non-uniform rotation is a fairness bug.
- Fisher-Yates is O(n), uniform, and well-understood. The non-mutating implementation (copy first) prevents accidental mutation of the original participants array.
- With `noUncheckedIndexedAccess` enabled, index accesses use `!` assertions inside the loop where bounds are provably safe (0 ≤ i < result.length).

---

### 3. `requesterId` in request body (no auth yet)

**Decision:** Both `POST /start` and `POST /cancel` require `requesterId: UUID` in the JSON body. The service compares it against `tanda.organizerId`.  
**Rationale:**
- There is no authentication layer yet. Putting `requesterId` in the body is an explicit, testable placeholder that keeps the organizer-guard logic intact.
- **Migration path:** when JWT auth is added, `requesterId` will be read from `req.user.id` (set by auth middleware) and the body field will be removed. The service guard (`requesterId !== tanda.organizerId → ForbiddenError`) does not change.

---

### 4. `minParticipantsToStart` as an injected config constant

**Decision:** `TandaService` accepts `TandaServiceConfig { minParticipantsToStart }`. The default is read from `config.MIN_PARTICIPANTS_TO_START` (env var, defaults to 3).  
**Rationale:**
- Hardcoding `3` inside the service makes it untestable without env hacks. Injecting it lets tests pass `minParticipantsToStart: 4` to verify the "too few participants" guard without touching the environment.
- The spec says "at least 3" but keeps the door open for a configurable minimum in a multi-tenant scenario.

---

### 5. Duplicate-join detection before INSERT

**Decision:** `ParticipantService.joinTanda()` calls `findByTandaAndUser()` _before_ attempting the INSERT. If a row exists, it throws `ConflictError`.  
**Rationale:**
- A raw `UNIQUE constraint failed` error from SQLite would bubble up as an unhandled 500. Checking first gives callers a clean `409 CONFLICT` with a human-readable message.
- The race-condition window (check-then-insert) is acceptable in this single-writer SQLite deployment. If the app ever moves to a multi-writer DB, the UNIQUE constraint remains as a safety net and only the error mapping would need to change.
