# Status.md

## Last Updated: 2026-04-10
## Session Summary
Workshop API implemented and documented. The repository now contains a modular feature-based Express + SQLite service for tandas/vaquitas, with users, tanda lifecycle, contributions, history, round summaries, ADRs, architecture docs, diagrams, and automated tests.

## Project Structure
```
src/
	app.ts
	index.ts
	app.test.ts
	config/
	infrastructure/
		database/
	lib/
	features/
		users/
		tandas/
	integration/

docs/
	Architecture.md
	PRD.md
	TechSpec.md
	spec.md
	use-cases.md
	adrs/
	diagrams/
```

## Feature Tracker
| Feature | Status | Branch | Notes |
|---------|--------|--------|-------|
| Users API | Done | participant/P008 | Create, list, and get user endpoints implemented with validation, persistence, and tests |
| Tandas Base | Done | participant/P008 | Create, list, get, and participants endpoints implemented |
| Join Tanda | Done | participant/P008 | Join only while forming, duplicate membership prevented, max participants enforced |
| Tanda Lifecycle | Done | participant/P008 | Organizer-only start, advance, and cancel implemented with transactional state changes |
| Contributions | Done | participant/P008 | Contribution recording, participant history, and round summary endpoints implemented |
| Architecture Docs | Done | participant/P008 | ADR-001, Tech Spec, Architecture overview, and diagrams updated |
| Security Baseline | Partial | participant/P008 | Zod validation, service-layer authorization rules, and env-based secret config exist; JWT auth flow is not yet wired |

## Known Bugs
| ID | Description | Severity | Status |
|----|-------------|----------|--------|
| KB-001 | No confirmed functional bugs at the moment after lint, typecheck, unit tests, and integration tests | Low | Monitoring |

## Technical Debt
| Item | Impact | Effort | Priority |
|------|--------|--------|----------|
| Implement JWT issuance and verification middleware | High | Medium | High |
| Remove request-body organizer identity and derive auth from token claims | High | Medium | High |
| Implement full late, penalty, missed, and defaulter automation from spec | Medium | Medium | High |
| Introduce formal schema migration/versioning strategy | Medium | Medium | Medium |
| Add richer audit/security hardening around authenticated actions | Medium | Medium | Medium |

## Current Context
- Working on: Final delivery readiness and documentation alignment.
- Blocked by: Nothing technical at the moment.
- Decisions pending: Whether to implement JWT auth in-scope or defend it as documented deferred scope.
- Next steps: Start the API with `npm run dev`, exercise endpoints manually or via Postman, and optionally implement JWT as the next increment.

## Validation Snapshot
- Branch: `participant/P008`
- Lint: passing
- Typecheck: passing
- Tests: passing
- Integration coverage: added for full lifecycle and cancellation blocking flows

## Architecture Decision Log
| Date | Decision | Rationale | Status |
|------|----------|-----------|--------|
| 2026-04-10 | Use modular feature-based architecture | Keeps routes thin, business rules centralized, and SQL isolated while staying pragmatic for workshop scope | Accepted |
| 2026-04-10 | Keep SQLite behind repository adapters | Preserves separation of concerns and makes persistence testable and replaceable | Accepted |
| 2026-04-10 | Enforce organizer-only lifecycle rules in services | Centralizes authorization-sensitive business rules until JWT middleware is added | Accepted |
| 2026-04-10 | Defer full JWT auth and advanced penalty automation | Prioritized workshop-critical lifecycle correctness, documentation, and test coverage first | Deferred |

## Security Status
- Input validation is enforced with Zod at the route boundary.
- Sensitive lifecycle actions are authorized in the service layer.
- `JWT_SECRET` is part of validated environment config and is never hardcoded.
- SQL is encapsulated in repositories, reducing injection and layering risks.
- Full JWT authentication and token-based identity propagation are not implemented yet.
- Current organizer-only actions still use `organizerId` in the request body as an interim mechanism.
