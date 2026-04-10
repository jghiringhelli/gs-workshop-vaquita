# Architecture Decision Log

## ADR-001: Layered Architecture (routes → services → repositories)

**Decision:** Separate the codebase into three strict layers: routes, services, and repositories.

**Context:** The spec required zero SQL in route handlers and clean separation between HTTP concerns and business logic.

**Choice:** 
- **Routes** only parse HTTP input and call services — no business logic, no SQL.
- **Services** contain all business rules (min/max participants, rotation, defaulter detection, penalty calculation).
- **Repositories** are the only layer allowed to call `db.*` — pure data access, no logic.

**Why not a single service file?** Splitting by domain (userService, tandaService, contributionService) keeps each file focused and easier to test independently.

---

## ADR-002: SQLite with better-sqlite3 (synchronous API)

**Decision:** Use `better-sqlite3` synchronous API instead of an async ORM.

**Context:** The project is a workshop prototype. Setting up an async ORM (like Drizzle or Prisma) adds boilerplate without adding value at this scale.

**Choice:** `better-sqlite3` runs synchronously, which simplifies code flow (no async/await chains in repositories), is fast for single-process use, and requires zero database setup — the file is created automatically on first run.

---

## ADR-003: Custom error classes over HTTP status codes in services

**Decision:** Services throw typed errors (`NotFoundError`, `ForbiddenError`, etc.) and the `errorHandler` middleware maps them to HTTP responses.

**Why:** This keeps services completely decoupled from HTTP — they only throw domain errors. The route layer never needs to decide what status code to return.
