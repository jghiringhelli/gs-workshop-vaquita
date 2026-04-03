# vaquita-B

## Problem

Informal rotating savings groups (tandas/vaquitas) suffer from accountability issues: the organizer holds collected money with no transparency, participants have no visibility into who has paid, and there is no enforcement of contribution rules. This API provides a transparent ledger with enforced business rules and rotation locked at start.

## Users

- **Organizer**: Creates and manages the tanda, starts and advances rounds.
- **Member**: Joins a tanda, records contributions, tracks their rotation slot.
- **Observer**: Views tanda state and round summaries (no auth needed for reads).

## Success Criteria

- All 14 endpoints from the spec are reachable and return correct HTTP status codes.
- Business rules (min 3 participants, max 20, rotation randomized at start, auto-complete) are enforced.
- JWT authentication gates mutating endpoints correctly.
- Test coverage ≥ 60% with happy-path + 4xx tests for every endpoint.

## Components

- **Users module**: registration, JWT issuance, user lookup.
- **Tandas module**: tanda lifecycle (forming → active → completed/cancelled).
- **Participants module**: join, list, rotation assignment, defaulter tracking.
- **Contributions module**: record, summarize by round, history per participant.
- **Shared**: config, error hierarchy, auth middleware, database layer.

## External Systems

- None — SQLite is embedded; JWT is self-signed with a local secret.
