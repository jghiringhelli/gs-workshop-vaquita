# Status.md

## Last Updated: 2026-04-10
## Session Summary
Implemented the MVP API surface for users, tandas, participants, contributions, and round
progression using layered Express services and SQLite repositories.

## Project Structure
```
src/
  app.ts
  config/
  infrastructure/
  modules/
    tandas/
    users/
  shared/
```

## Feature Tracker
| Feature | Status | Branch | Notes |
|---------|--------|--------|-------|
| Users API | ✓ Done | current | Create, list, and fetch user |
| Tandas lifecycle | ✓ Done | current | Create, join, start, cancel, advance |
| Contributions | ✓ Done | current | Record paid/late/missed contributions |
| Participant history | ✓ Done | current | History endpoint implemented |
| Automated tests | ✓ Done | current | 29 Vitest + Supertest endpoint tests passing |

## Known Bugs
| ID | Description | Severity | Status |
|----|-------------|----------|--------|
| BUG-001 | Local WSL runtime currently needs a correct Linux build of `better-sqlite3` in `node_modules` | High | Open |

## Technical Debt
| Item | Impact | Effort | Priority |
|------|--------|--------|----------|
| Fill the generated diagram placeholders with real architecture diagrams | Medium | Medium | Medium |
| Add stronger audit logging for state transitions | Medium | Medium | Medium |

## Current Context
- Working on: MVP API and endpoint test suite are complete
- Blocked by: no product blockers currently identified
- Decisions pending: whether to keep dual auth compatibility or move fully to bearer token flows later
- Next steps: fill diagrams, add audit logging depth, and extend tests to smoke/coverage gates in CI

## Architecture Decision Log
| Date | Decision | Rationale | Status |
|------|----------|-----------|--------|
| 2026-04-10 | Keep routes thin and repositories SQL-only | Required by workshop scoring and ForgeCraft architecture rules | Accepted |
| 2026-04-10 | Support both bearer JWT and explicit actor ids in MVP | Preserves workshop request shapes while adding token auth compatibility | Accepted |
