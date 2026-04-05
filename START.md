# Workshop — Vaquita Group B (ForgeCraft)
**Mode:** ForgeCraft drives. Let it lead.

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

A spec has been started in `docs/spec.md`. ForgeCraft will use it to guide the build.

## Scoring (8 pts automated on every push · 6 pts hidden live tests = 14 pts)

| Property | Pts | What earns it |
|----------|-----|---------------|
| **Executable** | 3 | API contracts pass: correct HTTP status codes, response shapes *(hidden)* |
| **Composable** | 3 | HTTP layer translates only — business logic never leaks into routes *(hidden)* |
| **Verifiable** | 2 | All tests pass + ≥60% line coverage on new files |
| **Bounded** | 2 | Zero direct `db.prepare / db.run / db.get / db.all` calls in route files |
| **Auditable** | 2 | ≥50% conventional commits (1pt) + at least one decision log entry (1pt) |
| **Self-describing** | 1 | README describes what you built |
| **Defended** | 1 | Zero TypeScript errors |
| **Total** | **14** | |

## Step 1 — Add ForgeCraft to your AI assistant

In VS Code with GitHub Copilot, create `.vscode/mcp.json` in this folder:
```json
{
  "servers": {
    "forgecraft": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "forgecraft-mcp@1.4.0"]
    }
  }
}
```

Open Copilot Chat → Agent mode → confirm `forgecraft` appears in tools.

## Step 2 — Run setup

Tell your AI assistant (in Agent mode), replacing the path with wherever you cloned the repo:

```
I have a new project at [path to your cloned repo].
Use the forgecraft MCP tool to run setup_project on it.
Answer any questions it asks you.
```

Follow wherever ForgeCraft leads. Let it drive the whole flow.

## Step 3 — Implement the spec

Once setup completes:

```
Read docs/spec.md carefully. Use ForgeCraft check_cascade
to confirm we are ready to build, then implement the spec.
```

## Step 4 — Bonus (optional)

Once the spec is implemented:

```
Add a pool leaderboard endpoint — show members ranked by total contributions.
```

Watch whether ForgeCraft updates the spec, records a design decision, and drives TDD.

## Observations (write in OBSERVATIONS.md)

**Process:**
- [ ] How many prompts to reach a working endpoint?
- [ ] What fraction of your time was prompting vs manually fixing?
- [ ] Did you need to repeat or rephrase any prompt?

**Quality:**
- [ ] Did the AI introduce anti-patterns you didn't ask for?
- [ ] Are there direct `db.*` calls in your new route files?

**ForgeCraft:**
- [ ] Did ForgeCraft infer the project tags correctly?
- [ ] Did `check_cascade` pass cleanly or were there stubs to fill?
- [ ] Did the bonus feature trigger a decision log entry + spec update?
- [ ] Was the AI instruction file (CLAUDE.md / copilot-instructions) useful or noise?
- [ ] What was confusing?

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