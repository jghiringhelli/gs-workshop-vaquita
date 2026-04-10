# Session Observations — Participant P043

## What worked well?

Delegating the full implementation to the AI in a single detailed prompt produced a working 14-endpoint API with 41 tests and 91 % coverage in one shot — no iteration needed on the core build.

## What slowed you down?

Splitting the already-written code into 5 sequential prompt-card commits by hand took care; the code was all done but staging the right files per commit required reading through the spec and architecture to group them logically.

## How did you handle git commits today?

Told the AI — it composed all commit messages and ran `git add` + `git commit` for every step.

## Anything surprising?

The scoring script's decision-log regex uses `\bdecision\b` with strict word boundaries, so `decisions.md` (with a trailing `s`) silently failed the check — renaming to `decision.md` was the fix. Small detail, easy to miss without reading the scorer source.

---

## Process (from START.md)

**How many prompts to reach a working endpoint?**
Five prompts following the PROMPT_CARDS structure. The first working endpoint appeared after prompt 3 (user creation + auth). All 14 endpoints were live and tested after prompt 5.

**What fraction of your time was prompting vs manually fixing?**
Roughly 85 % prompting / 15 % manual. The manual work was: reading the scorer source to debug the decision-log miss, splitting files into per-prompt commits, and the `decisions.md` → `decision.md` rename.

**Did you need to repeat or rephrase any prompt?**
No — the general-purpose agent completed the full implementation in a single pass without clarification rounds.

## Quality (from START.md)

**Did the AI introduce anti-patterns you didn't ask for?**
No. Architecture came out clean: routes call services, services call repositories, no SQL leaked upward. Zod validation on all request bodies, custom error classes throughout.

**Are there direct `db.*` calls in route files?**
Zero — confirmed by the scorer (Bounded: 2/2) and a manual grep of the route files.

## Surprises (from START.md)

**What required manual intervention that you expected to be automatic?**
The scorer's regex for the decision log (`\bdecision\b`) required the filename to be exactly `decision.md` — the AI naturally wrote `decisions.md` (plural) which the regex didn't match. Needed a one-line rename after reading the scorer source.

**What surprised you (positively or negatively)?**
Positively: 91 % line coverage from tests written entirely by the AI, with in-memory SQLite isolation per test — zero flakiness, zero shared state. The DI-via-factory-functions pattern the AI chose made this trivially achievable.