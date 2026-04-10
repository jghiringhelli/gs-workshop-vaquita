# Status.md

## Last Updated: 2026-04-10
## Session Summary
UC-001 (Organizer creates and starts a tanda) fully implemented and tested.
UC-002 (Record contribution) and UC-003 (Advance round / auto-complete) service logic also implemented.
48 tests passing. Overall coverage: 81.43%.

## Project Structure
```
src/
  shared/
    config/index.ts         — env-based config constants
    database/index.ts       — SQLite singleton + migrations
    exceptions/index.ts     — AppError hierarchy
    middleware/
      error-handler.ts      — global Express error handler
      validate.ts           — Zod request validation middleware
  modules/
    users/
      user.entity.ts        — User domain type
      user.port.ts          — IUserRepository port interface
      user.repository.ts    — SQLite implementation
      user.service.ts       — UserService (create, findAll, findById)
      user.schema.ts        — Zod schemas for request validation
      user.routes.ts        — Express router /api/users
      __tests__/            — 14 tests (service + routes)
    tandas/
      tanda.entity.ts       — Tanda, Participant, Contribution domain types
      tanda.port.ts         — ITandaRepository, IParticipantRepository, IContributionRepository
      tanda.repository.ts   — SQLite implementation
      participant.repository.ts
      contribution.repository.ts
      tanda.service.ts      — TandaService (all UC-001/002/003 operations)
      tanda.schema.ts       — Zod schemas
      tanda.routes.ts       — Express router /api/tandas (all 10 endpoints)
      __tests__/            — 34 tests (service + routes)
  app.ts                    — Express app factory (dependency wiring)
  index.ts                  — Server entry point
```

## Feature Tracker
| Feature | Status | Branch | Notes |
|---------|--------|--------|-------|
| UC-001: Create & start tanda | ✅ Done | main | All endpoints + business rules |
| UC-002: Record contribution | ✅ Done | main | Service + route implemented |
| UC-003: Advance round / auto-complete | ✅ Done | main | Service + route implemented |

## Known Bugs
| ID | Description | Severity | Status |
|----|-------------|----------|--------|
| — | | | |

## Technical Debt
| Item | Impact | Effort | Priority |
|------|--------|--------|----------|
| contribution.repository.ts coverage 18% | Low | Low | Add UC-002 route integration tests |
| JWT auth middleware not wired | Medium | Medium | Add before production |

## Current Context
- Working on: UC-001 complete, UC-002 and UC-003 service logic done
- Blocked by: nothing
- Decisions pending: JWT auth strategy (header vs middleware)
- Next steps: Add integration tests for contributions, rounds, and advance endpoints; wire JWT auth

## Architecture Decision Log
| Date | Decision | Rationale | Status |
|------|----------|-----------|--------|
| 2026-04-10 | Module-based layered architecture (modules/users, modules/tandas) | Avoids monolith; each module owns entity, port, repo, service, routes | Accepted |
| 2026-04-10 | SQLite in-memory for tests (NODE_ENV=test) | Zero setup, fast, isolated | Accepted |
| 2026-04-10 | resetDb() clears tables (not closes connection) | Allows app instance reuse across tests | Accepted |
