# ADR-001: Modular Feature-Based Architecture for the API

**Date**: 2026-04-10
**Status**: Accepted
**Decided by**: Delivery team

## Context

The workshop requires a REST API that is executable, composable, verifiable, bounded,
and easy to extend under time pressure. The project constraints are explicit:

- route handlers must not contain SQL
- services must enforce business rules
- persistence uses SQLite via `better-sqlite3`
- the codebase must remain modular and must not collapse into a monolith

The highest delivery risk is spreading business logic and data access across routes,
which would make the hidden composability checks fail and would slow down testing.

## Decision

Adopt a modular monolith organized by feature with layered boundaries:

- features are the primary unit of organization: `users`, `tandas`, `contributions`, `rounds`
- each feature owns its routes, service, repository port, repository adapter, schemas, and types
- routes validate and delegate only
- services orchestrate use cases and enforce business rules
- repositories encapsulate all SQL and map rows to application types
- infrastructure owns configuration, database lifecycle, schema initialization, and process bootstrap

The initial base uses Express as the HTTP adapter and SQLite as the persistence adapter.
Dependencies point inward. Business logic depends on repository interfaces, not on concrete
database calls.

## Consequences

- route files stay thin and are safe against direct `db.*` leakage
- feature work can be implemented incrementally without rewriting the composition root
- tests can target services in isolation and the HTTP layer through `supertest`
- SQLite remains replaceable at the adapter boundary if the project grows later
- the application stays a modular monolith, which is enough for workshop scope without
  adding distributed-system overhead

## Tags
UNIVERSAL, API, DATABASE, LIBRARY, FINTECH