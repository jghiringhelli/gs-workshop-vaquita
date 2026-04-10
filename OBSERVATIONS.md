# Session Observations — Participant P030

Fill this in during your last commit (when you get the 15-minute warning).
One sentence per question — no pressure to write more.

## What worked well?

The AI generated the full 3-layer architecture (routes → services → repositories) in one pass, correctly separating business logic from route handlers with zero SQL in route files, and all 25 tests passed after a single small fix to the error handler.

## What slowed you down?

Setup friction took significant time: `better-sqlite3` failed to install on Node v24 due to missing prebuilt binaries and no Python on the machine, requiring installing Python 3.12 via winget and rebuilding the native module before any code could run.

## How did you handle git commits today?

Told the AI — the AI composed and ran all git commands including the conventional commit message.

## Anything surprising?

The AI proactively identified that `ZodError` needed to be handled separately in the Express error handler (returning 400 instead of 500), caught the TypeScript type issue with `req.params` typing, and suggested adding a `GET /api/tandas/:id/stats` dashboard endpoint that wasn't in the original spec — all without being explicitly asked.