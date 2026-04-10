# Session Observations — Participant P027

Fill this in during your last commit (when you get the 15-minute warning).
One sentence per question — no pressure to write more.

## What worked well?

The AI quickly identified and resolved environment configuration issues (missing JWT_SECRET, ESM vs CommonJS), and verified compliance with all 4 project requirements without manual review.

## What slowed you down?

Runtime environment setup required several iterations: first the `.env` file was missing, then ESM module resolution failed in production without explicit extensions, requiring a switch from `Bundler` to `CommonJS` in tsconfig.

## How did you handle git commits today?

Told the AI

## Anything surprising?

The AI automatically detected that port 3000 was already in use by the dev server when trying to start production, and resolved it by stopping the previous process before relaunching.