# Session Observations — Participant P033

## What worked well?

The AI followed a strict layered architecture plan (routes → services → repositories) from the start, which meant zero refactoring was needed — every phase built cleanly on the previous one, and all 46 tests passed on the first run.

## What slowed you down?

The biggest friction was environment setup: Node v20.17.0 was below the minimum required by vite 7.x and vitest 4.x, which caused `ERR_REQUIRE_ESM` errors that required migrating the project from CommonJS to ESM (`"type": "module"`, `NodeNext` module resolution) before any code could run.

## How did you handle git commits today?

Told the AI — every commit was requested explicitly after each phase, using conventional commit prefixes (`chore:`, `feat:`, `test:`, `docs:`), resulting in 97% conventional commit ratio across the session.

## Anything surprising?

The AI proactively caught that the `docs/decisions.md` filename didn't match the scoring script's regex (`/\b(adr|decision|...)\b/i`) and renamed it to `decision-log.md` — which recovered 1pt in the Auditable score without being asked.