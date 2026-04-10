# Status.md

## Last Updated: 2026-04-10
## Session Summary
Core workshop API implemented with Express + TypeScript + SQLite. Users, tanda lifecycle, contributions, round advancement, defaulter tracking, automated tests, and one extra non-spec feature are in place.

## Project Structure
```
src/
  app.ts
  config/
  infrastructure/database/
  shared/
  features/
    users/
      api/
      application/
      domain/
      infrastructure/
    tandas/
      api/
      application/
      domain/
      infrastructure/
docs/
  adrs/
```

## Feature Tracker
| Feature | Status | Branch | Notes |
|---------|--------|--------|-------|
| Users API | Done | `participant/P004-vaquita-b` | Create, list, and get by ID implemented with validation and tests |
| Tanda lifecycle | Done | `participant/P004-vaquita-b` | Create, join, list, detail, participants, start, cancel, and next-recipient preview implemented |
| Contributions and rounds | Done | `participant/P004-vaquita-b` | Contribution recording, late penalty, round summary, history, advance, defaulters, and auto-complete implemented |
| Documentation and ADR | Done | `participant/P004-vaquita-b` | README updated and implementation ADR added |

## Known Bugs
| ID | Description | Severity | Status |
|----|-------------|----------|--------|
| KB-001 | No auth/login endpoints are implemented because the public workshop spec does not define them, even though the broader context mentions JWT for future work | Low | Accepted by design |

## Technical Debt
| Item | Impact | Effort | Priority |
|------|--------|--------|----------|
| Audit high finding in starter dependency tree | Does not block local execution, but should be reviewed before treating the project as production-ready | Medium | Medium |

## Current Context
- Working on: Completed first full implementation pass of the workshop API and the experiment's extra-feature step
- Blocked by: Nothing in the current repo state
- Decisions pending: Whether to add a public auth surface if the workshop adds explicit login requirements
- Next steps: Push to a participant branch and inspect the refreshed `score.json`

## Architecture Decision Log
| Date | Decision | Rationale | Status |
|------|----------|-----------|--------|
| 2026-04-10 | Use integer money + SQLite repositories behind services; expose both `/api` and `/api/v1` | Preserves financial precision, keeps routes free of SQL, and aligns the workshop contract with the internal API standard | Accepted |
| 2026-04-10 | Add `GET /api/tandas/:id/next-recipient` as the experiment's extra feature | Adds a small read-only capability outside the workshop spec without disturbing the original contract | Accepted |
