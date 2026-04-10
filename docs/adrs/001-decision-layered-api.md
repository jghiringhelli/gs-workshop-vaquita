# Decision: keep HTTP, business rules, and SQL in separate layers

## Context

The workshop scoring explicitly penalizes direct database access in route files and hidden tests check whether business logic leaks into the HTTP layer.

The API also has several state transitions that touch multiple entities at once:
- create tanda + auto-join organizer
- start tanda + lock rotation + create round-one contributions
- advance round + mark pending contributions as missed + maybe complete the tanda

If those rules live directly in Express handlers, they become hard to test and easy to break.

## Decision

Use a strict route/service/repository split:

- **Routes** only parse input and shape HTTP responses
- **Services** enforce domain rules and authorization decisions
- **Repositories** are the only place that talk to SQLite

Multi-step state transitions run inside repository-backed transactions.

## Consequences

### Positive

- Route files stay free of `db.prepare`, `db.get`, `db.run`, and `db.all`
- Business rules can be tested through HTTP without duplicating SQL details in tests
- Tanda lifecycle logic stays centralized instead of being spread across endpoints

### Trade-off

- There is more upfront structure than a single-file Express app
- Some repository methods are broad because the domain is small and centered on one aggregate

That trade-off is acceptable here because the scoring rubric rewards clean boundaries and the state machine is easier to reason about with explicit layers.
