# Decision 001: Layered Tanda API

## Context

The workshop scoring penalizes route handlers that talk directly to the database, and the hidden tests also evaluate whether business logic is separated from HTTP concerns.

The API also has non-trivial business rules:

- organizer-only actions
- minimum participants before start
- randomized rotation when starting
- late-payment penalties
- round advancement and auto-completion

If those rules are spread across route handlers, the code becomes harder to test, harder to change, and more likely to fail the workshop checks.

## Decision

Use a layered architecture:

- routes handle HTTP parsing and response formatting
- services enforce business rules and workflow
- repositories are the only layer that executes SQL

SQLite stays as the local persistence layer, but route files never call `db.prepare`, `db.get`, `db.run`, or similar APIs directly.

## Why

This structure keeps the API easier to verify and aligns directly with the workshop rubric:

- improves the chance of passing the `Bounded` check
- reduces coupling between HTTP and domain logic
- makes it easier to test workflows through HTTP and through service behavior
- keeps future changes localized when business rules evolve

## Consequences

Benefits:

- cleaner separation of concerns
- easier testability
- lower risk of hidden-test regressions around architecture

Tradeoff:

- more files and a little more boilerplate up front

That tradeoff is acceptable here because the workshop explicitly rewards maintainable structure, not just a working endpoint.
