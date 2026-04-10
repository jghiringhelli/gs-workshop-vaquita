# Session Observations — Participant P016

## What worked well?

The AI scaffolded the full layered architecture (repositories, services, routes, DI wiring) in one pass with zero TypeScript errors and all tests passing.

## What slowed you down?

Verifying the live server via curl was tricky — the server process died when bash sessions ended, requiring workarounds to run smoke tests.

## How did you handle git commits today?

Told the AI — it grouped changes into logical conventional commits per layer (domain, repositories, services, api, tests).

## Anything surprising?

The AI proactively documented an architectural decision (ADR for UUID identifiers) when asked to justify a design choice, and caught that the spec examples used integer IDs while our implementation used UUIDs.