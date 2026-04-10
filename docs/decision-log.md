# Decision Log

## 2026-04-10 — Adopt layered architecture + JWT-protected mutations

### Context
The workshop scoring model favors composability and bounded context: business logic should not live in routes, and route handlers should not call the database directly. The API also manages money-related lifecycle rules (join/start/advance/contributions), so clear separation is required.

### Decision
- Keep **routes** as transport-only (validation + HTTP mapping).
- Keep **services** as business-rule orchestration.
- Keep **repositories** as the only SQL access layer.
- Protect all mutating tanda endpoints with JWT bearer authentication.
- Enforce actor identity checks (authenticated user must match request actor fields such as `organizerId`/`userId`).

### Why
- Reduces risk of bypassing rules via HTTP handlers.
- Improves testability by isolating domain behavior in service methods.
- Aligns with rubric goals (`Composable`, `Bounded`, and `Defended`).

### Consequences
- More explicit dependency wiring.
- Better maintainability and easier hidden-test compatibility.
