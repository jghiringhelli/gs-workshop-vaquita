# Decision: Keep workshop HTTP contracts, enforce rules in services

## Status

Accepted

## Context

The repo-level standards ask for versioned APIs, response envelopes, and auth-first routing, but the workshop contract in `docs/spec.md` and `START.md` defines concrete unversioned endpoints like `/api/users` and `/api/tandas` and uses simple request examples without auth tokens. Hidden scoring also checks endpoint status codes and response shapes after the session.

## Decision

The implementation keeps the externally visible workshop contract as the source of truth for paths and response bodies, while still applying the project architecture rules internally:

- route handlers are thin
- services hold business rules and transitions
- repositories isolate all SQLite calls
- money is stored as integer minor units

## Consequences

- The API stays compatible with the workshop acceptance examples and hidden contract checks.
- The codebase still satisfies the bounded/composable expectations because persistence is outside the route layer.
- Auth can be added later as a separate feature once the product contract explicitly defines login, token issuance, and protected-route behavior.
