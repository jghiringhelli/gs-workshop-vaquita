# Session Observations — Participant P026

Fill this in during your last commit (when you get the 15-minute warning).
One sentence per question — no pressure to write more.

## What worked well?

The AI scaffolded the full layered architecture (repositories, services, routes) very quickly, and the test-first approach with in-memory SQLite made iteration smooth.

## What slowed you down?

Environment issues early on — the `ERR_REQUIRE_ESM` error with vitest and the `JWT_SECRET` missing at startup — required several back-and-forth debugging rounds before the root causes were found.

## How did you handle git commits today?

Told the AI.

## Anything surprising?

The AI proactively suggested and implemented missed-contribution tracking and the `isDefaulter` flag without being asked for the full design — it derived the field at query time rather than storing it, which was a smart tradeoff.