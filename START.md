# Workshop — Vaquita Group A (Free Prompting)
**Mode:** No tooling constraints. Use your AI however feels natural.

## Setup

The facilitator will give you your participant number (e.g. **P007**).

```bash
git clone https://github.com/pragma-works/gs-workshop-vaquita
cd gs-workshop-vaquita
git checkout condition-a
git checkout -b participant/P007    # replace P007 with your number
npm install
npm test        # confirm baseline passes before you start
```

Start the server in a dedicated terminal:
```bash
npm run dev     # starts on http://localhost:3000
```

> `npm run dev` does not return to the prompt. Open a second terminal for everything else.

## The Brief

Your stakeholder sent this message:

> *"We need a rotating savings app — tandas. A fixed group of people each put in the same
> amount every round, and one person takes the whole collected pot each round. Everyone
> gets a turn before the cycle repeats. Members need to track who has paid each round."*

More domain detail is in `docs/spec.md`. Build a production-quality REST API — use your AI however you like.

## Scoring (8 pts automated on every push · 6 pts hidden live tests = 14 pts)

| Property | Pts | What earns it |
|----------|-----|---------------|
| **Executable** | 3 | API contracts pass: correct HTTP status codes, response shapes *(hidden)* |
| **Composable** | 3 | HTTP layer translates only — business logic never leaks into routes *(hidden)* |
| **Verifiable** | 2 | All tests pass + ≥60% line coverage on new files |
| **Bounded** | 2 | Zero direct `db.prepare / db.run / db.get / db.all` calls in route files |
| **Auditable** | 2 | ≥50% conventional commits (1pt) + one decision log entry (1pt) |
| **Self-describing** | 1 | README describes what you built |
| **Defended** | 1 | Zero TypeScript errors |
| **Total** | **14** | |

> **Decision log entry:** any `.md` file where you document a design choice you made and why.

## How to Work

- Use your AI however you want — no rules
- **Commit after each meaningful step.** Aim for at least one commit every 15–20 minutes
- Create `OBSERVATIONS.md` and jot notes as you go

## Observations (write in OBSERVATIONS.md)

**Process:**
- [ ] How many prompts to reach a working endpoint?
- [ ] What fraction of your time was prompting vs manually fixing?
- [ ] Did you need to repeat or rephrase any prompt?

**Quality:**
- [ ] Did the AI introduce anti-patterns you didn't ask for?
- [ ] Are there direct `db.*` calls in your new route files?

**Surprises:**
- [ ] What required manual intervention that you expected to be automatic?
- [ ] What surprised you (positively or negatively)?

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
git push origin participant/P007    # replace P007 with your number
```

Let the facilitator know you've pushed — score updates automatically.