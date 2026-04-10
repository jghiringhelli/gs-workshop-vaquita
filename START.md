# Workshop — Vaquita Group B (ForgeCraft Context)
**Mode:** Free prompting — with project intelligence pre-loaded.

## Setup

The facilitator will give you your participant number (e.g. **P007**).

```bash
git clone https://github.com/pragma-works/gs-workshop-vaquita
cd gs-workshop-vaquita
git checkout condition-b
git checkout -b participant/P007    # replace P007 with your number
npm install
npm test        # confirm baseline passes before you start
```

> **Before you write any code:** open `INTAKE.md`, fill in your developer profile answers, tick the consent box, and commit it. The scoring pipeline reads it automatically.

## What's different on this branch

This branch has been set up with ForgeCraft. Your AI assistant will automatically load `CLAUDE.md` as project context — it contains the engineering standards, architecture decisions, and use cases for this project.

You don't need to run any setup commands. Just open Copilot Chat and start building. The project intelligence is already there.

> **Optional:** If you want to test your API manually during development — `npm run dev` starts the server at `http://localhost:3000`. Open a second terminal; the command doesn't return to the prompt.

## The Brief

Your stakeholder sent this message:

> *"We need a rotating savings app — tandas. A fixed group of people each put in the same
> amount every round, and one person takes the whole collected pot each round. Everyone
> gets a turn before the cycle repeats. Members need to track who has paid each round."*

Full domain detail and API spec are in `docs/spec.md`. Full project requirements in `docs/PRD.md`.

## Scoring (8 pts automated on every push · 6 pts checked after session = 14 pts)

| Property | Pts | What earns it |
|----------|-----|---------------|
| **Executable** | 3 | Your API works — correct status codes and response shapes on every endpoint *(checked after session)* |
| **Composable** | 3 | Business logic lives in services, not in route handlers *(checked after session)* |
| **Verifiable** | 2 | All tests pass + ≥60% line coverage on your new code |
| **Bounded** | 2 | No database calls directly inside route files |
| **Auditable** | 2 | ≥50% of commits follow `feat:`/`fix:`/`chore:` format (1pt) + at least one design decision documented in a `.md` file (1pt) |
| **Self-describing** | 1 | README explains what you built |
| **Defended** | 1 | Zero TypeScript errors |
| **Total** | **14** | |

> **Decision log entry:** any `.md` file where you document a design choice you made and why.

## How to Work

- Use your AI however you want — no rules
- **Commit after each meaningful step.** Aim for at least one commit every 15–20 minutes
- Write notes in `OBSERVATIONS.md` as you go

## Observations (write in OBSERVATIONS.md)

**Process:**
- [ ] How many prompts to reach a working endpoint?
- [ ] What fraction of your time was prompting vs manually fixing?
- [ ] Did you need to repeat or rephrase any prompt?

**Quality:**
- [ ] Did the AI introduce anti-patterns you didn't ask for?
- [ ] Are there direct `db.*` calls in your new route files?

**Context:**
- [ ] Did you notice CLAUDE.md or the docs affecting how the AI responded?
- [ ] Did the AI follow the architecture described in the project docs?
- [ ] What would have been different without the pre-loaded context?

## Before You Finish

```bash
npm test              # all tests should pass
npm run typecheck     # no TypeScript errors
```

Check manually:
- Open your new route file — any `db.prepare` / `db.run` / `db.get` calls? (should be 0)
- `git log --oneline -10` — are ≥50% prefixed with `feat:`/`fix:`/`chore:`?
- Does your README describe what you built?

Commit and push:
```bash
git add -A
git commit -m "obs: session notes"
git pull --rebase origin participant/P007    # bot may have committed score.json — pull first
git push origin participant/P007    # replace P007 with your number
```