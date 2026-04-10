# Session Observations — Participant P025

## What worked well?

AI-driven full implementation with layered architecture was fast — foundation to routes in under 20 minutes of prompting.

## What slowed you down?

Discovering mid-session that the branch should be based on condition-a (different scoring script and intake requirements).

## How did you handle git commits today?

Mixed — told the AI to handle commits with conventional prefixes.

## Anything surprising?

The AI caught a bounded violation in its own code (direct db.prepare in a service file) and fixed it immediately before it could affect scoring.

---

## Process

- [x] How many prompts to reach a working endpoint? ~3 prompts: one for analysis, one to set up plan, one to implement. First working endpoint in under 10 minutes.
- [x] What fraction of your time was prompting vs manually fixing? ~90% prompting, ~10% reviewing and course-correcting (e.g. switching to condition-a branch).
- [x] Did you need to repeat or rephrase any prompt? No rephrasing needed — but had to add context when discovering the condition-a branch requirements mid-session.

## Quality

- [x] Did the AI introduce anti-patterns you didn't ask for? One: it initially put a direct `db.prepare` call inside a service file (tanda.service.ts) instead of routing through the repository. Caught and fixed before commit.
- [x] Are there direct `db.*` calls in your new route files? No — verified with grep. All DB access goes through the repository layer.

## Surprises

- [x] What required manual intervention that you expected to be automatic? The branch setup — had to manually rebase from master to condition-a and resolve merge conflicts.
- [x] What surprised you (positively or negatively)? Positively: the AI pre-analyzed the scoring script and Hurl test contracts to ensure the implementation matched exactly. Negatively: the decision log filename had to match a specific regex pattern that wasn't obvious.
