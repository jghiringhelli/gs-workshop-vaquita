# Decision Log

## 2026-04-10 - Keep SQL restricted to repositories

### Context
The API has multiple endpoints and business rules for tanda lifecycle, participants, and contributions. If SQL reaches route handlers, changes in persistence details can leak into HTTP concerns and increase coupling.

### Decision
Keep all direct database operations (`db.prepare`, `db.get`, `db.all`, `db.run`, `db.transaction`) inside repository files only. Route handlers call services, and services call repositories.

### Rationale
- Preserves clean layering: HTTP translation in routes, business rules in services, persistence in repositories.
- Reduces regression risk when changing database queries or schema.
- Improves testability because service-level behavior can be validated without embedding SQL in handlers.
- Aligns with workshop scoring for bounded context and composability.

### Consequences
- New endpoint logic must first be implemented in services/repositories instead of inline in routes.
- Refactors that touch SQL should mostly affect repository files and not route contracts.
