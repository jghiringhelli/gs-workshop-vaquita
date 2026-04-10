# Tanda / Vaquita API — PRD

## Problem

Informal rotating savings groups (tandas/vaquitas) have no accountability mechanism. The organiser holds the collected money and there is no transparent ledger. Participants cannot verify who has paid, who receives the pot, or when the cycle ends. This API provides a transparent, rule-enforced rotating savings pool where every contribution and rotation is recorded immutably.

## Users

- **Tanda organizer**: Creates the tanda, sets contribution amount, manages the rotation schedule, advances rounds, can cancel.
- **Tanda member**: Joins a tanda, records contributions each round, tracks their own payment history and upcoming receive date.

## Success Criteria

- All API endpoints return correct HTTP status codes and response shapes per the spec
- Business rules enforced: minimum 3 participants to start, max 20, rotation locked at start, auto-complete after last round
- Route handlers contain no SQL — all persistence goes through a repository layer
- Every endpoint has at least one happy-path test and one 4xx error test
- Line coverage ≥ 60% on all new source files

## Components

- **Users**: registration and lookup (`/api/users`)
- **Tandas**: lifecycle management — create, join, start, cancel, advance (`/api/tandas`)
- **Participants**: rotation assignment, role (organizer/member) (`/api/tandas/:id/participants`)
- **Contributions**: payment recording per round, late/missed tracking (`/api/tandas/:id/contributions`)
- **Rounds**: round summary and history (`/api/tandas/:id/rounds/:round`)

## External Systems

- SQLite via `better-sqlite3` (embedded, no external DB)
- JWT for authentication (secret from environment variable — never hardcoded)
- Zod for request validation at the API boundary
