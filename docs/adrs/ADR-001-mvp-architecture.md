# ADR-001: MVP API Architecture and Auth Compatibility

**Date**: 2026-04-10
**Status**: Accepted

## Context

The workshop spec requires a layered API with no SQL in route handlers, SQLite persistence,
and JWT-based authentication with the secret coming from environment variables. The endpoint
specification, however, still passes explicit `organizerId`, `userId`, and `participantId`
values in request bodies and query strings.

## Decision

The MVP uses a feature-based layered architecture:

- Express routes validate requests and delegate only to services
- Services enforce tanda business rules
- SQLite repositories own all SQL

For authentication, the API supports bearer JWTs when provided and also accepts the explicit
actor ids described in the workshop spec. If both are present, they must match. New users
receive a JWT token in the create-user response so later requests can migrate to token-based
authorization without changing the endpoint list.

## Alternatives Considered

- Full token-only authorization from day one:
  rejected because it conflicts with the request shapes shown in `docs/spec.md`
- Direct repository calls from route handlers:
  rejected because it violates the workshop scoring rules and ForgeCraft architecture standards
- In-memory persistence:
  rejected because the project brief explicitly calls for SQLite

## Consequences

- The API remains compatible with the workshop acceptance examples
- Authorization checks can move fully to tokens later without replacing the current routes
- Business logic stays concentrated in services, which preserves the Composable and Bounded goals
