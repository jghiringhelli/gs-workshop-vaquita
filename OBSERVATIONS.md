# Session Observations — Participant P011

## What worked well?

Delegating full feature slices (service + routes + tests in one prompt) to the AI kept each step coherent and consistent with the existing layer pattern.

## What slowed you down?

Context compaction mid-session meant the AI had to re-read several files to recover state before continuing with the tanda implementation.

## How did you handle git commits today?

Told the AI — it composed conventional-commit messages after each meaningful step.

## Anything surprising?

The AI caught and fixed the password-leak bug in the user CRUD endpoints without being explicitly asked, once it ran the acceptance check and saw `"password":null` in the response.