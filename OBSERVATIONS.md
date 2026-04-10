# Session Observations — Participant P009

Fill this in during your last commit (when you get the 15-minute warning).
One sentence per question — no pressure to write more.

## What worked well?

Delegating the full API scaffold to the AI in a single prompt was very productive — it generated the correct layered architecture (routes → services → repositories) without needing to be corrected on structure.

## What slowed you down?

The initial `npm install` failed due to Node.js version mismatch with `better-sqlite3`, and the AI-generated decision log filename (`DECISIONS.md`) didn't match the scorer's regex pattern, requiring a rename to `DECISION-LOG.md`.

## How did you handle git commits today?

Told the AI — it split the commits by architectural layer using conventional commit format (`feat:`, `docs:`, `fix:`).

## Anything surprising?

The AI correctly implemented business rules (late penalty, defaulter flagging, rotation randomization) without being explicitly reminded mid-session, and hit 8/8 automated score points after minor adjustments to the decision log filename and INTAKE.md consent format.
