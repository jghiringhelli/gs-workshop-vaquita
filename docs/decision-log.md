# Decision Log

## ADR-001 — requesterId in request body instead of JWT middleware

**Date:** 2026-01-01  
**Status:** Accepted  

### Context
Organizer-only endpoints (start, cancel, advance) must verify that the caller is the organizer.
A JWT middleware would be the standard approach for production systems, but this project focuses
on business-rule enforcement and service-layer architecture during the workshop phase.

### Decision
Pass `requesterId` as a plain integer in the JSON request body for organizer-only actions.
The service layer reads `requesterId` and compares it against `tanda.organizerId` (or
`pool.organizerId`), throwing a `ForbiddenError(403)` on mismatch.

### Consequences
- **Good:** Tests are simpler — no token fixtures needed for organizer-action tests.
- **Good:** Service layer is authentication-agnostic; switching to JWT middleware later
  requires only a one-line change per route (read `requesterId` from the token instead of
  the body).
- **Bad:** Not suitable for production without adding JWT middleware.

---

## ADR-002 — Rotation order randomised at `start` time, not at join time

**Date:** 2026-01-01  
**Status:** Accepted  

### Context
The spec states rotation order must be randomised when a tanda starts (forming → active).
An alternative is to randomise as each user joins, but that biases early joiners and exposes
order before the tanda is locked.

### Decision
When `startTanda()` is called, all participants are shuffled with `Array.sort(() => Math.random() - 0.5)`
and assigned `rotationPosition` values 1…N atomically. The recipient for round R is the participant
whose `rotationPosition === R`.

### Consequences
- All participants learn their position simultaneously when the tanda starts.
- The round-summary endpoint reliably identifies the round's recipient via `rotationPosition`.

---

## ADR-003 — Service/repository layer separation (no Prisma in routes)

**Date:** 2026-01-01  
**Status:** Accepted  

### Context
The spec and workshop scoring (`bounded` criterion) requires that route handlers do not
contain direct database calls.

### Decision
Three-layer architecture:
- **Routes** — HTTP in/out, Zod validation, delegate to services.
- **Services** — Business rules, cross-cutting logic, call repositories.
- **Repositories** — All Prisma calls; return typed domain objects.

### Consequences
- Services can be unit-tested by mocking repositories only.
- Routes can be integration-tested by mocking repositories at the layer boundary.
- Swapping the ORM later requires only repository changes.

---

## ADR-004 — bcrypt for password hashing, JWT for sessions

**Date:** 2026-01-01  
**Status:** Accepted  

### Context
User registration/login requires secure password storage and stateless authentication.

### Decision
- Passwords hashed with `bcryptjs` (salt rounds = 10).
- Sessions use signed JWTs (`jsonwebtoken`) with 7-day expiry.
- JWT secret read from `JWT_SECRET` environment variable; server refuses to start if missing
  (except in `NODE_ENV=test`).
- `toSafeUser()` helper strips the `password` field before any user is serialised to JSON.

### Consequences
- Password hashes are never returned in any API response.
- Tokens are stateless — no session store needed.
- Secret rotation requires re-login for all users.
