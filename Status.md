# Status.md

## Last Updated: 2026-04-10
## Session Summary
UC-001 (Organizer creates and starts a tanda) fully implemented and tested.

## Project Structure
```
src/
  app.ts                          Express app factory
  index.ts                        Server entry point
  shared/
    config/config.ts              Env-driven config (port, dbPath, maxParticipants, latePenaltyRate)
    db/database.ts                SQLite setup + migrations
    exceptions/AppError.ts        Custom error hierarchy (AppError, NotFoundError, etc.)
    middleware/errorHandler.ts    Centralised error → HTTP response mapping
    middleware/handleZodError.ts  Shared Zod error converter
  modules/
    users/                        User create + lookup
    tandas/                       Tanda create, join, start, list participants
```

## Feature Tracker
| Feature | Status | Branch | Notes |
|---------|--------|--------|-------|
| UC-001: Create & start tanda | ✅ Complete | participant/P054-vaquita-b | 14 tests passing |
| UC-002: Record contribution | ⬚ Not Started | | |
| UC-003: Advance round / auto-complete | ⬚ Not Started | | |

## Known Bugs
| ID | Description | Severity | Status |
|----|-------------|----------|--------|
| | | | |

## Technical Debt
| Item | Impact | Effort | Priority |
|------|--------|--------|----------|
| | | | |

## Current Context
- Working on: UC-002 (contributions) is next
- Blocked by: nothing
- Decisions pending: none
- Next steps: RED test for POST /api/tandas/:id/contributions, then implement ContributionService
