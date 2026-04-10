# ADR-001: Module-per-Feature Structure with Co-located Tests

**Date**: 2026-04-10
**Status**: Accepted
**Decided by**: First implementation session

## Context

The project spec requires strict layer separation (routes → services → repositories → infrastructure) with no SQL in route handlers. We needed to decide how to physically organise source files across those layers.

Options considered:
1. **Layer-first** — `src/routes/`, `src/services/`, `src/repositories/` (flat per layer)
2. **Module-first** — `src/modules/users/`, `src/modules/tandas/` (feature slices, each containing all layers)

## Decision

Use **module-first** layout. Each module owns its own `domain/`, `ports/`, `repository/`, `service/`, and `routes/` subdirectories. Tests live next to the file they test (`.test.ts` sibling).

Shared cross-cutting code (error types, DB setup, middleware, config) lives in `src/shared/`.

## Rationale

- A tanda feature change touches one directory, not four.
- Circular import detection is straightforward: nothing in `modules/users/` may import from `modules/tandas/` and vice versa.
- The `ports/` interface layer is explicit per module — avoids a god-file of repository interfaces.
- Co-located tests reduce context-switching and make coverage gaps obvious at a glance.

## Consequences

- New features get their own directory under `src/modules/`.
- Shared utilities always go in `src/shared/` — never imported across sibling modules.
- `src/app.ts` is the sole composition root: it wires modules together and is the only file that imports across module boundaries.
