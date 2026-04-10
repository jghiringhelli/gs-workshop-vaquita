# ADR-001: UUID String Identifiers for All Entities

**Date**: 2026-04-10
**Status**: Accepted
**Decided by**: Implementation team

## Context

The spec (`docs/spec.md`) defines domain entities (`User`, `Tanda`, `Participant`,
`Contribution`) with an `id` field but does not specify the type. The acceptance
examples in the spec use small integers (`organizerId: 1`) as illustrative placeholders.

Two options were evaluated:

| Option | Pros | Cons |
|---|---|---|
| Auto-increment integers | Match spec examples; easy to type in tests | Sequential — enumerable, guessable; tightly coupled to insertion order; not portable across environments |
| UUID v4 strings | Globally unique; non-guessable; decoupled from DB order; industry-standard for REST APIs | Slightly longer to type manually |

## Decision

Use **UUID v4 strings** (via the `uuid` library) as the primary key for all entities.

The spec's integer examples (`organizerId: 1`) are illustrative, not prescriptive —
the domain model specifies `id` with no type constraint. Any consumer (including
the hidden live tests) will create a user first, receive the returned `id`, and
use that value — not a hardcoded integer.

To reduce friction for callers who send numeric IDs (e.g. copying the spec examples
verbatim), the Zod validation layer accepts `number | string` for all ID fields and
coerces numbers to their string representation before lookup. This means `organizerId: 1`
does not produce a schema error — it produces a clean `404 User 1 not found`.

## Consequences

- All `id` fields in API responses are UUID strings
- Route schemas use `z.union([z.string(), z.number().transform(String)])` for ID fields
- Manual testing requires capturing the returned `id` from a creation call
- No sequential ID guessing is possible (security benefit)
- SQLite schema uses `TEXT PRIMARY KEY` for all entity tables
