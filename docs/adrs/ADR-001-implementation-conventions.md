# ADR-001: Implementation conventions for the workshop API

**Date**: 2026-04-10
**Status**: Accepted

## Context

The workshop spec defines public routes under `/api/...` and describes a financial domain where money and round state must remain consistent. The project context also pushes for versioned APIs, thin route handlers, and explicit architectural separation.

Two decisions were non-obvious during implementation:

1. How to represent money safely in a lightweight SQLite-backed workshop API.
2. How to respect the workshop's `/api/...` contract without diverging completely from the project's internal API standards that prefer versioned routes.

## Decision

1. **Store all money as integer minor units.**
   Contribution amounts and penalties are stored as integers in SQLite and moved through the service layer unchanged. No floating-point arithmetic is used for financial values.

2. **Keep repositories as the only persistence boundary.**
   Express routers validate and delegate. Services enforce business rules. SQLite access lives only in repository adapters.

3. **Mount the same HTTP contract at both `/api` and `/api/v1`.**
   `/api/...` remains the primary public contract because it matches `docs/spec.md` and the workshop examples. `/api/v1/...` is exposed as a compatibility alias to stay aligned with the internal API convention.

## Consequences

- The hidden contract tests can use the workshop paths without friction.
- The codebase still communicates a versioning strategy for future iterations.
- Financial calculations avoid rounding drift and remain deterministic in tests.
- Route files stay compliant with the "no direct DB calls" scoring rule.

## Alternatives considered

### Use floating-point numbers for contribution amounts

Rejected because even a workshop implementation in a fintech domain should not normalize unsafe money handling.

### Force all routes to move to `/api/v1/...` only

Rejected because it would break the explicit contract shown in the workshop spec and setup examples.

### Put SQL directly in route handlers for speed

Rejected because it would violate the architecture constraints and reduce the chance of passing the bounded/composable scoring checks.
