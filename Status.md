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
| Auth API | Done | participant/P008 | Bearer token issuance and verification implemented via JWT |
| Tandas Base | Done | participant/P008 | Create, list, get, and participants endpoints implemented |
| Join Tanda | Done | participant/P008 | Join only while forming, duplicate membership prevented, max participants enforced |
| Tanda Lifecycle | Done | participant/P008 | Organizer-only start, advance, and cancel implemented with transactional state changes |
| Contributions | Done | participant/P008 | Contribution recording, participant history, round summary, missed tracking, late settlement, and defaulter flagging implemented |
| Architecture Docs | Done | participant/P008 | ADR-001, Tech Spec, Architecture overview, and diagrams updated |
| Security Baseline | Done | participant/P008 | Zod validation, JWT auth, service-layer authorization, audit logs, and versioned schema migration setup implemented |

## Known Bugs
| ID | Description | Severity | Status |
|----|-------------|----------|--------|
| KB-001 | No confirmed functional bugs at the moment after lint, typecheck, unit tests, and integration tests | Low | Monitoring |

## Technical Debt
| Item | Impact | Effort | Priority |
|------|--------|--------|----------|
| Add stronger credential flow for auth token issuance | Medium | Medium | High |
| Add rate limiting and abuse protection around auth and write endpoints | Medium | Medium | High |
| Evolve versioned startup migrations into explicit reversible migration files | Medium | Medium | Medium |
| Add richer audit retention and tamper-evidence guarantees | Medium | Medium | Medium |
| Implement advanced fintech controls beyond workshop scope | High | High | Medium |

## Current Context
- Working on: Final delivery readiness after closing the major functional gaps.
- Blocked by: Nothing technical at the moment.
- Decisions pending: Whether to push further into production-grade auth and fintech controls or stop at workshop-complete scope.
- Next steps: Start the API with `npm run dev`, get a token from `POST /api/auth/token`, and exercise protected endpoints with `Authorization: Bearer <token>`.

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
| 2026-04-10 | Use JWT middleware for authenticated tanda writes | Removes trust in client-sent organizer or participant ids on protected routes | Accepted |
| 2026-04-10 | Close rounds by marking missing contributions and allow late settlement with penalties | Preserves auditable round history while supporting delayed payment recovery | Accepted |
| 2026-04-10 | Add versioned startup migrations and audit log storage | Makes schema evolution explicit and improves traceability of sensitive actions | Accepted |

## Security Status
- Input validation is enforced with Zod at the route boundary.
- Sensitive write actions require bearer-token authentication.
- `JWT_SECRET` is part of validated environment config and is never hardcoded in production.
- SQL is encapsulated in repositories, reducing injection and layering risks.
- Sensitive actions emit audit logs with actor and resource metadata.
- Remaining security work is now production-hardening, not workshop-blocking functionality.
